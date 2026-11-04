// QuickBooks Online, ported from the estimator app and cut down to time: a
// manager connects the business's QuickBooks, then each finished punch goes
// across as a timesheet entry (TimeActivity) under a matching employee, so
// QuickBooks Payroll can pay from it. Only punches that start on or after the
// connection's sync_from date go across. Edited punches are sent again and
// deleted ones are deleted there too.
//
// POST (signed-in manager), called from the staff app's server actions:
//   { action: 'status' }                   -> { configured, connected, sandbox, company, sync_from, last_sync_at, last_error, pending }
//   { action: 'connect', return_to }       -> { url } to Intuit's sign-in; Intuit comes back to return_to + /admin?qbo=...
//   { action: 'sync_from', date }          -> saves the start date
//   { action: 'sync' }                     -> pushes a batch; { done, pushed, errors }; call again until done
//   { action: 'disconnect' }
// GET ?code&state&realmId: Intuit sends the manager back here after they approve.
//
// Secrets: QBO_CLIENT_ID, QBO_CLIENT_SECRET, QBO_ENV ('sandbox' or 'production').
// In the Intuit app, the redirect URI is <SUPABASE_URL>/functions/v1/quickbooks.
// Deploy with JWT verification off (Intuit's GET has no sign-in); the POST
// checks the caller itself.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const CLIENT_ID = Deno.env.get('QBO_CLIENT_ID') || '';
const CLIENT_SECRET = Deno.env.get('QBO_CLIENT_SECRET') || '';
const SANDBOX = (Deno.env.get('QBO_ENV') || 'sandbox') !== 'production';
const API = SANDBOX ? 'https://sandbox-quickbooks.api.intuit.com' : 'https://quickbooks.api.intuit.com';
const REDIRECT = `${Deno.env.get('SUPABASE_URL')}/functions/v1/quickbooks`;
const TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
const REVOKE_URL = 'https://developer.api.intuit.com/v2/oauth2/tokens/revoke';
const configured = () => !!(CLIENT_ID && CLIENT_SECRET);
const BATCH = 20; // records per sync call, to stay well inside the function's time limit

const admin = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

type Conn = Record<string, any>;
type Db = ReturnType<typeof admin>;

/* tokens */
async function tokenRequest(body: Record<string, string>) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { Authorization: `Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`, Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error === 'invalid_grant' ? 'qbo_reconnect' : `qbo_token_${res.status}`);
  return data;
}
const tokenFields = (t: any) => ({
  access_token: t.access_token, refresh_token: t.refresh_token,
  access_expires_at: new Date(Date.now() + (t.expires_in - 60) * 1000).toISOString(),
  refresh_expires_at: new Date(Date.now() + t.x_refresh_token_expires_in * 1000).toISOString(),
});

async function freshToken(db: Db, conn: Conn) {
  if (conn.access_token && new Date(conn.access_expires_at) > new Date()) return conn.access_token;
  const t = await tokenRequest({ grant_type: 'refresh_token', refresh_token: conn.refresh_token });
  const f = tokenFields(t);
  await db.from('qbo_connection').update(f).eq('id', true);
  Object.assign(conn, f);
  return conn.access_token;
}

/* the QuickBooks API */
function qbo(db: Db, conn: Conn) {
  const call = async (method: string, path: string, body?: unknown) => {
    const token = await freshToken(db, conn);
    const sep = path.includes('?') ? '&' : '?';
    const res = await fetch(`${API}/v3/company/${conn.realm_id}/${path}${sep}minorversion=75`, {
      method, headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = data?.Fault?.Error?.[0];
      throw new Error(err ? `${err.Message}${err.Detail ? `: ${err.Detail}` : ''}` : `QuickBooks error ${res.status}`);
    }
    return data;
  };
  const q = (s: string) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  return {
    call,
    query: async (sql: string) => (await call('GET', `query?query=${encodeURIComponent(sql)}`)).QueryResponse || {},
    q,
  };
}
type Api = ReturnType<typeof qbo>;

/* dates and times in the business's time zone */
const localDate = (iso: string, tz: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: tz });
const localTime = (iso: string, tz: string) => new Date(iso).toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' });
const minutes = (p: any) => Math.round((new Date(p.clock_out).getTime() - new Date(p.clock_in).getTime()) / 60000);

/* employees: matched to an existing QuickBooks employee by name, else created */
async function employeeId(api: Api, db: Db, w: any) {
  if (w.qbo_employee_id) return w.qbo_employee_id;
  const name = (w.full_name || w.phone || 'Unnamed employee').replace(/:/g, '-').slice(0, 100);
  let id = (await api.query(`select * from Employee where DisplayName = ${api.q(name)}`)).Employee?.[0]?.Id;
  if (!id) {
    const [given, ...rest] = name.split(' ');
    id = (await api.call('POST', 'employee', {
      GivenName: given.slice(0, 100), FamilyName: rest.join(' ').slice(0, 100) || undefined, DisplayName: name,
      PrimaryPhone: w.phone ? { FreeFormNumber: w.phone } : undefined,
    })).Employee.Id;
  }
  await db.from('profiles').update({ qbo_employee_id: id }).eq('id', w.id);
  w.qbo_employee_id = id;
  return id;
}

/* punches: one QuickBooks timesheet entry each, dated the day the shift started */
async function pushPunch(api: Api, db: Db, p: any, worker: any, tz: string) {
  const total = minutes(p);
  const body: any = {
    NameOf: 'Employee', EmployeeRef: { value: await employeeId(api, db, worker) }, TxnDate: localDate(p.clock_in, tz),
    Hours: Math.floor(total / 60), Minutes: total % 60,
    Description: [`${localTime(p.clock_in, tz)} – ${localTime(p.clock_out, tz)}`, p.note].filter(Boolean).join(' · ').slice(0, 4000),
    BillableStatus: 'NotBillable',
  };
  let id = p.qbo_id;
  if (id) {
    const cur = (await api.call('GET', `timeactivity/${id}`)).TimeActivity;
    await api.call('POST', 'timeactivity', { ...body, Id: id, SyncToken: cur.SyncToken });
  } else {
    id = (await api.call('POST', 'timeactivity', body)).TimeActivity.Id;
  }
  await db.from('punches').update({ qbo_id: id, qbo_synced_at: new Date().toISOString(), qbo_error: '' }).eq('id', p.id);
}

async function deleteActivity(api: Api, db: Db, qboId: string) {
  try {
    const cur = (await api.call('GET', `timeactivity/${qboId}`)).TimeActivity;
    await api.call('POST', 'timeactivity?operation=delete', { Id: qboId, SyncToken: cur.SyncToken });
  } catch (e) {
    // Already gone from QuickBooks (deleted there by hand) is fine.
    if (!/not found|deleted|Object Not Found/i.test((e as Error).message)) throw e;
  }
  await db.from('qbo_deleted').delete().eq('qbo_id', qboId);
}

// Never sent, or changed since it was sent (and not already failing on that version).
const needsSync = (r: any) => !r.qbo_synced_at || new Date(r.updated_at) > new Date(r.qbo_synced_at);

async function pending(db: Db, conn: Conn, tz: string) {
  // A day early so shifts that start late in the evening west of UTC aren't missed; filtered by local date below.
  const from = new Date(new Date(`${conn.sync_from}T00:00:00Z`).getTime() - 86400000).toISOString();
  const [{ data: rows }, { data: gone }] = await Promise.all([
    db.from('punches').select('*').not('clock_out', 'is', null).gte('clock_in', from).order('clock_in'),
    db.from('qbo_deleted').select('qbo_id'),
  ]);
  const punches = (rows || []).filter(p => localDate(p.clock_in, tz) >= conn.sync_from && needsSync(p) && (p.qbo_id || minutes(p) > 0));
  return { punches, deleted: (gone || []).map(g => g.qbo_id as string) };
}

async function sync(db: Db, conn: Conn, tz: string) {
  const api = qbo(db, conn);
  const { punches, deleted } = await pending(db, conn, tz);
  const pushed = { time: 0, deleted: 0 };
  const errors: string[] = [];
  let budget = BATCH;

  for (const id of deleted) {
    if (budget-- <= 0) break;
    try {
      await deleteActivity(api, db, id);
      pushed.deleted++;
    } catch (e) {
      const msg = (e as Error).message;
      if (msg === 'qbo_reconnect') throw e;
      errors.push(`Deleting QuickBooks timesheet ${id}: ${msg}`);
    }
  }
  if (budget > 0 && punches.length) {
    const ids = [...new Set(punches.map(p => p.user_id))];
    const { data: ws } = await db.from('profiles').select('id, full_name, phone, qbo_employee_id').in('id', ids);
    const workers = new Map((ws || []).map(w => [w.id, w]));
    for (const p of punches) {
      if (budget-- <= 0) break;
      const worker = workers.get(p.user_id);
      try {
        await pushPunch(api, db, p, worker, tz);
        pushed.time++;
      } catch (e) {
        const msg = (e as Error).message;
        if (msg === 'qbo_reconnect') throw e;
        errors.push(`${localDate(p.clock_in, tz)} (${worker?.full_name || worker?.phone || 'staff'}): ${msg}`);
        // Marked as tried so the next sync moves on; editing the punch tries it again.
        await db.from('punches').update({ qbo_error: msg.slice(0, 500), qbo_synced_at: new Date().toISOString() }).eq('id', p.id);
      }
    }
  }
  const left = await pending(db, conn, tz);
  const done = budget > 0 || (!left.punches.length && !left.deleted.length);
  await db.from('qbo_connection').update({ last_sync_at: new Date().toISOString(), last_error: errors.slice(0, 5).join('\n') }).eq('id', true);
  return { done, pushed, errors };
}

/* coming back from Intuit */
async function callback(url: URL) {
  const db = admin();
  const state = url.searchParams.get('state') || '';
  const { data: conn } = state ? await db.from('qbo_connection').select('*').eq('state', state).maybeSingle() : { data: null };
  if (!conn) return new Response('This QuickBooks link has expired. Start again from the staff app.', { status: 400 });
  const back = `${conn.return_to}/admin?qbo=`;
  if (url.searchParams.get('error') || !url.searchParams.get('code')) {
    await db.from('qbo_connection').update({ state: null }).eq('id', true);
    return Response.redirect(back + 'cancelled', 302);
  }
  try {
    const t = await tokenRequest({ grant_type: 'authorization_code', code: url.searchParams.get('code')!, redirect_uri: REDIRECT });
    const realm = url.searchParams.get('realmId')!;
    // A different QuickBooks company than before: its ids mean nothing there, so everything goes again.
    if (conn.realm_id && conn.realm_id !== realm) {
      await db.from('punches').update({ qbo_id: null, qbo_synced_at: null, qbo_error: '' }).not('qbo_id', 'is', null);
      await db.from('profiles').update({ qbo_employee_id: null }).not('qbo_employee_id', 'is', null);
      await db.from('qbo_deleted').delete().neq('qbo_id', '');
    }
    const fields = { ...tokenFields(t), realm_id: realm, state: null, connected_at: new Date().toISOString(), last_error: '' };
    await db.from('qbo_connection').update(fields).eq('id', true);
    Object.assign(conn, fields);
    const info = await qbo(db, conn).call('GET', `companyinfo/${realm}`).catch(() => null);
    if (info?.CompanyInfo?.CompanyName) await db.from('qbo_connection').update({ qbo_company_name: info.CompanyInfo.CompanyName }).eq('id', true);
    return Response.redirect(back + 'connected', 302);
  } catch (e) {
    console.error(e);
    return Response.redirect(back + 'failed', 302);
  }
}

// Only send Intuit back to a real web address (the staff app's own origin).
function origin(s: unknown) {
  try {
    const u = new URL(String(s));
    return u.protocol === 'https:' || u.hostname === 'localhost' ? u.origin : null;
  } catch {
    return null;
  }
}

Deno.serve(async req => {
  if (req.method === 'GET') return callback(new URL(req.url));
  try {
    const asUser = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
      auth: { persistSession: false },
    });
    const { data: { user } } = await asUser.auth.getUser();
    if (!user) return json({ error: 'not_signed_in' }, 401);
    const { data: me } = await asUser.from('profiles').select('role, active').eq('id', user.id).maybeSingle();
    if (me?.role !== 'admin' || !me.active) return json({ error: 'managers_only' }, 403);

    const db = admin();
    const body = await req.json().catch(() => ({}));
    const { action, date } = body;
    const [{ data: conn }, { data: settings }] = await Promise.all([
      db.from('qbo_connection').select('*').maybeSingle(),
      db.from('settings').select('timezone').single(),
    ]);
    const tz = settings?.timezone || 'America/New_York';
    const connected = !!conn?.realm_id && !!conn?.refresh_token;

    if (action === 'status') {
      const p = connected ? await pending(db, conn, tz) : null;
      return json({
        configured: configured(), connected, sandbox: SANDBOX,
        company: conn?.qbo_company_name || '', sync_from: conn?.sync_from || null,
        last_sync_at: conn?.last_sync_at || null, last_error: conn?.last_error || '',
        pending: p ? p.punches.length + p.deleted.length : null,
      });
    }
    if (!configured()) return json({ error: 'qbo_not_configured' }, 400);

    if (action === 'connect') {
      const returnTo = origin(body.return_to);
      if (!returnTo) return json({ error: 'bad_return_to' }, 400);
      const state = crypto.randomUUID();
      await db.from('qbo_connection').upsert({ id: true, state, return_to: returnTo });
      const u = new URL('https://appcenter.intuit.com/connect/oauth2');
      u.search = new URLSearchParams({ client_id: CLIENT_ID, response_type: 'code', scope: 'com.intuit.quickbooks.accounting', redirect_uri: REDIRECT, state }).toString();
      return json({ url: u.toString() });
    }
    if (!connected) return json({ error: 'qbo_not_connected' }, 400);

    if (action === 'sync_from') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return json({ error: 'bad_date' }, 400);
      await db.from('qbo_connection').update({ sync_from: date }).eq('id', true);
      return json({ ok: true });
    }
    if (action === 'sync') {
      try {
        return json(await sync(db, conn, tz));
      } catch (e) {
        if ((e as Error).message === 'qbo_reconnect') {
          await db.from('qbo_connection').update({ refresh_token: null, access_token: null, last_error: 'QuickBooks signed us out. Connect again.' }).eq('id', true);
        }
        throw e;
      }
    }
    if (action === 'disconnect') {
      await fetch(REVOKE_URL, {
        method: 'POST',
        headers: { Authorization: `Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`, Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: conn.refresh_token }),
      }).catch(() => null);
      // Keeps realm_id so reconnecting the same company doesn't send everything twice.
      await db.from('qbo_connection').update({ access_token: null, refresh_token: null, state: null, last_error: '' }).eq('id', true);
      return json({ ok: true });
    }
    return json({ error: 'unknown_action' }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 400);
  }
});

// Gusto: a manager connects the business's Gusto account, matches each person
// to their Gusto employee, and each finished punch goes to Gusto's Time
// Tracking API as a time sheet, split into regular and overtime hours by the
// pay week. Gusto holds the hours on its Time Tracking page until the admin
// syncs them to payroll there. Only punches that start on or after the
// connection's sync_from date go. Edited punches (or ones whose overtime moved
// because of an edit earlier in the week) are sent again; deleted ones are
// deleted in Gusto too.
//
// POST (signed-in manager), called from the staff app's server actions:
//   { action: 'status' }                 -> { configured, connected, demo, company, sync_from, last_sync_at, last_error, pending, unmatched }
//   { action: 'connect', return_to }     -> { url } to Gusto's sign-in; Gusto comes back to return_to + /admin/gusto?gusto=...
//   { action: 'employees' }              -> { employees: [{ uuid, name, job_uuid }] }; also matches unmatched staff by name
//   { action: 'match', user, employee }  -> sets (or clears, employee '') who a person is in Gusto
//   { action: 'sync_from', date }        -> saves the start date
//   { action: 'sync' }                   -> pushes a batch; { done, pushed, errors }; call again until done
//   { action: 'disconnect' }
// GET ?code&state: Gusto sends the manager back here after they approve.
//
// Secrets: GUSTO_CLIENT_ID, GUSTO_CLIENT_SECRET, GUSTO_ENV ('demo' or 'production').
// In the Gusto app, the redirect URI is <SUPABASE_URL>/functions/v1/gusto.
// Deploy with JWT verification off (Gusto's GET has no sign-in); the POST
// checks the caller itself.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import { localDate, shiftMinutes, splitShifts, weekOf } from '../_shared/overtime.ts';

const CLIENT_ID = Deno.env.get('GUSTO_CLIENT_ID') || '';
const CLIENT_SECRET = Deno.env.get('GUSTO_CLIENT_SECRET') || '';
const DEMO = (Deno.env.get('GUSTO_ENV') || 'demo') !== 'production';
const HOST = DEMO ? 'https://api.gusto-demo.com' : 'https://api.gusto.com';
const VERSION = '2026-06-15';
const REDIRECT = `${Deno.env.get('SUPABASE_URL')}/functions/v1/gusto`;
const configured = () => !!(CLIENT_ID && CLIENT_SECRET);
const BATCH = 20; // punches per sync call, to stay well inside the function's time limit

const admin = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

type Conn = Record<string, any>;
type Db = ReturnType<typeof admin>;
type Settings = { timezone: string; week_starts_on: number; overtime_hours: number };

/* tokens: access tokens last 2 hours; each refresh token works once */
async function tokenRequest(body: Record<string, string>) {
  const res = await fetch(`${HOST}/oauth/token`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, redirect_uri: REDIRECT, ...body }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error === 'invalid_grant' ? 'gusto_reconnect' : `gusto_token_${res.status}`);
  return data;
}
const tokenFields = (t: any) => ({
  access_token: t.access_token, refresh_token: t.refresh_token,
  access_expires_at: new Date(Date.now() + ((t.expires_in || 7200) - 60) * 1000).toISOString(),
});

async function freshToken(db: Db, conn: Conn) {
  if (conn.access_token && new Date(conn.access_expires_at) > new Date()) return conn.access_token;
  const f = tokenFields(await tokenRequest({ grant_type: 'refresh_token', refresh_token: conn.refresh_token }));
  await db.from('gusto_connection').update(f).eq('id', true);
  Object.assign(conn, f);
  return conn.access_token;
}

/* the Gusto API */
function gusto(db: Db, conn: Conn) {
  return async (method: string, path: string, body?: unknown) => {
    const res = await fetch(`${HOST}/v1/${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${await freshToken(db, conn)}`, 'X-Gusto-API-Version': VERSION,
        Accept: 'application/json', 'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 204) return null;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = data?.errors?.[0];
      const msg = err?.message || data?.message || data?.error || `Gusto error ${res.status}`;
      throw Object.assign(new Error(String(msg)), { status: res.status });
    }
    return data;
  };
}
type Api = ReturnType<typeof gusto>;

/* employees */
async function listEmployees(api: Api, conn: Conn) {
  const all: any[] = [];
  for (let page = 1; page < 50; page++) {
    const rows = await api('GET', `companies/${conn.company_uuid}/employees?terminated=false&page=${page}&per=100`);
    all.push(...(rows || []));
    if (!rows?.length || rows.length < 100) break;
  }
  return all.map(e => ({
    uuid: e.uuid as string,
    name: `${e.preferred_first_name || e.first_name} ${e.last_name}`.trim(),
    legal: `${e.first_name} ${e.last_name}`.trim(),
    job_uuid: ((e.jobs || []).find((j: any) => j.primary) || (e.jobs || [])[0])?.uuid as string | undefined,
  }));
}
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, ' ').trim();

/* punches */
const hours = (minutes: number) => Math.round(minutes / 60 * 100) / 100;

async function pending(db: Db, conn: Conn, s: Settings) {
  // Whole pay weeks, so overtime counts the days before sync_from in the same week.
  const week = weekOf(conn.sync_from, s.week_starts_on);
  const from = new Date(Date.parse(`${week}T00:00:00Z`) - 86400000).toISOString();
  const [{ data: rows }, { data: people }, { data: gone }] = await Promise.all([
    db.from('punches').select('*').not('clock_out', 'is', null).gte('clock_in', from).order('clock_in'),
    db.from('profiles').select('id, full_name, phone, gusto_employee_uuid, gusto_job_uuid'),
    db.from('gusto_deleted').select('gusto_id, version'),
  ]);
  const inWeeks = (rows || []).filter(p => localDate(p.clock_in, s.timezone) >= week);
  const split = splitShifts(inWeeks.map(p => ({ id: p.id, user: p.user_id, start: p.clock_in, end: p.clock_out })),
    s.timezone, s.week_starts_on, s.overtime_hours);
  const byId = new Map((people || []).map(w => [w.id, w]));
  const punches: any[] = [];
  let unmatched = 0;
  for (const p of inWeeks) {
    if (localDate(p.clock_in, s.timezone) < conn.sync_from) continue;
    const worker = byId.get(p.user_id);
    const { regular, overtime } = split.get(p.id)!;
    if (!worker?.gusto_employee_uuid) {
      if (regular + overtime > 0) unmatched++;
      continue;
    }
    const sent = [p.clock_in, p.clock_out, regular, overtime, worker.gusto_employee_uuid, worker.gusto_job_uuid].join('|');
    if (sent === p.gusto_sent || (!p.gusto_id && regular + overtime === 0)) continue;
    punches.push({ ...p, worker, regular, overtime, sent });
  }
  return { punches, deleted: gone || [], unmatched };
}

async function deleteSheet(api: Api, id: string, version: string) {
  try {
    await api('DELETE', `time_tracking/time_sheets/${id}?version=${encodeURIComponent(version)}`);
  } catch (e) {
    if ((e as any).status !== 404) throw e; // already gone from Gusto is fine
  }
}

// A changed punch is deleted and sent fresh, which is simpler than matching up
// Gusto's entries when the regular/overtime split changes.
async function pushPunch(api: Api, db: Db, p: any, tz: string) {
  if (p.gusto_id) await deleteSheet(api, p.gusto_id, p.gusto_version || '');
  const entries = [
    { pay_classification: 'Regular', hours_worked: hours(p.regular) },
    { pay_classification: 'Overtime', hours_worked: hours(p.overtime) },
  ].filter(e => e.hours_worked > 0);
  let id: string | null = null, version: string | null = null;
  if (entries.length) {
    const sheet = await api('POST', `companies/${(p.company_uuid)}/time_tracking/time_sheets`, {
      entity_uuid: p.worker.gusto_employee_uuid, entity_type: 'Employee', job_uuid: p.worker.gusto_job_uuid || undefined,
      time_zone: tz, shift_started_at: p.clock_in, shift_ended_at: p.clock_out, entries,
      metadata: { timeclock_punch: p.id, note: (p.note || '').slice(0, 250) || undefined },
    });
    id = sheet.uuid;
    version = sheet.version;
  }
  await db.from('punches').update({
    gusto_id: id, gusto_version: version, gusto_sent: p.sent, gusto_synced_at: new Date().toISOString(), gusto_error: '',
  }).eq('id', p.id);
}

async function sync(db: Db, conn: Conn, s: Settings) {
  const api = gusto(db, conn);
  const { punches, deleted } = await pending(db, conn, s);
  const pushed = { time: 0, deleted: 0 };
  const errors: string[] = [];
  let budget = BATCH;

  for (const d of deleted) {
    if (budget-- <= 0) break;
    try {
      await deleteSheet(api, d.gusto_id, d.version);
      await db.from('gusto_deleted').delete().eq('gusto_id', d.gusto_id);
      pushed.deleted++;
    } catch (e) {
      const msg = (e as Error).message;
      if (msg === 'gusto_reconnect') throw e;
      errors.push(`Deleting a Gusto time sheet: ${msg}`);
    }
  }
  for (const p of punches) {
    if (budget-- <= 0) break;
    try {
      await pushPunch(api, db, { ...p, company_uuid: conn.company_uuid }, s.timezone);
      pushed.time++;
    } catch (e) {
      const msg = (e as Error).message;
      if (msg === 'gusto_reconnect') throw e;
      errors.push(`${localDate(p.clock_in, s.timezone)} (${p.worker.full_name || p.worker.phone || 'staff'}): ${msg}`);
      // Marked as tried so the next sync moves on; editing the punch tries it again.
      await db.from('punches').update({ gusto_sent: p.sent, gusto_error: msg.slice(0, 500), gusto_synced_at: new Date().toISOString() }).eq('id', p.id);
    }
  }
  const left = await pending(db, conn, s);
  const done = budget > 0 || (!left.punches.length && !left.deleted.length);
  await db.from('gusto_connection').update({ last_sync_at: new Date().toISOString(), last_error: errors.slice(0, 5).join('\n') }).eq('id', true);
  return { done, pushed, errors };
}

/* coming back from Gusto */
async function callback(url: URL) {
  const db = admin();
  const state = url.searchParams.get('state') || '';
  const { data: conn } = state ? await db.from('gusto_connection').select('*').eq('state', state).maybeSingle() : { data: null };
  if (!conn) return new Response('This Gusto link has expired. Start again from the staff app.', { status: 400 });
  const back = `${conn.return_to}/admin/gusto?gusto=`;
  if (url.searchParams.get('error') || !url.searchParams.get('code')) {
    await db.from('gusto_connection').update({ state: null }).eq('id', true);
    return Response.redirect(back + 'cancelled', 302);
  }
  try {
    const t = await tokenRequest({ grant_type: 'authorization_code', code: url.searchParams.get('code')! });
    const fields: Conn = { ...tokenFields(t), state: null, connected_at: new Date().toISOString(), last_error: '' };
    Object.assign(conn, fields);
    const api = gusto(db, conn);
    const info = await api('GET', 'token_info');
    if (info?.resource?.type !== 'Company') throw new Error('Not connected to a company');
    // A different Gusto company than before: its ids mean nothing there, so start over.
    if (conn.company_uuid && conn.company_uuid !== info.resource.uuid) {
      await db.from('punches').update({ gusto_id: null, gusto_version: null, gusto_sent: null, gusto_synced_at: null, gusto_error: '' }).not('gusto_sent', 'is', null);
      await db.from('profiles').update({ gusto_employee_uuid: null, gusto_job_uuid: null }).not('gusto_employee_uuid', 'is', null);
      await db.from('gusto_deleted').delete().neq('gusto_id', '');
    }
    fields.company_uuid = info.resource.uuid;
    const co = await api('GET', `companies/${info.resource.uuid}`).catch(() => null);
    fields.company_name = co?.trade_name || co?.name || '';
    await db.from('gusto_connection').update(fields).eq('id', true);
    return Response.redirect(back + 'connected', 302);
  } catch (e) {
    console.error(e);
    return Response.redirect(back + 'failed', 302);
  }
}

// Only send Gusto back to a real web address (the staff app's own origin).
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
    const { action } = body;
    const [{ data: conn }, { data: settings }] = await Promise.all([
      db.from('gusto_connection').select('*').maybeSingle(),
      db.from('settings').select('timezone, week_starts_on, overtime_hours').single(),
    ]);
    const s: Settings = {
      timezone: settings?.timezone || 'America/New_York',
      week_starts_on: Number(settings?.week_starts_on ?? 0),
      overtime_hours: Number(settings?.overtime_hours ?? 40),
    };
    const connected = !!conn?.company_uuid && !!conn?.refresh_token;

    if (action === 'status') {
      const p = connected ? await pending(db, conn, s) : null;
      return json({
        configured: configured(), connected, demo: DEMO,
        company: conn?.company_name || '', sync_from: conn?.sync_from || null,
        last_sync_at: conn?.last_sync_at || null, last_error: conn?.last_error || '',
        pending: p ? p.punches.length + p.deleted.length : null, unmatched: p?.unmatched ?? 0,
      });
    }
    if (!configured()) return json({ error: 'gusto_not_configured' }, 400);

    if (action === 'connect') {
      const returnTo = origin(body.return_to);
      if (!returnTo) return json({ error: 'bad_return_to' }, 400);
      const state = crypto.randomUUID();
      await db.from('gusto_connection').upsert({ id: true, state, return_to: returnTo });
      const u = new URL(`${HOST}/oauth/authorize`);
      u.search = new URLSearchParams({ client_id: CLIENT_ID, response_type: 'code', redirect_uri: REDIRECT, state }).toString();
      return json({ url: u.toString() });
    }
    if (!connected) return json({ error: 'gusto_not_connected' }, 400);

    if (action === 'employees') {
      const employees = await listEmployees(gusto(db, conn), conn);
      // Match anyone not matched yet whose name is the same as one (and only one) Gusto employee.
      const { data: people } = await db.from('profiles').select('id, full_name, gusto_employee_uuid');
      const taken = new Set((people || []).map(p => p.gusto_employee_uuid).filter(Boolean));
      for (const p of people || []) {
        if (p.gusto_employee_uuid || !p.full_name) continue;
        const hits = employees.filter(e => !taken.has(e.uuid) && (norm(e.name) === norm(p.full_name) || norm(e.legal) === norm(p.full_name)));
        if (hits.length !== 1) continue;
        await db.from('profiles').update({ gusto_employee_uuid: hits[0].uuid, gusto_job_uuid: hits[0].job_uuid || null }).eq('id', p.id);
        taken.add(hits[0].uuid);
      }
      return json({ employees: employees.map(({ uuid, name, job_uuid }) => ({ uuid, name, job_uuid })) });
    }
    if (action === 'match') {
      let job: string | null = null;
      if (body.employee) {
        const e = (await listEmployees(gusto(db, conn), conn)).find(x => x.uuid === body.employee);
        if (!e) return json({ error: 'gusto_employee_not_found' }, 400);
        job = e.job_uuid || null;
      }
      await db.from('profiles').update({ gusto_employee_uuid: body.employee || null, gusto_job_uuid: job }).eq('id', String(body.user || ''));
      return json({ ok: true });
    }
    if (action === 'sync_from') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date || '')) return json({ error: 'bad_date' }, 400);
      await db.from('gusto_connection').update({ sync_from: body.date }).eq('id', true);
      return json({ ok: true });
    }
    if (action === 'sync') {
      try {
        return json(await sync(db, conn, s));
      } catch (e) {
        if ((e as Error).message === 'gusto_reconnect') {
          await db.from('gusto_connection').update({ refresh_token: null, access_token: null, last_error: 'Gusto signed us out. Connect again.' }).eq('id', true);
        }
        throw e;
      }
    }
    if (action === 'disconnect') {
      // Keeps company_uuid so reconnecting the same company doesn't send everything twice.
      await db.from('gusto_connection').update({ access_token: null, refresh_token: null, state: null, last_error: '' }).eq('id', true);
      return json({ ok: true });
    }
    return json({ error: 'unknown_action' }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 400);
  }
});

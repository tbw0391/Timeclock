import Link from "next/link";
import { Flash, Header } from "@/components/ui";
import { requireAdmin, type Profile, type Punch } from "@/lib/session";
import {
  addDays, dayLabel, hours, isDate, localInput, timeLabel, todayIn, weekStart, weekTotals, type DayRow,
} from "@/lib/time";
import { deletePunch, savePunch } from "../actions";

type Props = { searchParams: Promise<{ from?: string; to?: string; user?: string; error?: string; ok?: string }> };

export const dynamic = "force-dynamic";

export default async function TimesheetsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const { supabase, profile, settings } = await requireAdmin();
  const tz = settings.timezone;
  const thisWeek = weekStart(todayIn(tz), settings.week_starts_on);
  const from = isDate(sp.from) ? sp.from : addDays(thisWeek, -7);
  const to = isDate(sp.to) ? sp.to : addDays(thisWeek, 6);
  const user = sp.user ?? "";

  let punchQuery = supabase.from("punches").select("*")
    .gte("clock_in", `${addDays(from, -1)}T00:00:00Z`).lt("clock_in", `${addDays(to, 2)}T00:00:00Z`)
    .order("clock_in");
  if (user) punchQuery = punchQuery.eq("user_id", user);

  const [{ data: people }, { data: days }, { data: rawPunches }] = await Promise.all([
    supabase.from("profiles").select("*").order("full_name").returns<Profile[]>(),
    supabase.rpc("timesheet", { p_from: from, p_to: to }),
    punchQuery.returns<Punch[]>(),
  ]);
  // The query above is padded a day each side for time zones; trim to the range.
  const punches = (rawPunches ?? []).filter((p) => {
    const d = localInput(p.clock_in, tz).slice(0, 10);
    return d >= from && d <= to;
  });
  const byId = new Map((people ?? []).map((p) => [p.id, p]));
  const name = (id: string) => byId.get(id)?.full_name || byId.get(id)?.phone || "?";
  const weeks = weekTotals(((days ?? []) as DayRow[]).filter((d) => !user || d.user_id === user),
    settings.week_starts_on, settings.overtime_hours);
  const query = new URLSearchParams({ from, to, ...(user ? { user } : {}) });
  const here = `/admin/timesheets?${query}`;

  return (
    <>
      <Header profile={profile} settings={settings} />
      <Flash error={sp.error} ok={sp.ok} />

      <form className="card mb-6 flex flex-wrap items-end gap-3">
        <label className="text-sm">From<input type="date" name="from" defaultValue={from} className="input mt-1" /></label>
        <label className="text-sm">To<input type="date" name="to" defaultValue={to} className="input mt-1" /></label>
        <label className="text-sm">Who
          <select name="user" defaultValue={user} className="input mt-1">
            <option value="">Everyone</option>
            {(people ?? []).map((p) => <option key={p.id} value={p.id}>{p.full_name || p.phone}</option>)}
          </select>
        </label>
        <button className="btn">Show</button>
        <Link href={`/api/export?${query}`} className="btn-ghost" prefetch={false}>Download CSV</Link>
      </form>

      <section className="card mb-6 overflow-x-auto">
        <h2 className="mb-2 font-semibold">Weekly totals</h2>
        <table className="tbl">
          <thead><tr><th>Week of</th><th>Who</th><th>Days</th><th>Total</th><th>Regular</th><th>Overtime</th></tr></thead>
          <tbody>
            {weeks.map((w) => (
              <tr key={`${w.user_id}${w.week}`}>
                <td>{dayLabel(w.week)}</td>
                <td>{w.name}</td>
                <td className="muted">
                  {Object.entries(w.days).sort().map(([d, s]) => `${dayLabel(d)} ${hours(s)}`).join(" · ")}
                </td>
                <td className="font-medium">{hours(w.seconds)}</td>
                <td>{hours(w.seconds - w.overtime)}</td>
                <td className={w.overtime ? "font-medium text-amber-600" : "muted"}>{hours(w.overtime)}</td>
              </tr>
            ))}
            {!weeks.length && <tr><td colSpan={6} className="muted">No time in this range.</td></tr>}
          </tbody>
        </table>
        <p className="muted mt-2 text-xs">
          Shifts count on the day they started. A week cut off by the date range only shows the part inside it.
        </p>
      </section>

      <section className="card mb-6 overflow-x-auto">
        <h2 className="mb-2 font-semibold">Punches</h2>
        <table className="tbl">
          <thead><tr><th>Who</th><th>In</th><th>Out</th><th>Hours</th><th>Note</th><th></th></tr></thead>
          <tbody>
            {punches.map((p) => (
              <tr key={p.id}>
                <td>{name(p.user_id)}</td>
                <td>{timeLabel(p.clock_in, tz)}</td>
                <td>{p.clock_out ? timeLabel(p.clock_out, tz) : <span className="text-amber-600">missing</span>}</td>
                <td>{p.clock_out ? hours((Date.parse(p.clock_out) - Date.parse(p.clock_in)) / 1000) : "–"}</td>
                <td className="muted">{p.note}</td>
                <td>
                  <details>
                    <summary className="cursor-pointer text-sm">Fix</summary>
                    <PunchForm punch={p} tz={tz} returnTo={here} />
                    <form action={deletePunch} className="mt-2 flex gap-2">
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="return_to" value={here} />
                      <input name="reason" placeholder="Reason to delete" className="input" required />
                      <button className="btn-ghost text-red-600">Delete</button>
                    </form>
                  </details>
                </td>
              </tr>
            ))}
            {!punches.length && <tr><td colSpan={6} className="muted">No punches in this range.</td></tr>}
          </tbody>
        </table>
      </section>

      <section className="card max-w-lg">
        <h2 className="mb-2 font-semibold">Add a missed punch</h2>
        <PunchForm people={people ?? []} tz={tz} returnTo={here} defaultUser={user} />
      </section>
    </>
  );
}

function PunchForm({ punch, people, tz, returnTo, defaultUser }: {
  punch?: Punch; people?: Profile[]; tz: string; returnTo: string; defaultUser?: string;
}) {
  return (
    <form action={savePunch} className="mt-2 grid min-w-64 gap-2">
      <input type="hidden" name="return_to" value={returnTo} />
      {punch ? (
        <>
          <input type="hidden" name="id" value={punch.id} />
          <input type="hidden" name="user_id" value={punch.user_id} />
        </>
      ) : (
        <select name="user_id" defaultValue={defaultUser} className="input" required>
          <option value="">Who…</option>
          {people?.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.phone}</option>)}
        </select>
      )}
      <label className="text-sm">In ({tz})
        <input type="datetime-local" name="clock_in" defaultValue={localInput(punch?.clock_in ?? null, tz)} className="input mt-1" required />
      </label>
      <label className="text-sm">Out
        <input type="datetime-local" name="clock_out" defaultValue={localInput(punch?.clock_out ?? null, tz)} className="input mt-1" />
      </label>
      <input name="note" placeholder="Note" defaultValue={punch?.note} className="input" />
      <input name="reason" placeholder="Reason for the change (required)" className="input" required />
      <button className="btn justify-self-start">{punch ? "Save fix" : "Add punch"}</button>
    </form>
  );
}

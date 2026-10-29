import { Flash, Header } from "@/components/ui";
import { requireAdmin, type Profile, type Punch } from "@/lib/session";
import { formatPhone } from "@/lib/phone";
import { hours, timeLabel } from "@/lib/time";
import { createEmployee, saveEmployee, saveSettings } from "./actions";

type Props = { searchParams: Promise<{ error?: string; ok?: string }> };

export const dynamic = "force-dynamic";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function AdminPage({ searchParams }: Props) {
  const { error, ok } = await searchParams;
  const { supabase, profile, settings } = await requireAdmin();
  const tz = settings.timezone;
  const [{ data: people }, { data: open }] = await Promise.all([
    supabase.from("profiles").select("*").order("full_name").returns<Profile[]>(),
    supabase.from("punches").select("*").is("clock_out", null).order("clock_in").returns<Punch[]>(),
  ]);
  const byId = new Map((people ?? []).map((p) => [p.id, p]));
  const pending = (people ?? []).filter((p) => !p.active);
  const now = Date.now();

  return (
    <>
      <Header profile={profile} settings={settings} />
      <Flash error={error} ok={ok} />

      <section className="card mb-6">
        <h2 className="mb-2 font-semibold">On the clock now ({open?.length ?? 0})</h2>
        {open?.length ? (
          <table className="tbl">
            <thead><tr><th>Who</th><th>Since</th><th>Hours so far</th><th>Note</th></tr></thead>
            <tbody>
              {open.map((p) => (
                <tr key={p.id}>
                  <td>{byId.get(p.user_id)?.full_name || formatPhone(byId.get(p.user_id)?.phone)}</td>
                  <td>{timeLabel(p.clock_in, tz)}</td>
                  <td>{hours((now - Date.parse(p.clock_in)) / 1000)}</td>
                  <td className="muted">{p.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="muted text-sm">Nobody is clocked in.</p>}
      </section>

      {pending.length > 0 && (
        <p className="mb-4 rounded-md bg-amber-100 px-3 py-2 text-sm text-amber-900">
          {pending.length} deactivated account{pending.length > 1 ? "s" : ""}. Check &ldquo;Active&rdquo; and save
          to let someone clock in again.
        </p>
      )}

      <section className="card mb-6 overflow-x-auto">
        <h2 className="mb-1 font-semibold">Crew</h2>
        <p className="muted mb-3 text-sm">
          Add people here with their phone number. They sign in by getting a code texted to that number.
        </p>
        <form action={createEmployee} className="mb-4 flex flex-wrap items-center gap-2">
          <input name="full_name" placeholder="Name" className="input w-44!" required />
          <input name="phone" type="tel" inputMode="tel" placeholder="Phone number" className="input w-40!" required />
          <button className="btn">Add employee</button>
        </form>
        <table className="tbl">
          <thead><tr><th>Name</th><th>Phone</th><th>Role</th><th>Active</th><th></th></tr></thead>
          <tbody>
            {(people ?? []).map((p) => (
              <tr key={p.id}>
                <td colSpan={5} className="p-0!">
                  <form action={saveEmployee} className="flex flex-wrap items-center gap-2 px-2 py-1.5">
                    <input type="hidden" name="id" value={p.id} />
                    <input name="full_name" defaultValue={p.full_name} className="input w-44!" aria-label="Name" />
                    <span className="muted min-w-32 flex-1 text-sm">{formatPhone(p.phone)}</span>
                    <select name="role" defaultValue={p.role} className="input w-32!" aria-label="Role">
                      <option value="employee">Employee</option>
                      <option value="admin">Manager</option>
                    </select>
                    <label className="flex items-center gap-1 text-sm">
                      <input type="checkbox" name="active" defaultChecked={p.active} /> Active
                    </label>
                    <button className="btn-ghost">Save</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card max-w-lg">
        <h2 className="mb-3 font-semibold">Settings</h2>
        <form action={saveSettings} className="grid gap-3">
          <label className="text-sm">Business name
            <input name="business_name" defaultValue={settings.business_name} className="input mt-1" />
          </label>
          <label className="text-sm">Time zone
            <select name="timezone" defaultValue={tz} className="input mt-1">
              {Intl.supportedValuesOf("timeZone").map((z) => <option key={z}>{z}</option>)}
            </select>
          </label>
          <label className="text-sm">Pay week starts on
            <select name="week_starts_on" defaultValue={settings.week_starts_on} className="input mt-1">
              {WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </select>
          </label>
          <label className="text-sm">Overtime after (hours per week)
            <input name="overtime_hours" type="number" min={0} step="0.5" defaultValue={settings.overtime_hours} className="input mt-1" />
          </label>
          <button className="btn justify-self-start">Save settings</button>
        </form>
      </section>
    </>
  );
}

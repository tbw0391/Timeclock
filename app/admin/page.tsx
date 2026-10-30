import { Flash, GpsTag, Header } from "@/components/ui";
import { inFix } from "@/lib/gps";
import { requireAdmin, type Profile, type Punch } from "@/lib/session";
import { formatPhone } from "@/lib/phone";
import { hours, timeLabel } from "@/lib/time";
import { createEmployee, deleteKiosk, saveEmployee, saveSettings, setKioskPin, startKiosk } from "./actions";

type Props = { searchParams: Promise<{ error?: string; ok?: string }> };

export const dynamic = "force-dynamic";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function AdminPage({ searchParams }: Props) {
  const { error, ok } = await searchParams;
  const { supabase, profile, settings } = await requireAdmin();
  const tz = settings.timezone;
  const [{ data: people }, { data: open }, { data: kiosks }, { data: pinUsers }] = await Promise.all([
    supabase.from("profiles").select("*").order("full_name").returns<Profile[]>(),
    supabase.from("punches").select("*").is("clock_out", null).order("clock_in").returns<Punch[]>(),
    supabase.from("kiosks").select("id, name, created_at, last_used_at").order("created_at")
      .returns<{ id: string; name: string; created_at: string; last_used_at: string | null }[]>(),
    supabase.rpc("admin_kiosk_pin_users"),
  ]);
  const hasPin = new Set((pinUsers ?? []) as string[]);
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
            <thead><tr><th>Who</th><th>Since</th><th>Hours so far</th><th>Where</th><th>Note</th></tr></thead>
            <tbody>
              {open.map((p) => (
                <tr key={p.id}>
                  <td>{byId.get(p.user_id)?.full_name || formatPhone(byId.get(p.user_id)?.phone)}</td>
                  <td>{timeLabel(p.clock_in, tz)}</td>
                  <td>{hours((now - Date.parse(p.clock_in)) / 1000)}</td>
                  <td className="text-sm"><GpsTag fix={inFix(p)} /></td>
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
                  <details className="px-2 pb-2">
                    <summary className="muted cursor-pointer text-xs">
                      Kiosk PIN: {hasPin.has(p.id) ? "set ✓" : "not set"}
                    </summary>
                    <form action={setKioskPin} className="mt-2 flex gap-2">
                      <input type="hidden" name="id" value={p.id} />
                      <input name="pin" inputMode="numeric" pattern="\d{4}" maxLength={4} placeholder="4 digits" className="input w-28!" required autoComplete="off" />
                      <button className="btn-ghost">Set kiosk PIN</button>
                    </form>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card mb-6 max-w-lg">
        <h2 className="mb-1 font-semibold">Kiosk</h2>
        <p className="muted mb-3 text-sm">
          A shared tablet where people tap their name and enter a 4-digit kiosk PIN to clock in or out.
          Open this page on the tablet and set it up here. You&apos;ll be signed out on that device, and only a
          manager&apos;s PIN can turn kiosk mode off.
        </p>
        <form action={startKiosk} className="mb-4 flex flex-wrap gap-2">
          <input name="name" placeholder="Kiosk name, e.g. Front desk" className="input flex-1" required />
          <button className="btn">Set up this device as a kiosk</button>
        </form>
        {kiosks?.length ? (
          <table className="tbl">
            <thead><tr><th>Kiosk</th><th>Last used</th><th></th></tr></thead>
            <tbody>
              {kiosks.map((k) => (
                <tr key={k.id}>
                  <td>{k.name}</td>
                  <td className="muted">{k.last_used_at ? timeLabel(k.last_used_at, tz) : "never"}</td>
                  <td>
                    <form action={deleteKiosk}>
                      <input type="hidden" name="id" value={k.id} />
                      <button className="btn-ghost text-red-600">Remove</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="muted text-sm">No kiosks yet.</p>}
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

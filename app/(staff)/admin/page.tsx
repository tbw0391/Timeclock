import { Flash, GpsTag, Header } from "@/components/ui";
import { inFix } from "@/lib/gps";
import { getT } from "@/lib/i18n/server";
import { requireAdmin, type Profile, type Punch } from "@/lib/session";
import { formatPhone } from "@/lib/phone";
import { hours, timeLabel } from "@/lib/time";
import { createEmployee, deleteKiosk, saveEmployee, saveSettings, setKioskPin, startKiosk } from "./actions";

type Props = { searchParams: Promise<{ error?: string; ok?: string }> };

export const dynamic = "force-dynamic";

export default async function AdminPage({ searchParams }: Props) {
  const { error, ok } = await searchParams;
  const { supabase, profile, settings } = await requireAdmin();
  const { t, intl } = await getT();
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
  // Weekday names in the reader's language; 2023-01-01 was a Sunday.
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Date(Date.UTC(2023, 0, 1 + i)).toLocaleDateString(intl, { weekday: "long", timeZone: "UTC" }));

  return (
    <>
      <Header profile={profile} settings={settings} />
      <Flash error={error} ok={ok} />

      <section className="card mb-6">
        <h2 className="mb-2 font-semibold">{t("crew.onClockNow", { count: open?.length ?? 0 })}</h2>
        {open?.length ? (
          <table className="tbl">
            <thead><tr><th>{t("common.who")}</th><th>{t("crew.since")}</th><th>{t("crew.hoursSoFar")}</th><th>{t("crew.where")}</th><th>{t("common.note")}</th></tr></thead>
            <tbody>
              {open.map((p) => (
                <tr key={p.id}>
                  <td>{byId.get(p.user_id)?.full_name || formatPhone(byId.get(p.user_id)?.phone)}</td>
                  <td>{timeLabel(p.clock_in, tz, intl)}</td>
                  <td>{hours((now - Date.parse(p.clock_in)) / 1000)}</td>
                  <td className="text-sm"><GpsTag fix={inFix(p)} />{p.in_kiosk && <span className="muted"> ({p.in_kiosk})</span>}</td>
                  <td className="muted">{p.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="muted text-sm">{t("crew.nobodyIn")}</p>}
      </section>

      {pending.length > 0 && (
        <p className="mb-4 rounded-md bg-amber-100 px-3 py-2 text-sm text-amber-900">{t("crew.deactivated", { count: pending.length })}</p>
      )}

      <section className="card mb-6 overflow-x-auto">
        <h2 className="mb-1 font-semibold">{t("crew.title")}</h2>
        <p className="muted mb-3 text-sm">{t("crew.intro")}</p>
        <form action={createEmployee} className="mb-4 flex flex-wrap items-center gap-2">
          <input name="full_name" placeholder={t("common.name")} className="input w-44!" required />
          <input name="phone" type="tel" inputMode="tel" placeholder={t("common.phoneNumber")} className="input w-40!" required dir="ltr" />
          <button className="btn">{t("crew.add")}</button>
        </form>
        <table className="tbl">
          <thead><tr><th>{t("common.name")}</th><th>{t("common.phone")}</th><th>{t("crew.role")}</th><th>{t("crew.active")}</th><th></th></tr></thead>
          <tbody>
            {(people ?? []).map((p) => (
              <tr key={p.id}>
                <td colSpan={5} className="p-0!">
                  <form action={saveEmployee} className="flex flex-wrap items-center gap-2 px-2 py-1.5">
                    <input type="hidden" name="id" value={p.id} />
                    <input name="full_name" defaultValue={p.full_name} className="input w-44!" aria-label={t("common.name")} />
                    <span className="muted min-w-32 flex-1 text-sm" dir="ltr">{formatPhone(p.phone)}</span>
                    <select name="role" defaultValue={p.role} className="input w-32!" aria-label={t("crew.role")}>
                      <option value="employee">{t("crew.employee")}</option>
                      <option value="admin">{t("crew.manager")}</option>
                    </select>
                    <label className="flex items-center gap-1 text-sm">
                      <input type="checkbox" name="active" defaultChecked={p.active} /> {t("crew.active")}
                    </label>
                    <button className="btn-ghost">{t("common.save")}</button>
                  </form>
                  <details className="px-2 pb-2">
                    <summary className="muted cursor-pointer text-xs">
                      {hasPin.has(p.id) ? t("crew.kioskPinSet") : t("crew.kioskPinNotSet")}
                    </summary>
                    <form action={setKioskPin} className="mt-2 flex gap-2">
                      <input type="hidden" name="id" value={p.id} />
                      <input name="pin" inputMode="numeric" pattern="\d{4}" maxLength={4} placeholder={t("account.fourDigits")} className="input w-28!" required autoComplete="off" />
                      <button className="btn-ghost">{t("crew.setKioskPin")}</button>
                    </form>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card mb-6 max-w-lg">
        <h2 className="mb-1 font-semibold">{t("crew.kioskTitle")}</h2>
        <p className="muted mb-3 text-sm">{t("crew.kioskIntro")}</p>
        <form action={startKiosk} className="mb-4 flex flex-wrap gap-2">
          <input name="name" placeholder={t("crew.kioskName")} className="input flex-1" required />
          <button className="btn">{t("crew.kioskSetUp")}</button>
        </form>
        {kiosks?.length ? (
          <table className="tbl">
            <thead><tr><th>{t("crew.kioskTitle")}</th><th>{t("crew.kioskLastUsed")}</th><th></th></tr></thead>
            <tbody>
              {kiosks.map((k) => (
                <tr key={k.id}>
                  <td>{k.name}</td>
                  <td className="muted">{k.last_used_at ? timeLabel(k.last_used_at, tz, intl) : t("common.never")}</td>
                  <td>
                    <form action={deleteKiosk}>
                      <input type="hidden" name="id" value={k.id} />
                      <button className="btn-ghost text-red-600">{t("common.remove")}</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="muted text-sm">{t("crew.noKiosks")}</p>}
      </section>

      <section className="card max-w-lg">
        <h2 className="mb-3 font-semibold">{t("crew.settings")}</h2>
        <form action={saveSettings} className="grid gap-3">
          <label className="text-sm">{t("crew.businessName")}
            <input name="business_name" defaultValue={settings.business_name} className="input mt-1" />
          </label>
          <label className="text-sm">{t("crew.timezone")}
            <select name="timezone" defaultValue={tz} className="input mt-1" dir="ltr">
              {Intl.supportedValuesOf("timeZone").map((z) => <option key={z}>{z}</option>)}
            </select>
          </label>
          <label className="text-sm">{t("crew.weekStarts")}
            <select name="week_starts_on" defaultValue={settings.week_starts_on} className="input mt-1">
              {weekdays.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </label>
          <label className="text-sm">{t("crew.overtimeAfter")}
            <input name="overtime_hours" type="number" min={0} step="0.5" defaultValue={settings.overtime_hours} className="input mt-1" />
          </label>
          <button className="btn justify-self-start">{t("crew.saveSettings")}</button>
        </form>
      </section>
    </>
  );
}

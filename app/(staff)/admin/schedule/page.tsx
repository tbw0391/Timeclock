import { Flash, Header } from "@/components/ui";
import { WeekNav } from "@/components/schedule";
import { requireAdmin, type Profile } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import { dayLabel, todayIn, weekStart } from "@/lib/time";
import { byStart, clashes, hoursByPerson, pickWeek, shiftHours, shiftLabel, weekDays, type Shift } from "@/lib/schedule";
import { overlaps, type TimeOff } from "@/lib/time-off";
import { addShift, copyLastWeek, deleteShift } from "./actions";

type Props = { searchParams: Promise<{ error?: string; ok?: string; week?: string }> };

export const dynamic = "force-dynamic";

// Plan the week's shifts: add, remove, or copy last week's.
export default async function ScheduleAdminPage({ searchParams }: Props) {
  const { error, ok, week: weekParam } = await searchParams;
  const { supabase, profile, settings } = await requireAdmin();
  const { t, intl } = await getT();
  const today = todayIn(settings.timezone);
  const thisWeek = weekStart(today, settings.week_starts_on);
  const week = pickWeek(weekParam, today, settings.week_starts_on);
  const days = weekDays(week);
  const end = days[6];
  const [{ data: rows }, { data: people }, { data: off }] = await Promise.all([
    supabase.from("shifts").select("id, user_id, day, starts, ends, note").gte("day", week).lte("day", end).returns<Shift[]>(),
    supabase.from("profiles").select("id, full_name, phone, active").order("full_name").returns<Profile[]>(),
    supabase.from("time_off").select("*").eq("status", "approved").lte("starts_on", end).gte("ends_on", week).returns<TimeOff[]>(),
  ]);
  const shifts = (rows ?? []).sort(byStart);
  const nameOf = (id: string) => { const p = (people ?? []).find((x) => x.id === id); return p?.full_name || p?.phone || "—"; };
  const active = (people ?? []).filter((p) => p.active);
  const offOn = (day: string) => (off ?? []).filter((r) => overlaps(r, day, day));
  const clash = clashes(shifts);
  const hours = [...hoursByPerson(shifts)].sort((a, b) => nameOf(a[0]).localeCompare(nameOf(b[0])));
  const hidden = <input type="hidden" name="week" value={week} />;

  return (
    <>
      <Header profile={profile} settings={settings} />
      <Flash error={error} ok={ok} />
      <h1 className="mb-4 text-2xl font-bold">{t("sched.adminTitle")}</h1>
      <WeekNav base="/admin/schedule" week={week} thisWeek={thisWeek} t={t} intl={intl} />

      <section className="card mb-6 max-w-lg">
        <h2 className="mb-3 font-semibold">{t("sched.add")}</h2>
        <form action={addShift} className="space-y-3">
          {hidden}
          <label className="block text-sm">{t("common.who")}
            <select name="user_id" required className="input mt-1">
              {active.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.phone}</option>)}
            </select>
          </label>
          <label className="block text-sm">{t("sched.day")}
            <select name="day" required className="input mt-1" defaultValue={days.includes(today) ? today : week}>
              {days.map((d) => <option key={d} value={d}>{dayLabel(d, intl)}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">{t("sched.starts")}
              <input type="time" name="starts" required step={900} className="input mt-1" />
            </label>
            <label className="block text-sm">{t("sched.ends")}
              <input type="time" name="ends" required step={900} className="input mt-1" />
            </label>
          </div>
          <label className="block text-sm">{t("sched.note")}
            <input name="note" maxLength={100} dir="auto" placeholder={t("sched.notePlaceholder")} className="input mt-1" />
          </label>
          <button className="btn">{t("sched.addButton")}</button>
        </form>
      </section>

      <form action={copyLastWeek} className="mb-6">
        {hidden}
        <button className="btn-ghost">{t("sched.copy")}</button>
        <p className="muted mt-1 text-sm">{t("sched.copyHint")}</p>
      </form>

      <div className="space-y-4">
        {days.map((d) => {
          const list = shifts.filter((s) => s.day === d);
          const out = offOn(d);
          const outIds = new Set(out.map((r) => r.user_id));
          return (
            <section key={d} className="card" style={d === today ? { borderColor: "var(--charcoal)", borderWidth: 3 } : undefined}>
              <h2 className="mb-1 font-semibold">{dayLabel(d, intl)}{d === today && ` · ${t("sched.today")}`}</h2>
              {list.length ? (
                <ul>
                  {list.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-center gap-2 border-t-2 border-dashed py-2" style={{ borderColor: "var(--soft-line)" }}>
                      <span className="font-semibold">{nameOf(s.user_id)}</span>
                      <span>{shiftLabel(s, intl)}</span>
                      <span className="muted text-sm">{t("sched.hours", { count: shiftHours(s) })}</span>
                      {s.note && <span className="muted text-sm" dir="auto">· {s.note}</span>}
                      {outIds.has(s.user_id) && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">⚠️ {t("sched.isOff")}</span>}
                      {clash.has(s.id) && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">⚠️ {t("sched.overlap")}</span>}
                      <form action={deleteShift} className="ms-auto">
                        {hidden}
                        <input type="hidden" name="id" value={s.id} />
                        <button className="btn-ghost text-sm" aria-label={t("sched.remove")}>✕</button>
                      </form>
                    </li>
                  ))}
                </ul>
              ) : <p className="muted text-sm">{t("sched.noShifts")}</p>}
              {out.length > 0 && <p className="muted mt-1 text-sm">🌴 {t("sched.off", { names: [...new Set(out.map((r) => nameOf(r.user_id)))].join(", ") })}</p>}
            </section>
          );
        })}
      </div>

      {hours.length > 0 && (
        <section className="card mt-6">
          <h2 className="mb-2 font-semibold">{t("sched.weekHours")}</h2>
          <ul className="space-y-1">
            {hours.map(([id, h]) => (
              <li key={id} className="flex flex-wrap items-center gap-2">
                <span>{nameOf(id)}</span>
                <span className="font-semibold">{t("sched.hours", { count: h })}</span>
                {h > settings.overtime_hours && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">⚠️ {t("sched.overtime", { hours: settings.overtime_hours })}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

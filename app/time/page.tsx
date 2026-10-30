import { Flash, Header } from "@/components/ui";
import { getSession, type Punch } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import { addDays, dayLabel, hours, timeLabel, todayIn, weekStart, weekTotals, type DayRow } from "@/lib/time";
import { ClockForm } from "@/components/ClockButton";
import { clockIn, clockOut } from "../actions";

type Props = { searchParams: Promise<{ error?: string; ok?: string }> };

export const dynamic = "force-dynamic";

export default async function TimePage({ searchParams }: Props) {
  const { error, ok } = await searchParams;
  const { supabase, profile, settings } = await getSession();
  const { t, intl } = await getT();
  const tz = settings.timezone;
  const today = todayIn(tz);
  const thisWeek = weekStart(today, settings.week_starts_on);
  const lastWeek = addDays(thisWeek, -7);

  const [{ data: punches }, { data: days }] = await Promise.all([
    supabase.from("punches").select("*").eq("user_id", profile.id)
      .order("clock_in", { ascending: false }).limit(20).returns<Punch[]>(),
    supabase.rpc("timesheet", { p_from: lastWeek, p_to: addDays(thisWeek, 6) }),
  ]);
  const open = punches?.find((p) => !p.clock_out);
  const weeks = weekTotals(((days ?? []) as DayRow[]).filter((d) => d.user_id === profile.id),
    settings.week_starts_on, settings.overtime_hours);
  const week = (start: string) => weeks.find((w) => w.week === start);
  const clockLabels = { pending: t("time.gettingLocation"), note: t("common.noteOptional"), locationNote: t("time.locationNote") };

  return (
    <>
      <Header profile={profile} settings={settings} />
      <Flash error={error} ok={ok} />

      {!profile.active ? (
        <div className="card">
          <h2 className="text-lg font-semibold">{t("time.waitingTitle")}</h2>
          <p className="muted mt-1">{t("time.waitingBody")}</p>
        </div>
      ) : (
        <div className="card mb-6 text-center">
          {open ? (
            <>
              <p className="text-sm uppercase tracking-wide text-green-600">{t("time.onClock")}</p>
              <p className="mt-1 text-lg">{t("time.since", { time: timeLabel(open.clock_in, tz, intl) })}</p>
              <ClockForm action={clockOut} label={t("time.clockOut")} labels={clockLabels} className="btn btn-stop w-full py-4 text-2xl" />
            </>
          ) : (
            <>
              <p className="muted text-sm uppercase tracking-wide">{t("time.offClock")}</p>
              <ClockForm action={clockIn} label={t("time.clockIn")} labels={clockLabels} className="btn btn-go w-full py-4 text-2xl" />
            </>
          )}
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        {[[t("time.thisWeek"), thisWeek], [t("time.lastWeek"), lastWeek]].map(([label, start]) => {
          const w = week(start);
          return (
            <div key={start} className="card">
              <p className="muted text-sm">{label} · {dayLabel(start, intl)} – {dayLabel(addDays(start, 6), intl)}</p>
              <p className="mt-1 text-3xl font-semibold">{hours(w?.seconds ?? 0)} {t("common.hoursShort")}</p>
              {!!w?.overtime && <p className="text-sm text-amber-600">{t("time.overtime", { hours: hours(w.overtime) })}</p>}
            </div>
          );
        })}
      </div>

      <div className="card overflow-x-auto">
        <h2 className="mb-2 font-semibold">{t("time.recent")}</h2>
        <table className="tbl">
          <thead><tr><th>{t("common.in")}</th><th>{t("common.out")}</th><th>{t("common.hours")}</th><th>{t("common.note")}</th></tr></thead>
          <tbody>
            {(punches ?? []).map((p) => (
              <tr key={p.id}>
                <td>{timeLabel(p.clock_in, tz, intl)}</td>
                <td>{p.clock_out ? timeLabel(p.clock_out, tz, intl) : <span className="text-green-600">{t("common.open")}</span>}</td>
                <td>{p.clock_out ? hours((Date.parse(p.clock_out) - Date.parse(p.clock_in)) / 1000) : "–"}</td>
                <td className="muted">{p.note}</td>
              </tr>
            ))}
            {!punches?.length && <tr><td colSpan={4} className="muted">{t("time.noPunches")}</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

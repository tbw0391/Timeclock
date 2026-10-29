import { Flash, Header } from "@/components/ui";
import { getSession, type Punch } from "@/lib/session";
import { addDays, dayLabel, hours, timeLabel, todayIn, weekStart, weekTotals, type DayRow } from "@/lib/time";
import { ClockForm } from "@/components/ClockButton";
import { clockIn, clockOut } from "./actions";

type Props = { searchParams: Promise<{ error?: string; ok?: string }> };

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: Props) {
  const { error, ok } = await searchParams;
  const { supabase, profile, settings } = await getSession();
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

  return (
    <>
      <Header profile={profile} settings={settings} />
      <Flash error={error} ok={ok} />

      {!profile.active ? (
        <div className="card">
          <h2 className="text-lg font-semibold">Waiting for approval</h2>
          <p className="muted mt-1">A manager needs to approve your account before you can clock in.</p>
        </div>
      ) : (
        <div className="card mb-6 text-center">
          {open ? (
            <>
              <p className="text-sm uppercase tracking-wide text-green-600">On the clock</p>
              <p className="mt-1 text-lg">since {timeLabel(open.clock_in, tz)}</p>
              <ClockForm action={clockOut} label="Clock out" className="btn w-full bg-red-600! py-4 text-xl" />
            </>
          ) : (
            <>
              <p className="muted text-sm uppercase tracking-wide">Off the clock</p>
              <ClockForm action={clockIn} label="Clock in" className="btn w-full bg-green-600! py-4 text-xl" />
            </>
          )}
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        {[["This week", thisWeek], ["Last week", lastWeek]].map(([label, start]) => {
          const w = week(start);
          return (
            <div key={start} className="card">
              <p className="muted text-sm">{label} · {dayLabel(start)} – {dayLabel(addDays(start, 6))}</p>
              <p className="mt-1 text-3xl font-semibold">{hours(w?.seconds ?? 0)} h</p>
              {!!w?.overtime && <p className="text-sm text-amber-600">{hours(w.overtime)} h overtime</p>}
            </div>
          );
        })}
      </div>

      <div className="card overflow-x-auto">
        <h2 className="mb-2 font-semibold">Recent punches</h2>
        <table className="tbl">
          <thead><tr><th>In</th><th>Out</th><th>Hours</th><th>Note</th></tr></thead>
          <tbody>
            {(punches ?? []).map((p) => (
              <tr key={p.id}>
                <td>{timeLabel(p.clock_in, tz)}</td>
                <td>{p.clock_out ? timeLabel(p.clock_out, tz) : <span className="text-green-600">open</span>}</td>
                <td>{p.clock_out ? hours((Date.parse(p.clock_out) - Date.parse(p.clock_in)) / 1000) : "–"}</td>
                <td className="muted">{p.note}</td>
              </tr>
            ))}
            {!punches?.length && <tr><td colSpan={4} className="muted">No punches yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

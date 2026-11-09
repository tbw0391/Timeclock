import { Header } from "@/components/ui";
import { WeekNav } from "@/components/schedule";
import { getSession, type Profile } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import { dayLabel, todayIn, weekStart } from "@/lib/time";
import { byStart, hoursByPerson, pickWeek, shiftLabel, weekDays, type Shift } from "@/lib/schedule";

type Props = { searchParams: Promise<{ week?: string }> };

export const dynamic = "force-dynamic";

// Your shifts for the week, then who's working each day.
export default async function SchedulePage({ searchParams }: Props) {
  const { week: weekParam } = await searchParams;
  const { supabase, profile, settings } = await getSession();
  const { t, intl } = await getT();
  const today = todayIn(settings.timezone);
  const thisWeek = weekStart(today, settings.week_starts_on);
  const week = pickWeek(weekParam, today, settings.week_starts_on);
  const days = weekDays(week);
  const [{ data: rows }, { data: people }] = await Promise.all([
    supabase.from("shifts").select("id, user_id, day, starts, ends, note").gte("day", week).lte("day", days[6]).returns<Shift[]>(),
    supabase.from("profiles").select("id, full_name, phone").returns<Profile[]>(),
  ]);
  const shifts = (rows ?? []).sort(byStart);
  const nameOf = (id: string) => { const p = (people ?? []).find((x) => x.id === id); return p?.full_name || p?.phone || "—"; };
  const mine = shifts.filter((s) => s.user_id === profile.id);
  const myHours = hoursByPerson(mine).get(profile.id) ?? 0;

  return (
    <>
      <Header profile={profile} settings={settings} />
      <h1 className="mb-4 text-2xl font-bold">{t("sched.title")}</h1>
      <WeekNav base="/schedule" week={week} thisWeek={thisWeek} t={t} intl={intl} />
      <section className="card mb-6">
        <h2 className="mb-1 font-semibold">{t("sched.mine")}</h2>
        {mine.length ? (
          <>
            <ul>
              {mine.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-2 border-t-2 border-dashed py-2" style={{ borderColor: "var(--soft-line)" }}>
                  <span className="font-semibold">{dayLabel(s.day, intl)}{s.day === today && ` · ${t("sched.today")}`}</span>
                  <span>{shiftLabel(s, intl)}</span>
                  {s.note && <span className="muted text-sm" dir="auto">· {s.note}</span>}
                </li>
              ))}
            </ul>
            <p className="muted mt-1 text-sm">{t("sched.myTotal", { count: myHours })}</p>
          </>
        ) : <p className="muted text-sm">{t("sched.noneMine")}</p>}
      </section>
      <h2 className="muted mb-2 text-sm font-semibold uppercase tracking-wide">{t("sched.everyone")}</h2>
      <div className="space-y-4">
        {days.map((d) => {
          const list = shifts.filter((s) => s.day === d);
          return (
            <section key={d} className="card" style={d === today ? { borderColor: "var(--charcoal)", borderWidth: 3 } : undefined}>
              <h3 className="mb-1 font-semibold">{dayLabel(d, intl)}{d === today && ` · ${t("sched.today")}`}</h3>
              {list.length ? (
                <ul className="space-y-1">
                  {list.map((s) => (
                    <li key={s.id} className={`flex flex-wrap gap-2 ${s.user_id === profile.id ? "font-semibold" : ""}`}>
                      <span>{nameOf(s.user_id)}</span>
                      <span>{shiftLabel(s, intl)}</span>
                      {s.note && <span className="muted text-sm" dir="auto">· {s.note}</span>}
                    </li>
                  ))}
                </ul>
              ) : <p className="muted text-sm">{t("sched.noShifts")}</p>}
            </section>
          );
        })}
      </div>
    </>
  );
}

import { ChildButton } from "@/components/ChildButton";
import { Flash, Header } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import { getSession } from "@/lib/session";
import { addDays, localInput, todayIn } from "@/lib/time";
import { toggleChild } from "./actions";

type Props = { searchParams: Promise<{ error?: string; ok?: string }> };
type Child = { id: string; display_name: string };
type Visit = { child_id: string; checked_in_at: string; checked_out_at: string | null };

export const dynamic = "force-dynamic";

const COLORS = ["var(--peach)", "var(--lavender)", "var(--mint)", "var(--sky)"];

// Teachers' check-in list: one button per child. A child is "here" while they
// have an open visit; otherwise the tile shows when they left today, if they did.
export default async function ChildrenPage({ searchParams }: Props) {
  const { error, ok } = await searchParams;
  const { supabase, profile, settings } = await getSession();
  const { t, intl } = await getT();
  const tz = settings.timezone;
  const today = todayIn(tz);
  const [{ data: children }, { data: visits }] = await Promise.all([
    supabase.from("children").select("id, display_name").eq("active", true).order("sort_order").order("display_name").returns<Child[]>(),
    // Padded a day for time zones; open visits are always included.
    supabase.from("child_attendance").select("child_id, checked_in_at, checked_out_at")
      .or(`checked_out_at.is.null,checked_in_at.gte.${addDays(today, -1)}T00:00:00Z`)
      .order("checked_in_at", { ascending: false }).returns<Visit[]>(),
  ]);

  const time = (iso: string) => {
    const sameDay = localInput(iso, tz).slice(0, 10) === today;
    return new Date(iso).toLocaleString(intl, sameDay
      ? { timeZone: tz, hour: "numeric", minute: "2-digit" }
      : { timeZone: tz, weekday: "short", hour: "numeric", minute: "2-digit" });
  };
  // Newest visit per child (the list is newest first).
  const latest = new Map<string, Visit>();
  for (const v of visits ?? []) if (!latest.has(v.child_id)) latest.set(v.child_id, v);
  const list = children ?? [];
  const hereCount = list.filter((c) => latest.get(c.id) && !latest.get(c.id)!.checked_out_at).length;

  return (
    <>
      <Header profile={profile} settings={settings} />
      <Flash error={error} ok={ok} />
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-bold">{t("kids.title")}</h1>
        <p className="text-lg font-semibold">{t("kids.here", { here: hereCount, total: list.length })}</p>
      </div>
      <p className="muted mb-4 text-sm">{t("kids.hint")}</p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {list.map((c, i) => {
          const v = latest.get(c.id);
          const here = !!v && !v.checked_out_at;
          const leftToday = !!v?.checked_out_at && localInput(v.checked_out_at, tz).slice(0, 10) === today;
          const status = here ? t("kids.inAt", { time: time(v!.checked_in_at) })
            : leftToday ? t("kids.leftAt", { time: time(v!.checked_out_at!) })
            : t("kids.notYet");
          return (
            <form key={c.id} action={toggleChild}>
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="name" value={c.display_name} />
              <input type="hidden" name="tz" value={tz} />
              <ChildButton name={c.display_name} status={status} here={here} color={COLORS[i % COLORS.length]} />
            </form>
          );
        })}
        {!list.length && <p className="muted col-span-full">{t("kids.none")}</p>}
      </div>
    </>
  );
}

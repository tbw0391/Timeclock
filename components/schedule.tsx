import Link from "next/link";
import type { T } from "@/lib/i18n/messages";
import { addDays, dateLabel } from "@/lib/time";

// ← Previous week · This week · Next week →, for /schedule and /admin/schedule.
export function WeekNav({ base, week, thisWeek, t, intl }: { base: string; week: string; thisWeek: string; t: T; intl: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <Link href={`${base}?week=${addDays(week, -7)}`} className="btn-ghost">{t("sched.prev")}</Link>
      {week !== thisWeek && <Link href={base} className="btn-ghost">{t("sched.thisWeek")}</Link>}
      <Link href={`${base}?week=${addDays(week, 7)}`} className="btn-ghost">{t("sched.next")}</Link>
      <span className="font-semibold">{t("sched.weekOf", { date: dateLabel(week, intl) })}</span>
    </div>
  );
}

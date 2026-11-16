// Dates are "YYYY-MM-DD" strings in the business time zone; all day math is
// done in UTC on those strings so the server's own zone never matters.

export function todayIn(tz: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function weekStart(date: string, startsOn: number): string {
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
  return addDays(date, -((dow - startsOn + 7) % 7));
}

export function isDate(s: string | undefined | null): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
}

export function hours(seconds: number): string {
  return (seconds / 3600).toFixed(2);
}

// intl is a BCP 47 locale (see intlLocale); English when not given.
export function dayLabel(date: string, intl = "en-US"): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(intl, {
    timeZone: "UTC", weekday: "short", month: "numeric", day: "numeric",
  });
}

export function timeLabel(iso: string, tz: string, intl = "en-US"): string {
  return new Date(iso).toLocaleString(intl, {
    timeZone: tz, weekday: "short", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

// Value for <input type="datetime-local">, in the business time zone.
export function localInput(iso: string | null, tz: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("sv-SE", { timeZone: tz }).slice(0, 16).replace(" ", "T");
}

export type DayRow = { user_id: string; full_name: string; phone: string | null; work_date: string; seconds: number };

export type WeekTotal = {
  user_id: string;
  name: string;
  week: string;
  days: Record<string, number>;
  seconds: number;
  overtime: number;
};

// Roll per-day rows into per-person, per-week totals with overtime past the
// weekly threshold. People in `unpaid` (volunteers) never get overtime.
export function weekTotals(rows: DayRow[], startsOn: number, overtimeHours: number, unpaid: Set<string> = new Set()): WeekTotal[] {
  const map = new Map<string, WeekTotal>();
  for (const r of rows) {
    const week = weekStart(r.work_date, startsOn);
    const key = `${r.user_id}|${week}`;
    let t = map.get(key);
    if (!t) {
      t = { user_id: r.user_id, name: r.full_name || r.phone || "?", week, days: {}, seconds: 0, overtime: 0 };
      map.set(key, t);
    }
    const s = Number(r.seconds);
    t.days[r.work_date] = (t.days[r.work_date] ?? 0) + s;
    t.seconds += s;
  }
  const limit = overtimeHours * 3600;
  return [...map.values()]
    .map((t) => ({ ...t, overtime: unpaid.has(t.user_id) ? 0 : Math.max(0, t.seconds - limit) }))
    .sort((a, b) => a.week.localeCompare(b.week) || a.name.localeCompare(b.name));
}

export function csvCell(v: string | number): string {
  let s = String(v);
  // Keep spreadsheet apps from running a note like "=HYPERLINK(...)" as a formula.
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// "Dec 1, 2026": a calendar day (expiry dates, last days) in the reader's language.
export function dateLabel(date: string, intl = "en-US"): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(intl, { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" });
}

export type PersonTotal = { user_id: string; name: string; seconds: number; days: number };

// Hours per person over the whole range (e.g. volunteer hours for a report).
export function personTotals(weeks: WeekTotal[]): PersonTotal[] {
  const map = new Map<string, PersonTotal>();
  for (const w of weeks) {
    const p = map.get(w.user_id) ?? { user_id: w.user_id, name: w.name, seconds: 0, days: 0 };
    p.seconds += w.seconds;
    p.days += Object.values(w.days).filter((s) => s > 0).length;
    map.set(w.user_id, p);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

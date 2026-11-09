import { addDays, isDate, weekStart } from "./time";

// Times come back from Postgres as "HH:MM:SS", wall-clock in the business zone.
export type Shift = { id: number; user_id: string; day: string; starts: string; ends: string; note: string };

// The week to show: the one holding ?week=, or this week.
export function pickWeek(param: string | undefined, today: string, startsOn: number): string {
  return weekStart(isDate(param) ? param : today, startsOn);
}

export const weekDays = (start: string) => Array.from({ length: 7 }, (_, i) => addDays(start, i));

const minutes = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

export const shiftHours = (s: Pick<Shift, "starts" | "ends">) => (minutes(s.ends) - minutes(s.starts)) / 60;

// "8:00 AM" in the reader's language.
export function clockLabel(t: string, intl = "en-US"): string {
  return new Date(`1970-01-01T${t.slice(0, 5)}:00Z`).toLocaleTimeString(intl, { timeZone: "UTC", hour: "numeric", minute: "2-digit" });
}

export const shiftLabel = (s: Pick<Shift, "starts" | "ends">, intl = "en-US") => `${clockLabel(s.starts, intl)} – ${clockLabel(s.ends, intl)}`;

export const byStart = (a: Shift, b: Shift) => a.day.localeCompare(b.day) || a.starts.localeCompare(b.starts) || a.ends.localeCompare(b.ends);

// Planned hours per person for the shifts given.
export function hoursByPerson(shifts: Shift[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const s of shifts) m.set(s.user_id, (m.get(s.user_id) ?? 0) + shiftHours(s));
  return m;
}

// Two shifts for the same person on the same day that overlap in time.
export function clashes(shifts: Shift[]): Set<number> {
  const out = new Set<number>();
  for (const a of shifts) for (const b of shifts) {
    if (a.id < b.id && a.user_id === b.user_id && a.day === b.day && a.starts < b.ends && b.starts < a.ends) { out.add(a.id); out.add(b.id); }
  }
  return out;
}

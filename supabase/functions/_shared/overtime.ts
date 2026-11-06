// Splits each shift into regular and overtime minutes, with overtime counted
// by the pay week: shifts are taken in order, and minutes past the weekly
// limit are overtime. Plain TypeScript so both the edge functions and the
// app's tests (tests/overtime.test.ts) use it.

export type Shift = { id: string; user: string; start: string; end: string };
export type Split = { regular: number; overtime: number };

// YYYY-MM-DD in the business time zone.
export const localDate = (iso: string, tz: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: tz });

// First day of the pay week holding date (0 = Sunday).
export function weekOf(date: string, startsOn: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() - startsOn + 7) % 7));
  return d.toISOString().slice(0, 10);
}

export const shiftMinutes = (s: { start: string; end: string }) =>
  Math.round((Date.parse(s.end) - Date.parse(s.start)) / 60000);

export function splitShifts(shifts: Shift[], tz: string, startsOn: number, overtimeHours: number) {
  const limit = Math.round(overtimeHours * 60);
  const used = new Map<string, number>();
  const out = new Map<string, Split>();
  for (const s of [...shifts].sort((a, b) => a.start.localeCompare(b.start))) {
    const key = `${s.user}|${weekOf(localDate(s.start, tz), startsOn)}`;
    const before = used.get(key) ?? 0;
    const mins = Math.max(0, shiftMinutes(s));
    const regular = Math.max(0, Math.min(mins, limit - before));
    out.set(s.id, { regular, overtime: mins - regular });
    used.set(key, before + mins);
  }
  return out;
}

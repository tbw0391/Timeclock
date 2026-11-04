import { hours, type WeekTotal } from "./time";

// Gusto's "Import hours" file (Run payroll → Import hours): one row per person
// with regular and overtime hours for the pay period, overtime worked out week
// by week. Copied from the estimator app's payroll export.
export const GUSTO_HEADER = ["first_name", "last_name", "regular_hours", "overtime_hours"];

// Last word is the last name; one-word names go in first_name.
export function splitName(name: string): [string, string] {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? [parts.slice(0, -1).join(" "), parts.at(-1)!] : [parts[0] ?? "", ""];
}

export function gustoRows(weeks: WeekTotal[]): string[][] {
  const people = new Map<string, { name: string; seconds: number; overtime: number }>();
  for (const w of weeks) {
    const p = people.get(w.user_id) ?? { name: w.name, seconds: 0, overtime: 0 };
    p.seconds += w.seconds;
    p.overtime += w.overtime;
    people.set(w.user_id, p);
  }
  return [...people.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((p) => [...splitName(p.name), hours(p.seconds - p.overtime), hours(p.overtime)]);
}

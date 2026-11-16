import { describe, expect, it } from "vitest";
import { gustoRows, splitName } from "@/lib/gusto";
import { personTotals, weekTotals } from "@/lib/time";

describe("Gusto hours file", () => {
  it("splits names on the last word", () => {
    expect(splitName("Mary Ann Smith")).toEqual(["Mary Ann", "Smith"]);
    expect(splitName("Cher")).toEqual(["Cher", ""]);
  });

  it("adds up a two-week period with overtime counted week by week", () => {
    // Week 1: 45 h (5 over). Week 2: 30 h. Not 75 - 40 = 35 over.
    const day = (d: string, h: number) => ({ user_id: "u1", full_name: "Pat Lee", phone: "6145550100", work_date: d, seconds: h * 3600 });
    const rows = [
      ...["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"].map((d) => day(d, 9)),
      ...["2026-11-02", "2026-11-03", "2026-11-04"].map((d) => day(d, 10)),
    ];
    expect(gustoRows(weekTotals(rows, 1, 40))).toEqual([["Pat", "Lee", "70.00", "5.00"]]);
  });

  it("gives volunteers no overtime and totals their hours for the range", () => {
    const day = (u: string, d: string, h: number) => ({ user_id: u, full_name: u === "v1" ? "Sam Helper" : "Pat Lee", phone: null, work_date: d, seconds: h * 3600 });
    const rows = [
      ...["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06"].map((d) => day("v1", d, 9)),
      day("v1", "2026-11-10", 3),
      day("u1", "2026-11-02", 8),
    ];
    const weeks = weekTotals(rows, 1, 40, new Set(["v1"]));
    expect(weeks.filter((w) => w.user_id === "v1").every((w) => w.overtime === 0)).toBe(true);
    expect(personTotals(weeks.filter((w) => w.user_id === "v1"))).toEqual([{ user_id: "v1", name: "Sam Helper", seconds: 48 * 3600, days: 6 }]);
  });
});

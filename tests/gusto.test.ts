import { describe, expect, it } from "vitest";
import { gustoRows, splitName } from "@/lib/gusto";
import { weekTotals } from "@/lib/time";

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
});

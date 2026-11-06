import { describe, expect, it } from "vitest";
import { splitShifts, weekOf } from "../supabase/functions/_shared/overtime";

const tz = "America/New_York";
// 9-hour shifts starting 8 AM New York (12:00 UTC in late October).
const shift = (id: string, date: string, user = "u1") => ({ id, user, start: `${date}T12:00:00Z`, end: `${date}T21:00:00Z` });

describe("overtime split for Gusto", () => {
  it("finds the start of the pay week", () => {
    expect(weekOf("2026-10-29", 0)).toBe("2026-10-25");
    expect(weekOf("2026-10-29", 1)).toBe("2026-10-26");
  });

  it("puts minutes past 40 hours in a week into overtime, in shift order", () => {
    const days = ["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"];
    // Given out of order on purpose.
    const split = splitShifts(days.map((d, i) => shift(`s${i}`, d)).reverse(), tz, 1, 40);
    expect(split.get("s3")).toEqual({ regular: 540, overtime: 0 }); // 36 h after Thursday
    expect(split.get("s4")).toEqual({ regular: 240, overtime: 300 }); // Friday: 4 h regular, 5 h over
  });

  it("starts over each week and keeps people apart", () => {
    const split = splitShifts([
      ...["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"].map((d, i) => shift(`a${i}`, d)),
      shift("next", "2026-11-02"),
      shift("other", "2026-10-30", "u2"),
    ], tz, 1, 40);
    expect(split.get("next")).toEqual({ regular: 540, overtime: 0 });
    expect(split.get("other")).toEqual({ regular: 540, overtime: 0 });
  });
});

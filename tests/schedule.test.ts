import { describe, expect, it } from "vitest";
import { clashes, clockLabel, hoursByPerson, pickWeek, shiftHours, weekDays, type Shift } from "@/lib/schedule";

const s = (id: number, user_id: string, day: string, starts: string, ends: string): Shift => ({ id, user_id, day, starts, ends, note: "" });

describe("schedule", () => {
  it("picks the week holding the date asked for, or this week", () => {
    // 2026-11-08 is a Sunday; weeks start Sunday (0) or Monday (1).
    expect(pickWeek("2026-11-11", "2026-11-08", 0)).toBe("2026-11-08");
    expect(pickWeek("2026-11-11", "2026-11-08", 1)).toBe("2026-11-09");
    expect(pickWeek("junk", "2026-11-08", 1)).toBe("2026-11-02");
    expect(weekDays("2026-11-29")).toEqual(["2026-11-29", "2026-11-30", "2026-12-01", "2026-12-02", "2026-12-03", "2026-12-04", "2026-12-05"]);
  });

  it("counts hours and labels times", () => {
    expect(shiftHours({ starts: "07:30:00", ends: "15:45:00" })).toBe(8.25);
    expect(clockLabel("13:05:00", "en-US")).toBe("1:05 PM");
    const h = hoursByPerson([s(1, "a", "2026-11-09", "08:00:00", "12:00:00"), s(2, "a", "2026-11-10", "08:00:00", "16:00:00"), s(3, "b", "2026-11-09", "09:00:00", "10:00:00")]);
    expect(h.get("a")).toBe(12);
    expect(h.get("b")).toBe(1);
  });

  it("finds overlapping shifts for the same person and day only", () => {
    const list = [
      s(1, "a", "2026-11-09", "08:00:00", "12:00:00"),
      s(2, "a", "2026-11-09", "11:00:00", "15:00:00"),
      s(3, "a", "2026-11-09", "15:00:00", "17:00:00"), // starts as #2 ends: fine
      s(4, "b", "2026-11-09", "08:00:00", "12:00:00"),
      s(5, "a", "2026-11-10", "08:00:00", "12:00:00"),
    ];
    expect([...clashes(list)].sort()).toEqual([1, 2]);
  });
});

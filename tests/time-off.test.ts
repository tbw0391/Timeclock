import { describe, expect, it } from "vitest";
import { dayCount, overlaps, rangeLabel, type TimeOff } from "@/lib/time-off";

describe("time off", () => {
  it("counts days, both ends included, across a month", () => {
    expect(dayCount("2026-11-07", "2026-11-07")).toBe(1);
    expect(dayCount("2026-11-30", "2026-12-02")).toBe(3);
  });

  it("labels one day or a range", () => {
    expect(rangeLabel("2026-11-23", "2026-11-23", "en-US")).toBe("Nov 23, 2026");
    expect(rangeLabel("2026-11-23", "2026-11-27", "en-US")).toBe("Nov 23, 2026 – Nov 27, 2026");
  });

  it("finds approved time off touching a window", () => {
    const r = (status: TimeOff["status"]): TimeOff => ({ id: 1, user_id: "u", starts_on: "2026-11-23", ends_on: "2026-11-27", kind: "vacation", note: "", status, decision_note: "", created_at: "" });
    expect(overlaps(r("approved"), "2026-11-27", "2026-12-10")).toBe(true);
    expect(overlaps(r("approved"), "2026-11-28", "2026-12-10")).toBe(false);
    expect(overlaps(r("pending"), "2026-11-20", "2026-12-10")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { cleanEvents, eventDate, eventStrings } from "@/lib/site/events";

describe("website events", () => {
  it("keeps well-formed events, soonest first", () => {
    const out = cleanEvents([
      { date: "2026-12-05", title: " Winter party ", details: " " },
      { date: "2026-11-20", title: "Community Day", details: "Kites and food, 2-5 PM" },
      { date: "Nov 3", title: "Bad date" },
      { date: "2026-11-21", title: "" },
      null,
    ]);
    expect(out).toEqual([
      { date: "2026-11-20", title: "Community Day", details: "Kites and food, 2-5 PM" },
      { date: "2026-12-05", title: "Winter party" },
    ]);
    expect(eventStrings(out)).toEqual(["Community Day", "Kites and food, 2-5 PM", "Winter party"]);
    expect(cleanEvents("nope")).toEqual([]);
  });

  it("shows the calendar day, not one shifted by time zone", () => {
    expect(eventDate("2026-11-20", "en-US")).toBe("Friday, November 20, 2026");
  });
});

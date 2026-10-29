import { describe, expect, it } from "vitest";
import { addDays, csvCell, localInput, todayIn, weekStart, weekTotals } from "@/lib/time";

describe("time helpers", () => {
  it("finds today in the business zone, not UTC", () => {
    // 02:30 UTC on Oct 29 is still Oct 28 in New York.
    expect(todayIn("America/New_York", new Date("2026-10-29T02:30:00Z"))).toBe("2026-10-28");
  });

  it("walks back to the start of the pay week", () => {
    expect(weekStart("2026-10-29", 0)).toBe("2026-10-25"); // Thu -> Sun
    expect(weekStart("2026-10-29", 1)).toBe("2026-10-26"); // Thu -> Mon
    expect(weekStart("2026-10-25", 0)).toBe("2026-10-25");
  });

  it("adds days across a month end", () => {
    expect(addDays("2026-10-30", 3)).toBe("2026-11-02");
  });

  it("formats datetime-local values in the business zone", () => {
    expect(localInput("2026-10-29T12:05:00Z", "America/New_York")).toBe("2026-10-29T08:05");
  });

  it("splits overtime past the weekly limit", () => {
    const rows = ["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"].map((d) => ({
      user_id: "u1", full_name: "Pat", phone: "6145550100", work_date: d, seconds: 9 * 3600,
    }));
    const [w] = weekTotals(rows, 0, 40);
    expect(w.week).toBe("2026-10-25");
    expect(w.seconds).toBe(45 * 3600);
    expect(w.overtime).toBe(5 * 3600);
  });

  it("defuses spreadsheet formulas in CSV", () => {
    expect(csvCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(csvCell('say "hi", ok')).toBe('"say ""hi"", ok"');
    expect(csvCell(-3)).toBe("-3");
  });
});

import { e164, formatPhone, isCode, normalizePhone } from "@/lib/phone";

describe("phone helpers", () => {
  it("normalizes US numbers however they're typed", () => {
    expect(normalizePhone("(614) 555-0100")).toBe("6145550100");
    expect(normalizePhone("+1 614.555.0100")).toBe("6145550100");
    expect(normalizePhone("555-0100")).toBeNull();
  });
  it("formats a number for Supabase and for display", () => {
    expect(e164("6145550100")).toBe("+16145550100");
    expect(formatPhone("6145550100")).toBe("(614) 555-0100");
  });
  it("accepts texted codes", () => {
    expect(isCode("123456")).toBe(true);
    expect(isCode("12345")).toBe(false);
    expect(isCode("12345a")).toBe(false);
  });
});

import { gpsProblem, gpsText, mapUrl } from "@/lib/gps";

describe("gps tags", () => {
  it("describes a fix, a refusal, and a manual time", () => {
    expect(gpsText({ gps: "ok", lat: 39.9612, lng: -82.9988, accuracy: 12.4 })).toBe("39.96120, -82.99880 (±12 m)");
    expect(gpsText({ gps: "denied", lat: null, lng: null, accuracy: null })).toBe("Location blocked");
    expect(gpsText({ gps: null, lat: null, lng: null, accuracy: null })).toBe("");
  });
  it("flags only punches the phone couldn't tag", () => {
    expect(gpsProblem({ gps: "timeout", lat: null, lng: null, accuracy: null })).toBe(true);
    expect(gpsProblem({ gps: null, lat: null, lng: null, accuracy: null })).toBe(false);
    expect(mapUrl(39.9612, -82.9988)).toBe("https://www.google.com/maps?q=39.9612,-82.9988");
  });
});

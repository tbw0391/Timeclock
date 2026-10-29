import { describe, expect, it } from "vitest";
import { displayName, formatPhone, isPin, normalizePhone, phoneEmail } from "@/lib/phone";

describe("phone helpers", () => {
  it("normalizes the ways people type a number", () => {
    expect(normalizePhone("614-598-8991")).toBe("6145988991");
    expect(normalizePhone("(614) 598 8991")).toBe("6145988991");
    expect(normalizePhone("+1 614 598 8991")).toBe("6145988991");
    expect(normalizePhone("598-8991")).toBeNull();
    expect(normalizePhone("26145988991")).toBeNull();
  });

  it("builds the placeholder sign-in address", () => {
    expect(phoneEmail("6145988991")).toBe("6145988991@phone.timeclock.app");
  });

  it("formats for display", () => {
    expect(formatPhone("6145988991")).toBe("(614) 598-8991");
    expect(formatPhone(null)).toBe("");
  });

  it("matches the database PIN rule (6+ digits)", () => {
    expect(isPin("123456")).toBe(true);
    expect(isPin("12345")).toBe(false);
    expect(isPin("12345a")).toBe(false);
  });

  it("falls back to the phone when there is no name", () => {
    expect(displayName({ full_name: "", phone: "6145988991" })).toBe("(614) 598-8991");
    expect(displayName({ full_name: "Lori", phone: "6145988991" })).toBe("Lori");
  });
});

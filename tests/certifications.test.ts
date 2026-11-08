import { describe, expect, it } from "vitest";
import { byUrgency, certStatus, type Cert } from "@/lib/certifications";

describe("certifications", () => {
  it("knows what's expired, due soon, fine, or never expires", () => {
    const today = "2026-11-07";
    expect(certStatus("2026-11-06", today)).toBe("expired");
    expect(certStatus("2026-11-07", today)).toBe("soon"); // good through today
    expect(certStatus("2027-01-06", today)).toBe("soon"); // 60 days out
    expect(certStatus("2027-01-07", today)).toBe("ok");
    expect(certStatus(null, today)).toBe("never");
  });

  it("puts the most urgent first", () => {
    const c = (kind: string, expires_on: string | null): Cert => ({ id: 0, user_id: "u", kind, expires_on, note: "" });
    const list = [c("Food Handler", null), c("CPR", "2027-03-01"), c("First Aid", "2026-10-01")].sort(byUrgency);
    expect(list.map((x) => x.kind)).toEqual(["First Aid", "CPR", "Food Handler"]);
  });
});

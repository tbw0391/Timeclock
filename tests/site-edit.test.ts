import { describe, expect, it } from "vitest";
import { CONTACT, pageFor } from "@/lib/site/content";
import { contactFrom, contactWithEdits, sectionsFrom, withEdits } from "@/lib/site/edit";

const form = (fields: Record<string, string>) => (name: string) => fields[name] ?? null;

describe("website page editor", () => {
  const preschool = pageFor("preschool")!;

  it("changes prices and calendar dates, one per line, and keeps the photos", () => {
    const out = sectionsFrom(form({
      "s1.items": "3 days per week: $280/month\r\n\r\n  4 days per week: $360/month  \n",
      "s1.note": "",
      "s0.body": "New words.",
    }), preschool.sections);
    expect(out[1]).toMatchObject({ kind: "list", title: "Half Day Preschool", items: ["3 days per week: $280/month", "4 days per week: $360/month"], note: undefined });
    expect(out[0]).toMatchObject({ kind: "text", body: "New words.", image: preschool.sections[0].kind === "text" ? preschool.sections[0].image : "" });
    expect(out[3]).toEqual(preschool.sections[3]); // not on the form: unchanged
  });

  it("keeps required words and safe links when a field is emptied or a link is odd", () => {
    const out = sectionsFrom(form({ "s0.body": "  ", "s0.b0.label": "Sign up", "s0.b0.href": "javascript:alert(1)" }), preschool.sections);
    const s0 = out[0] as Extract<typeof out[0], { kind: "text" }>;
    expect(s0.body).toBe((preschool.sections[0] as typeof s0).body);
    expect(s0.buttons![0]).toEqual({ label: "Sign up", href: (preschool.sections[0] as typeof s0).buttons![0].href });
  });

  it("uses saved edits only while the page has the same kinds of sections", () => {
    const edited = sectionsFrom(form({ "s0.body": "Changed." }), preschool.sections);
    expect(withEdits(preschool, { sections: edited }).sections[0]).toMatchObject({ body: "Changed." });
    expect(withEdits(preschool, { sections: edited.slice(1) })).toBe(preschool);
    expect(withEdits(preschool, null)).toBe(preschool);
  });

  it("reads contact details with the originals as a fallback", () => {
    expect(contactFrom(form({ phone: "(614) 555-0100", address2: "" }), CONTACT)).toEqual({ ...CONTACT, phone: "(614) 555-0100" });
    expect(contactWithEdits({ email: "new@example.org" })).toEqual({ ...CONTACT, email: "new@example.org" });
    expect(contactWithEdits(null)).toBe(CONTACT);
  });
});

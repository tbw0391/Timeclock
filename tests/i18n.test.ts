import { describe, expect, it } from "vitest";
import { LOCALES, type Locale } from "@/lib/i18n/locales";
import { makeT, MESSAGES, translateDbMessage } from "@/lib/i18n/messages";
import { en } from "@/lib/i18n/messages/en";

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("translations", () => {
  for (const locale of Object.keys(LOCALES) as Locale[]) {
    it(`${locale} has every message, with the same placeholders`, () => {
      const m = MESSAGES[locale];
      expect(Object.keys(m).sort()).toEqual(Object.keys(en).sort());
      for (const key of Object.keys(en) as (keyof typeof en)[]) {
        expect(m[key].trim(), `${locale} ${key} is empty`).not.toBe("");
        expect(placeholders(m[key]), `${locale} ${key}`).toEqual(placeholders(en[key]));
      }
    });
  }

  it("fills placeholders", () => {
    expect(makeT("en")("kiosk.hi", { name: "Ana" })).toBe("Hi Ana!");
    expect(makeT("fa")("kiosk.hi", { name: "Ana" })).toBe("سلام Ana!");
  });

  it("translates database messages, including the lockout countdown", () => {
    const fa = makeT("fa");
    expect(translateDbMessage(fa, "Wrong PIN. Try again.")).toBe("پین اشتباه است. دوباره تلاش کنید.");
    expect(translateDbMessage(fa, "Too many wrong PINs. Try again in 7 minute(s).")).toContain("7");
    expect(translateDbMessage(fa, "Some new error")).toBe("Some new error");
  });
});

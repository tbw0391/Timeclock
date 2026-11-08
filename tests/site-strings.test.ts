import { describe, expect, it } from "vitest";
import { siteHref, splitLang } from "@/lib/site/base";
import { PAGES, pageFor } from "@/lib/site/content";
import { frameStrings, pageStrings, translatePage } from "@/lib/site/strings";

describe("website translation", () => {
  it("reads the language from the start of the address", () => {
    expect(splitLang("/fa/preschool")).toEqual({ lang: "fa", rest: "/preschool" });
    expect(splitLang("/prs")).toEqual({ lang: "prs", rest: "/" });
    expect(splitLang("/preschool")).toEqual({ lang: null, rest: "/preschool" });
    expect(splitLang("/faq")).toEqual({ lang: null, rest: "/faq" }); // a page, not Farsi
    expect(siteHref("/site/fa", "/donate")).toBe("/site/fa/donate");
    expect(siteHref("/fa", "/")).toBe("/fa");
  });

  it("finds the words to translate but leaves names, links and photos alone", () => {
    const board = pageFor("our-board")!;
    const strings = pageStrings(board);
    expect(strings).toContain("Board of Directors");
    expect(strings.some((s) => s.startsWith("Lynn Sieberhagen graduated"))).toBe(true);
    expect(strings).not.toContain("Lynn Sieberhagen"); // a name
    expect(strings.some((s) => s.includes("https://"))).toBe(false);
  });

  it("swaps in translations and keeps English where there is none", () => {
    const preschool = pageFor("preschool")!;
    const tr = (s: string) => (s === "Half Day Preschool" ? "پیش‌دبستانی نیم‌روزه" : s);
    const out = translatePage(preschool, tr);
    expect(out.sections[1]).toMatchObject({ title: "پیش‌دبستانی نیم‌روزه", items: (preschool.sections[1] as { items: string[] }).items });
    expect(out.sections[0]).toMatchObject({ image: (preschool.sections[0] as { image: string }).image });
  });

  it("covers the whole site without repeats", () => {
    const all = [...frameStrings(), ...PAGES.flatMap(pageStrings)];
    expect(frameStrings()).toContain("Office Hours");
    expect(new Set(frameStrings()).size).toBe(frameStrings().length);
    expect(all.length).toBeGreaterThan(100);
  });
});

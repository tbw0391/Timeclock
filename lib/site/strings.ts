// The words on the website that get translated, found by walking a page's
// sections. Names, links and photos are left as they are. Plain functions so
// tests/site-strings.test.ts can check them.

import { MENU, SITE, type Button, type Page, type Section } from "./content";

type Tr = (s: string) => string;

const buttons = (list: Button[] | undefined, tr: Tr) => list?.map((b) => ({ ...b, label: tr(b.label) }));
const opt = (s: string | undefined, tr: Tr) => (s ? tr(s) : s);

// A section with every translatable string passed through tr.
export function mapSection(s: Section, tr: Tr): Section {
  switch (s.kind) {
    case "hero":
      return { ...s, title: tr(s.title), text: opt(s.text, tr), buttons: buttons(s.buttons, tr) };
    case "text":
      return { ...s, title: opt(s.title, tr), body: tr(s.body), buttons: buttons(s.buttons, tr) };
    case "list":
      return { ...s, title: tr(s.title), note: opt(s.note, tr), items: s.items.map(tr) };
    case "cards":
      return {
        ...s,
        title: opt(s.title, tr),
        intro: opt(s.intro, tr),
        items: s.items.map((c) => ({ ...c, title: tr(c.title), body: tr(c.body), button: c.button && { ...c.button, label: tr(c.button.label) } })),
      };
    case "tiles":
      return { ...s, title: opt(s.title, tr), items: s.items.map((t) => ({ ...t, caption: tr(t.caption) })) };
    case "people":
      return { ...s, title: opt(s.title, tr), items: s.items.map((m) => ({ ...m, role: opt(m.role, tr), bio: opt(m.bio, tr) })) };
    case "gallery":
      return { ...s, title: opt(s.title, tr) };
    case "buttons":
      return { ...s, buttons: buttons(s.buttons, tr)! };
    case "contact":
      return { ...s, title: opt(s.title, tr), text: opt(s.text, tr) };
  }
}

export const translatePage = (page: Page, tr: Tr): Page => ({
  ...page,
  title: tr(page.title),
  description: tr(page.description),
  sections: page.sections.map((s) => mapSection(s, tr)),
});

// Every string tr would be asked for, without repeats.
function collect(walk: (tr: Tr) => void) {
  const seen = new Set<string>();
  walk((s) => { if (s.trim()) seen.add(s); return s; });
  return [...seen];
}

export const pageStrings = (page: Page) => collect((tr) => translatePage(page, tr));

// The website's own words: the menu, buttons in the frame and the contact box.
export const SITE_UI = {
  menu: "Menu",
  contact: "Contact",
  officeHours: "Office Hours",
  call: "Call",
  text: "Text",
  email: "Email",
  staff: "Staff sign-in",
  language: "Language",
};

export const frameStrings = () =>
  collect((tr) => {
    Object.values(SITE_UI).forEach(tr);
    tr(SITE.footnote);
    MENU.forEach((g) => { tr(g.label); g.links.forEach((l) => tr(l.label)); });
  });

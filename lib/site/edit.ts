// Turning the Website page's forms into page content, and stored edits back
// into pages. Plain functions so tests/site-edit.test.ts can check them.
// Managers change words and links only; the layout and photos stay as they are.

import { CONTACT, type Button, type Contact, type Page, type Section } from "./content";

// Form fields are named s<section>.<field>, with s<section>.i<item>.<field> for
// cards, tiles and people and s<section>.b<button>.<field> for buttons.
type Get = (name: string) => string | null;

// Links managers may enter: web pages, email, phone, or a page of the site.
export const okLink = (href: string) => /^(https?:\/\/|mailto:|tel:|\/)/.test(href);

// A field that can be left empty: empty means "not shown".
function optional(get: Get, name: string, was?: string) {
  const v = get(name);
  return v === null ? was : v.trim() || undefined;
}

// A field that has to have something in it: empty keeps what was there.
function required(get: Get, name: string, was: string) {
  return get(name)?.trim() || was;
}

// Line breaks from a textarea, normalized; blank lines between paragraphs stay.
const clean = (s: string) => s.replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n").trim();

function buttonsFrom(get: Get, prefix: string, buttons?: Button[]) {
  return buttons?.map((b, j) => {
    const href = get(`${prefix}.b${j}.href`)?.trim();
    return { label: required(get, `${prefix}.b${j}.label`, b.label), href: href && okLink(href) ? href : b.href };
  });
}

function sectionFrom(get: Get, s: Section, i: number): Section {
  const p = `s${i}`;
  const body = (was: string) => clean(required(get, `${p}.body`, was));
  switch (s.kind) {
    case "hero":
      return { ...s, title: required(get, `${p}.title`, s.title), text: optional(get, `${p}.text`, s.text), buttons: buttonsFrom(get, p, s.buttons) };
    case "text":
      return { ...s, title: optional(get, `${p}.title`, s.title), body: body(s.body), buttons: buttonsFrom(get, p, s.buttons) };
    case "list": {
      const items = get(`${p}.items`);
      return {
        ...s,
        title: required(get, `${p}.title`, s.title),
        note: optional(get, `${p}.note`, s.note),
        items: items === null ? s.items : clean(items).split("\n").map((l) => l.trim()).filter(Boolean),
      };
    }
    case "cards":
      return {
        ...s,
        title: optional(get, `${p}.title`, s.title),
        intro: optional(get, `${p}.intro`, s.intro),
        items: s.items.map((c, j) => ({
          ...c,
          title: required(get, `${p}.i${j}.title`, c.title),
          body: clean(required(get, `${p}.i${j}.body`, c.body)),
          button: c.button && buttonsFrom(get, `${p}.i${j}`, [c.button])![0],
        })),
      };
    case "tiles":
      return {
        ...s,
        title: optional(get, `${p}.title`, s.title),
        items: s.items.map((t, j) => ({ ...t, caption: required(get, `${p}.i${j}.caption`, t.caption) })),
      };
    case "people":
      return {
        ...s,
        title: optional(get, `${p}.title`, s.title),
        items: s.items.map((m, j) => {
          const bio = optional(get, `${p}.i${j}.bio`, m.bio);
          return { ...m, name: required(get, `${p}.i${j}.name`, m.name), role: optional(get, `${p}.i${j}.role`, m.role), bio: bio && clean(bio) };
        }),
      };
    case "gallery":
      return { ...s, title: optional(get, `${p}.title`, s.title) };
    case "buttons":
      return { ...s, buttons: buttonsFrom(get, p, s.buttons)! };
    case "contact":
      return { ...s, title: optional(get, `${p}.title`, s.title), text: optional(get, `${p}.text`, s.text) };
  }
}

export const sectionsFrom = (get: Get, sections: Section[]) => sections.map((s, i) => sectionFrom(get, s, i));

export function contactFrom(get: Get, was: Contact): Contact {
  return {
    phone: required(get, "phone", was.phone),
    email: required(get, "email", was.email),
    address: [required(get, "address1", was.address[0]), required(get, "address2", was.address[1])],
    hours: required(get, "hours", was.hours),
  };
}

// A page with its saved edits. The edits are used only while the page still
// has the same kinds of sections in the same order as lib/site/content.ts, so a
// layout change in the code never mixes old text into the wrong places.
export function withEdits(page: Page, saved: unknown): Page {
  const sections = (saved as { sections?: Section[] } | null)?.sections;
  if (!Array.isArray(sections) || sections.length !== page.sections.length) return page;
  if (sections.some((s, i) => s?.kind !== page.sections[i].kind)) return page;
  return { ...page, sections };
}

export function contactWithEdits(saved: unknown): Contact {
  const c = saved as Partial<Contact> | null;
  if (!c || typeof c !== "object") return CONTACT;
  const address = Array.isArray(c.address) && c.address.length === 2 ? (c.address as [string, string]) : CONTACT.address;
  return {
    phone: typeof c.phone === "string" && c.phone ? c.phone : CONTACT.phone,
    email: typeof c.email === "string" && c.email ? c.email : CONTACT.email,
    address,
    hours: typeof c.hours === "string" && c.hours ? c.hours : CONTACT.hours,
  };
}

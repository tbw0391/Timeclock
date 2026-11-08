import { cache } from "react";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { SITE_BASE_HEADER, SITE_LANGS, SITE_LANG_HEADER, SITE_PATH_HEADER, isSiteLang, type SiteLang } from "./base";
import { PAGES, pageFor } from "./content";
import { contactWithEdits, withEdits } from "./edit";
import { cleanEvents, eventStrings } from "./events";
import { frameStrings, pageStrings } from "./strings";

// Where the site lives, without the language.
export async function siteRoot() {
  return (await headers()).get(SITE_BASE_HEADER) ?? "/site";
}

// The language the site is being read in, or null for English.
export async function siteLang(): Promise<SiteLang | null> {
  const lang = (await headers()).get(SITE_LANG_HEADER);
  return isSiteLang(lang) ? lang : null;
}

// The page's own path ("/preschool"), for the language picker.
export async function sitePath() {
  return (await headers()).get(SITE_PATH_HEADER) ?? "/";
}

// What in-site links start with: where the site lives plus the language.
export async function siteBase() {
  const [root, lang] = await Promise.all([siteRoot(), siteLang()]);
  return lang ? `${root}/${lang}` : root;
}

// Looks up translations for the language being read (once per request).
// Anything not translated yet stays in English.
export const siteTr = cache(async (): Promise<(s: string) => string> => {
  const lang = await siteLang();
  if (!lang) return (s) => s;
  const { data } = await (await createClient()).from("site_strings").select("en, tr").eq("lang", lang);
  const map = new Map((data ?? []).map((r: { en: string; tr: string }) => [r.en, r.tr]));
  return (s) => map.get(s) ?? s;
});

// The banner across the top of the site, set by managers on the Website page.
// Null when it's empty, past its last day, or the database can't be reached.
export async function siteNotice() {
  const { data } = await (await createClient()).rpc("site_notice");
  return (data as string | null) ?? null;
}

// Events still to come, soonest first.
export async function siteEvents() {
  const { data } = await (await createClient()).rpc("site_events");
  return cleanEvents(data);
}

async function saved(key: string) {
  const { data } = await (await createClient()).from("site_content").select("value").eq("key", key).maybeSingle<{ value: unknown }>();
  return data?.value ?? null;
}

// A page as the website shows it: lib/site/content.ts plus managers' edits.
export async function sitePage(slug: string) {
  const page = pageFor(slug);
  return page && withEdits(page, await saved(`page:${slug}`));
}

export async function siteContact() {
  return contactWithEdits(await saved("contact"));
}

// Every English string on the website now, for "Translate the whole site".
export async function allSiteStrings() {
  const [pages, notice, contact, events] = await Promise.all([Promise.all(PAGES.map((p) => sitePage(p.slug))), siteNotice(), siteContact(), siteEvents()]);
  return [...frameStrings(), ...pages.flatMap((p) => pageStrings(p!)), ...(notice ? [notice] : []), contact.hours, ...eventStrings(events)];
}

// One language's translations: English → { tr, edited }.
export async function translations(lang: SiteLang) {
  const { data } = await (await createClient()).from("site_strings").select("en, tr, edited").eq("lang", lang);
  return new Map((data ?? []).map((r: { en: string; tr: string; edited: boolean }) => [r.en, r]));
}

// How many of these strings are missing a translation, counted per language.
export async function untranslatedCount(strings: string[]) {
  const wanted = [...new Set(strings.filter((s) => s.trim()))];
  const counts = await Promise.all(SITE_LANGS.map(async (lang) => {
    const have = await translations(lang);
    return wanted.filter((s) => !have.has(s)).length;
  }));
  return counts.reduce((a, b) => a + b, 0);
}

// Which pages managers have changed, for the Website page's list.
export async function editedPages() {
  const { data } = await (await createClient()).from("site_content").select("key").like("key", "page:%");
  return new Set((data ?? []).map((r: { key: string }) => r.key.slice(5)));
}

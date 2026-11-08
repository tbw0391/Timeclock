// Set by the middleware: where the site lives ("" at a domain's root, "/site"
// on the app's own address), the language from the address ("/fa/preschool"),
// and the page's own path, so the language picker can stay on the same page.
export const SITE_BASE_HEADER = "x-site-base";
export const SITE_LANG_HEADER = "x-site-lang";
export const SITE_PATH_HEADER = "x-site-path";

// Languages the website can be read in besides English, as in the staff app.
export const SITE_LANGS = ["fa", "prs", "ps", "ar"] as const;
export type SiteLang = (typeof SITE_LANGS)[number];
export const isSiteLang = (v: unknown): v is SiteLang => SITE_LANGS.includes(v as SiteLang);

// Splits "/fa/preschool" into the language and the rest ("/preschool").
export function splitLang(path: string): { lang: SiteLang | null; rest: string } {
  const first = path.split("/")[1];
  if (!isSiteLang(first)) return { lang: null, rest: path };
  return { lang: first, rest: path.slice(first.length + 1) || "/" };
}

// Prefixes in-site links ("/preschool") with where the site lives: "" on
// thekitelc.com, "/site" on the app's own address, plus "/fa" etc. when the
// site is being read in another language. Outside links are left alone.
export function siteHref(base: string, href: string) {
  if (!href.startsWith("/")) return href;
  return href === "/" ? base || "/" : base + href;
}

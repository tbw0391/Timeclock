// Set by the middleware when the site is served at a host's root.
export const SITE_BASE_HEADER = "x-site-base";

// Prefixes in-site links ("/preschool") with where the site lives: "" on
// thekitelc.com, "/site" on the app's own address. Outside links are left alone.
export function siteHref(base: string, href: string) {
  if (!href.startsWith("/")) return href;
  return href === "/" ? base || "/" : base + href;
}

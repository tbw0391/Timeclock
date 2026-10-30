import "server-only";
import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, intlLocale, isLocale, LANG_COOKIE, LOCALES, type Locale } from "./locales";
import { makeT, translateDbMessage } from "./messages";

// The language is chosen per device (a cookie), so a staff phone, the kiosk
// and the family iPad can each be set to whoever is using them. Before anyone
// picks, the browser's own language is used if we have it.
export async function getLocale(): Promise<Locale> {
  const chosen = (await cookies()).get(LANG_COOKIE)?.value;
  if (isLocale(chosen)) return chosen;
  const accept = (await headers()).get("accept-language") ?? "";
  for (const part of accept.split(",")) {
    const tag = part.split(";")[0].trim().toLowerCase();
    if (tag.startsWith("fa-af")) return "prs";
    const base = tag.split("-")[0];
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}

export async function getT() {
  const locale = await getLocale();
  const t = makeT(locale);
  return {
    t,
    locale,
    dir: LOCALES[locale].dir,
    intl: intlLocale(locale),
    db: (message: string) => translateDbMessage(t, message),
  };
}

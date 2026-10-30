// Languages the app speaks. To add one: add it here, add a messages file next
// to en.ts, and register it in messages/index.ts (TypeScript flags any missing
// text).
export const LOCALES = {
  en: { name: "English", dir: "ltr", intl: "en-US" },
  fa: { name: "فارسی", dir: "rtl", intl: "fa-IR" },
  prs: { name: "دری", dir: "rtl", intl: "fa-AF" },
  ps: { name: "پښتو", dir: "rtl", intl: "ps-AF" },
  ar: { name: "العربية", dir: "rtl", intl: "ar" },
} as const;

export type Locale = keyof typeof LOCALES;
export const DEFAULT_LOCALE: Locale = "en";
export const LANG_COOKIE = "lang";

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && v in LOCALES;
}

// Localized month/weekday names, but the Gregorian calendar and 0-9 digits for
// every language, so payroll dates and phone numbers read the same for everyone.
export function intlLocale(locale: Locale): string {
  return `${LOCALES[locale].intl}-u-ca-gregory-nu-latn`;
}

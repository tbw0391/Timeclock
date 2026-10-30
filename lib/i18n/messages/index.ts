import type { Locale } from "../locales";
import { ar } from "./ar";
import { en, type MessageKey, type Messages } from "./en";
import { fa } from "./fa";
import { prs } from "./prs";
import { ps } from "./ps";

export const MESSAGES: Record<Locale, Messages> = { en, fa, prs, ps, ar };
export type { MessageKey, Messages };

export type T = (key: MessageKey, vars?: Record<string, string | number>) => string;

export function makeT(locale: Locale): T {
  const m = MESSAGES[locale];
  return (key, vars) => {
    let s = m[key] ?? en[key];
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
    return s;
  };
}

// The database raises English messages; show them in the reader's language
// when we know them. "Try again in N minute(s)" carries a number.
const DB_KEYS = new Map<string, MessageKey>(
  (Object.keys(en) as MessageKey[]).filter((k) => k.startsWith("db.")).map((k) => [en[k], k]),
);

export function translateDbMessage(t: T, message: string): string {
  const key = DB_KEYS.get(message);
  if (key) return t(key);
  const locked = /^Too many wrong PINs\. Try again in (\d+) minute\(s\)\.$/.exec(message);
  if (locked) return t("db.lockedFor", { minutes: locked[1] });
  return message;
}

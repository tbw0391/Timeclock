"use server";

import { createClient } from "@/lib/supabase/server";
import { isSiteLang } from "@/lib/site/base";

export type SendState = { sent?: boolean; failed?: boolean };

// The website's contact form. Bots tend to fill in every field, including a
// hidden one, and to send within a second of loading the page; those get a
// pretend "sent" so they don't try again.
export async function sendSiteMessage(_: SendState, form: FormData): Promise<SendState> {
  const get = (k: string) => { const v = form.get(k); return typeof v === "string" ? v.trim() : ""; };
  const shownAt = Number(get("shown_at"));
  if (get("website") || !shownAt || Date.now() - shownAt < 3000) return { sent: true };
  const lang = get("lang");
  const { error } = await (await createClient()).rpc("site_send_message", {
    p_name: get("name"), p_reply_to: get("reply_to"), p_body: get("message"), p_lang: isSiteLang(lang) ? lang : "en",
  });
  return error ? { failed: true } : { sent: true };
}

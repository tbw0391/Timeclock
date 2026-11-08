import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SITE_LANGS, type SiteLang } from "./base";

// Website translation with Claude. Off (no translating, no language picker)
// until ANTHROPIC_API_KEY is set in Vercel; see README → Website translation.
export const translateOn = () => !!process.env.ANTHROPIC_API_KEY;

const LANG_NAMES: Record<SiteLang, string> = {
  fa: "Farsi (Persian as written in Iran)",
  prs: "Dari (Persian as written in Afghanistan, with Afghan rather than Iranian vocabulary)",
  ps: "Pashto (as written in Afghanistan)",
  ar: "Arabic (Modern Standard Arabic)",
};

const SYSTEM = `You translate the website of The KITE Learning Center, a nonprofit play-based preschool with free adult English and citizenship classes for New American families (many from Afghanistan and Arabic-speaking countries) in Columbus, Ohio. Readers are parents, often still learning English, so use plain, warm, everyday words rather than formal or literary ones.

Rules:
- Translate every string in the list and return them in the same order, one translation per string.
- Keep people's names, organization and program names (The KITE Learning Center, KITE, ESL, ECE, Zeffy, Kroger, Amazon), phone numbers, email addresses, web addresses, street addresses, dollar amounts and times exactly as written.
- Write dates with the month name translated and the numbers kept as 0-9 digits.
- Keep line breaks and blank lines where they are.
- A string that is only a name, number or address comes back unchanged.`;

let client: Anthropic | null = null;

// One batch of strings into one language.
async function translateBatch(lang: SiteLang, strings: string[]) {
  client ??= new Anthropic();
  const response = await client.beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: {
      effort: "medium",
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: { translations: { type: "array", items: { type: "string" } } },
          required: ["translations"],
          additionalProperties: false,
        },
      },
    },
    system: SYSTEM,
    messages: [{
      role: "user",
      content: `Translate these ${strings.length} strings into ${LANG_NAMES[lang]}:\n\n${JSON.stringify(strings, null, 1)}`,
    }],
  });
  if (response.stop_reason !== "end_turn") throw new Error(`Translation stopped early (${response.stop_reason})`);
  const text = response.content.find((b) => b.type === "text")?.text ?? "";
  const out = (JSON.parse(text) as { translations: string[] }).translations;
  if (!Array.isArray(out) || out.length !== strings.length) throw new Error("Translation came back with the wrong number of strings");
  return out;
}

// Batches small enough to come back quickly.
function batches(strings: string[]) {
  const out: string[][] = [];
  let cur: string[] = [];
  let size = 0;
  for (const s of strings) {
    if (cur.length && (cur.length >= 40 || size + s.length > 6000)) { out.push(cur); cur = []; size = 0; }
    cur.push(s);
    size += s.length;
  }
  if (cur.length) out.push(cur);
  return out;
}

// Translates the strings that have no translation yet, into every language at
// once, stopping after `seconds` so a save never runs past Vercel's time limit.
// Returns how many strings are still missing (in any language) and the first
// error, if any.
export async function translateMissing(supabase: SupabaseClient, strings: string[], seconds = 120) {
  const stopAt = Date.now() + seconds * 1000;
  const wanted = [...new Set(strings.filter((s) => s.trim()))];
  const results = await Promise.all(SITE_LANGS.map(async (lang) => {
    const { data, error } = await supabase.from("site_strings").select("en").eq("lang", lang);
    if (error) return { left: wanted.length, error: error.message };
    const have = new Set((data ?? []).map((r: { en: string }) => r.en));
    let missing = wanted.filter((s) => !have.has(s));
    for (const batch of batches(missing)) {
      if (Date.now() > stopAt) break;
      try {
        const tr = await translateBatch(lang, batch);
        const { error: saveError } = await supabase.rpc("admin_set_site_strings", {
          p_lang: lang, p_rows: batch.map((en, i) => ({ en, tr: tr[i] })), p_edited: false,
        });
        if (saveError) return { left: missing.length, error: saveError.message };
        missing = missing.slice(batch.length);
      } catch (e) {
        return { left: missing.length, error: e instanceof Error ? e.message : String(e) };
      }
    }
    return { left: missing.length, error: "" };
  }));
  return {
    left: results.reduce((n, r) => n + r.left, 0),
    error: results.find((r) => r.error)?.error ?? "",
  };
}

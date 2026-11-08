import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { SITE_BASE_HEADER } from "./base";
import { pageFor } from "./content";
import { contactWithEdits, withEdits } from "./edit";

export async function siteBase() {
  return (await headers()).get(SITE_BASE_HEADER) ?? "/site";
}

// The banner across the top of the site, set by managers on the Website page.
// Null when it's empty, past its last day, or the database can't be reached.
export async function siteNotice() {
  const { data } = await (await createClient()).rpc("site_notice");
  return (data as string | null) ?? null;
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

// Which pages managers have changed, for the Website page's list.
export async function editedPages() {
  const { data } = await (await createClient()).from("site_content").select("key").like("key", "page:%");
  return new Set((data ?? []).map((r: { key: string }) => r.key.slice(5)));
}

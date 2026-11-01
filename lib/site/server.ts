import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { SITE_BASE_HEADER } from "./base";

export async function siteBase() {
  return (await headers()).get(SITE_BASE_HEADER) ?? "/site";
}

// The banner across the top of the site, set by managers on the Website page.
// Null when it's empty, past its last day, or the database can't be reached.
export async function siteNotice() {
  const { data } = await (await createClient()).rpc("site_notice");
  return (data as string | null) ?? null;
}

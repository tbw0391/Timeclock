import { headers } from "next/headers";
import { SITE_BASE_HEADER } from "./base";

export async function siteBase() {
  return (await headers()).get(SITE_BASE_HEADER) ?? "/site";
}

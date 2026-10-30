import { NextResponse, type NextRequest } from "next/server";
import { isLocale, LANG_COOKIE } from "@/lib/i18n/locales";

// /lang?to=fa sets this device's language and goes back to the page it came
// from (same site only).
export function GET(request: NextRequest) {
  const to = request.nextUrl.searchParams.get("to");
  const ref = request.headers.get("referer");
  let back = new URL("/", request.nextUrl.origin);
  if (ref) {
    const u = new URL(ref);
    if (u.origin === request.nextUrl.origin) back = u;
  }
  const res = NextResponse.redirect(back);
  if (isLocale(to)) {
    res.cookies.set(LANG_COOKIE, to, { path: "/", maxAge: 60 * 60 * 24 * 400, sameSite: "lax" });
  }
  return res;
}

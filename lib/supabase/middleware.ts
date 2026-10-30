import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { KIOSK_COOKIE } from "@/lib/kiosk";
import { SITE_BASE_HEADER } from "@/lib/site/base";

// The icons and manifest must load before sign-in so phones can install the app.
// /kiosk runs signed out; its device cookie is checked by the database.
const PUBLIC_PATHS = ["/login", "/auth/", "/brand/", "/manifest.webmanifest", "/kiosk", "/lang"];

// Hosts that serve the public website at their root (e.g. "thekitelc.com,www.thekitelc.com").
// Elsewhere the site is at /site.
const SITE_HOSTS = (process.env.SITE_HOSTS ?? "").split(",").map((h) => h.trim().toLowerCase()).filter(Boolean);

export async function updateSession(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
  const path0 = request.nextUrl.pathname;
  // The public website never needs a session, so skip the auth round trip.
  if (SITE_HOSTS.includes(host)) {
    if (path0.startsWith("/site/") || path0.startsWith("/brand/")) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = "/site" + (path0 === "/" ? "" : path0);
    const headers = new Headers(request.headers);
    headers.set(SITE_BASE_HEADER, "");
    return NextResponse.rewrite(url, { request: { headers } });
  }
  if (path0 === "/site" || path0.startsWith("/site/")) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  // A kiosk tablet always shows the kiosk, whatever page it reloads.
  if (!user && request.cookies.has(KIOSK_COOKIE) && path !== "/kiosk"
      && !path.startsWith("/brand/") && path !== "/manifest.webmanifest" && path !== "/lang") {
    const url = request.nextUrl.clone();
    url.pathname = "/kiosk";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (!user && !PUBLIC_PATHS.some((p) => path.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  // Already signed in (e.g. a double-tapped code whose second check failed): skip the login page.
  if (user && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}

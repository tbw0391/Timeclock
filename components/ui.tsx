import Image from "next/image";
import Link from "next/link";
import type { Profile, Settings } from "@/lib/session";
import { gpsProblem, gpsText, mapUrl, type GpsFix } from "@/lib/gps";

export function Header({ profile, settings }: { profile: Profile; settings: Settings }) {
  const admin = profile.role === "admin" && profile.active;
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <Link href="/" className="flex items-center gap-2 text-xl font-bold" style={{ color: "var(--ink)" }}>
        <Image src="/brand/kite.png" alt="" width={24} height={42} priority />
        {settings.business_name}
      </Link>
      <nav className="flex flex-wrap items-center gap-3 text-sm font-medium">
        <Link href="/">My time</Link>
        {admin && <Link href="/admin">Crew</Link>}
        {admin && <Link href="/admin/timesheets">Timesheets</Link>}
        {admin && <Link href="/admin/audit">Change log</Link>}
        {admin && <Link href="/admin/suggestions">Suggestions</Link>}
        <Link href="/suggest" className="btn-ghost" style={{ background: "var(--bow)", color: "var(--charcoal)" }}>💡 Suggest</Link>
        <Link href="/account" className="muted">{profile.full_name || "My account"}</Link>
        <form action="/auth/signout" method="post">
          <button className="btn-ghost">Sign out</button>
        </form>
      </nav>
    </header>
  );
}

// Map link for a punch location, an amber flag when the phone sent none, or
// "manual" for times a manager entered.
export function GpsTag({ fix }: { fix: GpsFix }) {
  if (fix.gps === "ok" && fix.lat != null && fix.lng != null) {
    return (
      <a href={mapUrl(fix.lat, fix.lng)} target="_blank" rel="noopener noreferrer" className="underline" title={gpsText(fix)}>
        Map{fix.accuracy != null && fix.accuracy > 100 ? ` (±${Math.round(fix.accuracy)} m)` : ""}
      </a>
    );
  }
  if (gpsProblem(fix)) return <span className="text-amber-600">{gpsText(fix)}</span>;
  return <span className="muted">manual</span>;
}

export function Flash({ error, ok }: { error?: string; ok?: string }) {
  if (!error && !ok) return null;
  return (
    <p className={`mb-4 rounded-md px-3 py-2 text-sm ${error ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
      {error ?? ok}
    </p>
  );
}

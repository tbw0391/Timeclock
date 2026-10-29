import Link from "next/link";
import type { Profile, Settings } from "@/lib/session";

export function Header({ profile, settings }: { profile: Profile; settings: Settings }) {
  const admin = profile.role === "admin" && profile.active;
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <Link href="/" className="text-lg font-semibold">{settings.business_name}</Link>
      <nav className="flex flex-wrap items-center gap-3 text-sm">
        <Link href="/">My time</Link>
        {admin && <Link href="/admin">Crew</Link>}
        {admin && <Link href="/admin/timesheets">Timesheets</Link>}
        {admin && <Link href="/admin/audit">Change log</Link>}
        <Link href="/account" className="muted">{profile.full_name || profile.email}</Link>
        <form action="/auth/signout" method="post">
          <button className="btn-ghost">Sign out</button>
        </form>
      </nav>
    </header>
  );
}

export function Flash({ error, ok }: { error?: string; ok?: string }) {
  if (!error && !ok) return null;
  return (
    <p className={`mb-4 rounded-md px-3 py-2 text-sm ${error ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
      {error ?? ok}
    </p>
  );
}

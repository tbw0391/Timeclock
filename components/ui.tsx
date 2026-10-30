import Image from "next/image";
import Link from "next/link";
import type { Profile, Settings } from "@/lib/session";
import { gpsProblem, mapUrl, type GpsFix } from "@/lib/gps";
import { getT } from "@/lib/i18n/server";
import { LanguagePicker } from "./LanguagePicker";

// Everything else lives on the hub (/), so the header stays short: home,
// suggestions, account, sign out, and the language buttons.
export async function Header({ profile, settings }: { profile: Profile; settings: Settings }) {
  const { t, locale } = await getT();
  return (
    <header className="mb-6 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold" style={{ color: "var(--ink)" }}>
          <Image src="/brand/kite.png" alt="" width={24} height={42} priority />
          {settings.business_name}
        </Link>
        <nav className="flex flex-wrap items-center gap-3 text-sm font-medium">
          <Link href="/">{t("nav.home")}</Link>
          <Link href="/suggest" className="btn-ghost" style={{ background: "var(--bow)", color: "var(--charcoal)" }}>
            💡 {t("tile.suggest")}
          </Link>
          <Link href="/account" className="muted">{profile.full_name || t("nav.myAccount")}</Link>
          <form action="/auth/signout" method="post">
            <button className="btn-ghost">{t("nav.signOut")}</button>
          </form>
        </nav>
      </div>
      <LanguagePicker current={locale} label={t("common.language")} />
    </header>
  );
}

// Map link for a punch location, an amber flag when the phone sent none, or
// "manual" for times a manager entered.
export async function GpsTag({ fix }: { fix: GpsFix }) {
  const { t } = await getT();
  if (fix.gps === "ok" && fix.lat != null && fix.lng != null) {
    return (
      <a href={mapUrl(fix.lat, fix.lng)} target="_blank" rel="noopener noreferrer" className="underline">
        {t("ts.map")}{fix.accuracy != null && fix.accuracy > 100 ? ` (±${Math.round(fix.accuracy)} m)` : ""}
      </a>
    );
  }
  if (gpsProblem(fix) && fix.gps) return <span className="text-amber-600">{t(`gps.${fix.gps}` as "gps.denied")}</span>;
  return <span className="muted">{t("ts.manual")}</span>;
}

export function Flash({ error, ok }: { error?: string; ok?: string }) {
  if (!error && !ok) return null;
  return (
    <p className={`mb-4 rounded-md px-3 py-2 text-sm ${error ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
      {error ?? ok}
    </p>
  );
}

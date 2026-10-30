import Link from "next/link";
import { Header } from "@/components/ui";
import { getSession, type Punch } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import { timeLabel } from "@/lib/time";

export const dynamic = "force-dynamic";

const COLORS = ["var(--peach)", "var(--lavender)", "var(--mint)", "var(--sky)"];

type Tile = { href: string; icon: string; title: string; desc: string };

// The staff hub. The time clock is one tile; new tools get a tile here.
export default async function Hub() {
  const { supabase, profile, settings } = await getSession();
  const { t, intl } = await getT();
  const admin = profile.role === "admin" && profile.active;
  const [{ data: open }, { count: newSuggestions }, { count: kidsTotal }, { count: kidsHere }] = await Promise.all([
    supabase.from("punches").select("*").eq("user_id", profile.id).is("clock_out", null).maybeSingle<Punch>(),
    admin
      ? supabase.from("suggestions").select("id", { count: "exact", head: true }).eq("status", "new")
      : Promise.resolve({ count: 0 }),
    supabase.from("children").select("id", { count: "exact", head: true }).eq("active", true),
    supabase.from("child_attendance").select("id", { count: "exact", head: true }).is("checked_out_at", null),
  ]);

  const staff: Tile[] = [
    {
      href: "/time", icon: "⏰", title: t("tile.timeclock"),
      desc: open ? t("tile.timeclock.onClock", { time: timeLabel(open.clock_in, settings.timezone, intl) }) : t("tile.timeclock.offClock"),
    },
    { href: "/children", icon: "🧒", title: t("tile.children"), desc: t("tile.children.desc", { here: kidsHere ?? 0, total: kidsTotal ?? 0 }) },
    { href: "/suggest", icon: "💡", title: t("tile.suggest"), desc: t("tile.suggest.desc") },
    { href: "/account", icon: "🙂", title: t("tile.account"), desc: t("tile.account.desc") },
  ];
  const manager: Tile[] = admin ? [
    { href: "/admin", icon: "👥", title: t("tile.crew"), desc: t("tile.crew.desc") },
    { href: "/admin/timesheets", icon: "📋", title: t("tile.timesheets"), desc: t("tile.timesheets.desc") },
    { href: "/admin/suggestions", icon: "📬", title: t("tile.suggestions"), desc: t("tile.suggestions.desc", { count: newSuggestions ?? 0 }) },
    { href: "/admin/audit", icon: "📝", title: t("tile.audit"), desc: t("tile.audit.desc") },
  ] : [];

  const grid = (tiles: Tile[], offset = 0) => (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {tiles.map((tile, i) => (
        <Link
          key={tile.href}
          href={tile.href}
          className="rounded-3xl border-[3px] p-5 transition-transform active:translate-y-1"
          style={{ background: COLORS[(i + offset) % COLORS.length], borderColor: "var(--charcoal)", color: "var(--charcoal)", boxShadow: "0 5px 0 var(--charcoal)" }}
        >
          <span className="text-4xl" aria-hidden>{tile.icon}</span>
          <span className="mt-2 block text-lg font-bold">{tile.title}</span>
          <span className="block text-sm">{tile.desc}</span>
        </Link>
      ))}
    </div>
  );

  return (
    <>
      <Header profile={profile} settings={settings} />
      <h1 className="mb-4 text-2xl font-bold">
        {profile.full_name ? t("hub.greeting", { name: profile.full_name }) : t("hub.greetingNoName")}
      </h1>
      <h2 className="muted mb-2 text-sm font-semibold uppercase tracking-wide">{t("hub.staffTools")}</h2>
      {grid(staff)}
      {admin && (
        <>
          <h2 className="muted mb-2 mt-8 text-sm font-semibold uppercase tracking-wide">{t("hub.managerTools")}</h2>
          {grid(manager, 1)}
        </>
      )}
    </>
  );
}

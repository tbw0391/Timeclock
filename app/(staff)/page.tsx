import Link from "next/link";
import { Header } from "@/components/ui";
import { getSession, type Punch } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import { dateLabel, timeLabel, todayIn } from "@/lib/time";
import { gustoOn } from "@/lib/gusto-sync";
import { byUrgency, CERT_STYLE, certStatus, type Cert } from "@/lib/certifications";
import type { MessageKey } from "@/lib/i18n/messages";
import { readAnnouncement } from "./actions";

export const dynamic = "force-dynamic";

const COLORS = ["var(--peach)", "var(--lavender)", "var(--mint)", "var(--sky)"];

type Tile = { href: string; icon: string; title: string; desc: string };
type Announcement = { id: number; body: string; created_at: string };

// The staff hub. The time clock is one tile; new tools get a tile here.
export default async function Hub() {
  const { supabase, profile, settings } = await getSession();
  const { t, intl } = await getT();
  const admin = profile.role === "admin" && profile.active;
  const today = todayIn(settings.timezone);
  const [{ data: open }, { count: newSuggestions }, { count: kidsTotal }, { count: kidsHere }, { count: newMessages }, { data: announcements }, { data: reads }, { data: certs }] = await Promise.all([
    supabase.from("punches").select("*").eq("user_id", profile.id).is("clock_out", null).maybeSingle<Punch>(),
    admin
      ? supabase.from("suggestions").select("id", { count: "exact", head: true }).eq("status", "new")
      : Promise.resolve({ count: 0 }),
    supabase.from("children").select("id", { count: "exact", head: true }).eq("active", true),
    supabase.from("child_attendance").select("id", { count: "exact", head: true }).is("checked_out_at", null),
    admin
      ? supabase.from("site_messages").select("id", { count: "exact", head: true }).eq("status", "new")
      : Promise.resolve({ count: 0 }),
    supabase.from("announcements").select("id, body, created_at").or(`until.is.null,until.gte.${today}`).order("created_at", { ascending: false }).returns<Announcement[]>(),
    supabase.from("announcement_reads").select("announcement_id").eq("user_id", profile.id).returns<{ announcement_id: number }[]>(),
    // Managers can read everyone's; the hub counts all of them for the tile.
    supabase.from("certifications").select("id, user_id, kind, expires_on, note").returns<Cert[]>(),
  ]);
  const seen = new Set((reads ?? []).map((r) => r.announcement_id));
  const unread = (announcements ?? []).filter((a) => !seen.has(a.id));
  const earlier = (announcements ?? []).filter((a) => seen.has(a.id));
  const due = (certs ?? []).filter((c) => ["expired", "soon"].includes(certStatus(c.expires_on, today)));
  const myDue = due.filter((c) => c.user_id === profile.id).sort(byUrgency);

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
    ...(gustoOn() ? [{ href: "/admin/gusto", icon: "🔗", title: t("tile.gusto"), desc: t("tile.gusto.desc") }] : []),
    { href: "/admin/announcements", icon: "📣", title: t("tile.announcements"), desc: t("tile.announcements.desc") },
    { href: "/admin/certifications", icon: "🎓", title: t("tile.certs"), desc: due.length ? t("tile.certs.due", { count: due.length }) : t("tile.certs.ok") },
    { href: "/admin/website", icon: "🌐", title: t("tile.website"), desc: t("tile.website.desc") },
    { href: "/admin/website/messages", icon: "✉️", title: t("tile.messages"), desc: t("tile.messages.desc", { count: newMessages ?? 0 }) },
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
      {unread.map((a) => (
        <section key={a.id} className="mb-4 rounded-3xl border-[3px] p-5" style={{ background: "var(--bow)", borderColor: "var(--charcoal)", color: "var(--charcoal)" }}>
          <p className="mb-1 text-sm font-bold">📣 {t("hub.announcement")} · {timeLabel(a.created_at, settings.timezone, intl)}</p>
          <p className="whitespace-pre-wrap text-lg" dir="auto">{a.body}</p>
          <form action={readAnnouncement} className="mt-3">
            <input type="hidden" name="id" value={a.id} />
            <button className="btn">{t("hub.gotIt")}</button>
          </form>
        </section>
      ))}
      {myDue.length > 0 && (
        <section className="card mb-4">
          <h2 className="mb-2 font-semibold">🎓 {t("hub.myCerts")}</h2>
          <ul className="space-y-1">
            {myDue.map((c) => {
              const s = certStatus(c.expires_on, today);
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-2">
                  <span dir="auto">{c.kind}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${CERT_STYLE[s]}`}>{t(`cert.${s}` as MessageKey, { date: dateLabel(c.expires_on!, intl) })}</span>
                </li>
              );
            })}
          </ul>
          <p className="muted mt-2 text-sm">{t("hub.myCertsHint")}</p>
        </section>
      )}
      {earlier.length > 0 && (
        <details className="card mb-4">
          <summary className="cursor-pointer font-semibold">📣 {t("hub.earlier", { count: earlier.length })}</summary>
          <ul className="mt-2 space-y-3">
            {earlier.map((a) => (
              <li key={a.id}>
                <p className="muted text-sm">{timeLabel(a.created_at, settings.timezone, intl)}</p>
                <p className="whitespace-pre-wrap" dir="auto">{a.body}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
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

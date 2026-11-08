import { Flash, Header } from "@/components/ui";
import { requireAdmin, type Profile } from "@/lib/session";
import { dateLabel, timeLabel, todayIn } from "@/lib/time";
import { getT } from "@/lib/i18n/server";
import { deleteAnnouncement, postAnnouncement } from "./actions";

type Announcement = { id: number; body: string; until: string | null; created_by: string | null; created_at: string };
type Read = { announcement_id: number; user_id: string };
type Props = { searchParams: Promise<{ error?: string; ok?: string }> };

export const dynamic = "force-dynamic";

// Post a note for all staff, and see who has read each one.
export default async function AnnouncementsPage({ searchParams }: Props) {
  const { error, ok } = await searchParams;
  const { supabase, profile, settings } = await requireAdmin();
  const { t, intl } = await getT();
  const [{ data: items }, { data: reads }, { data: people }] = await Promise.all([
    supabase.from("announcements").select("*").order("created_at", { ascending: false }).limit(100).returns<Announcement[]>(),
    supabase.from("announcement_reads").select("announcement_id, user_id").returns<Read[]>(),
    supabase.from("profiles").select("id, full_name, phone, active").returns<Profile[]>(),
  ]);
  const today = todayIn(settings.timezone);
  const staff = (people ?? []).filter((p) => p.active);
  const name = (id: string | null) => (id && (people ?? []).find((p) => p.id === id)?.full_name) || "—";
  const readBy = (id: number) => new Set((reads ?? []).filter((r) => r.announcement_id === id).map((r) => r.user_id));
  const showing = (items ?? []).filter((a) => !a.until || a.until >= today);
  const past = (items ?? []).filter((a) => a.until && a.until < today);

  const card = (a: Announcement) => {
    const who = readBy(a.id);
    const notYet = staff.filter((p) => !who.has(p.id));
    return (
      <li key={a.id} className="border-t-2 border-dashed py-3" style={{ borderColor: "var(--soft-line)" }}>
        <p className="whitespace-pre-wrap" dir="auto">{a.body}</p>
        <p className="muted mt-1 text-sm">
          {name(a.created_by)} · {timeLabel(a.created_at, settings.timezone, intl)}
          {a.until && ` · ${t("ann.untilLabel", { date: dateLabel(a.until, intl) })}`}
        </p>
        <details className="mt-1 text-sm">
          <summary className="cursor-pointer">{t("ann.readCount", { read: staff.length - notYet.length, total: staff.length })}</summary>
          {notYet.length > 0 && <p className="muted mt-1">{t("ann.notYet")}: {notYet.map((p) => p.full_name || p.phone).join(", ")}</p>}
        </details>
        <form action={deleteAnnouncement} className="mt-2">
          <input type="hidden" name="id" value={a.id} />
          <button className="btn-ghost">{t("ann.delete")}</button>
        </form>
      </li>
    );
  };

  return (
    <>
      <Header profile={profile} settings={settings} />
      <Flash error={error} ok={ok} />
      <h1 className="mb-4 text-2xl font-bold">{t("ann.title")}</h1>
      <section className="card mb-6 max-w-lg">
        <h2 className="mb-1 font-semibold">{t("ann.new")}</h2>
        <p className="muted mb-3 text-sm">{t("ann.hint")}</p>
        <form action={postAnnouncement} className="space-y-3">
          <textarea name="body" rows={4} maxLength={2000} required dir="auto" className="input" placeholder={t("ann.placeholder")} />
          <label className="block text-sm">
            {t("ann.until")}
            <input type="date" name="until" min={today} className="input mt-1" />
          </label>
          <button className="btn">{t("ann.post")}</button>
        </form>
      </section>
      <section className="card mb-6">
        <h2 className="mb-1 font-semibold">{t("ann.showing", { count: showing.length })}</h2>
        {showing.length ? <ul>{showing.map(card)}</ul> : <p className="muted text-sm">{t("ann.none")}</p>}
      </section>
      {past.length > 0 && (
        <section className="card">
          <details>
            <summary className="cursor-pointer font-semibold">{t("ann.past", { count: past.length })}</summary>
            <ul className="mt-2">{past.map(card)}</ul>
          </details>
        </section>
      )}
    </>
  );
}

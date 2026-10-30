import { Header } from "@/components/ui";
import { requireAdmin, type Profile, type Punch } from "@/lib/session";
import { timeLabel } from "@/lib/time";
import { getT } from "@/lib/i18n/server";

type Edit = {
  id: number; punch_id: string; user_id: string; editor_id: string;
  action: "add" | "edit" | "delete"; before: Punch | null; after: Punch | null; reason: string; at: string;
};

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const { supabase, profile, settings } = await requireAdmin();
  const { t, intl } = await getT();
  const tz = settings.timezone;
  const [{ data: edits }, { data: people }] = await Promise.all([
    supabase.from("punch_edits").select("*").order("at", { ascending: false }).limit(200).returns<Edit[]>(),
    supabase.from("profiles").select("id, full_name, phone").returns<Profile[]>(),
  ]);
  const name = (id: string) => {
    const p = people?.find((x) => x.id === id);
    return p?.full_name || p?.phone || t("audit.removed");
  };
  const span = (p: Punch | null) =>
    p ? `${timeLabel(p.clock_in, tz, intl)} → ${p.clock_out ? timeLabel(p.clock_out, tz, intl) : t("common.open")}` : "–";

  return (
    <>
      <Header profile={profile} settings={settings} />
      <section className="card overflow-x-auto">
        <h2 className="mb-2 font-semibold">{t("audit.title")}</h2>
        <p className="muted mb-3 text-sm">{t("audit.intro")}</p>
        <table className="tbl">
          <thead><tr><th>{t("audit.when")}</th><th>{t("audit.by")}</th><th>{t("audit.for")}</th><th>{t("audit.action")}</th><th>{t("audit.before")}</th><th>{t("audit.after")}</th><th>{t("audit.reason")}</th></tr></thead>
          <tbody>
            {(edits ?? []).map((e) => (
              <tr key={e.id}>
                <td>{timeLabel(e.at, tz, intl)}</td>
                <td>{name(e.editor_id)}</td>
                <td>{name(e.user_id)}</td>
                <td>{t(`audit.${e.action}`)}</td>
                <td className="muted">{span(e.before)}</td>
                <td>{span(e.after)}</td>
                <td>{e.reason}</td>
              </tr>
            ))}
            {!edits?.length && <tr><td colSpan={7} className="muted">{t("audit.none")}</td></tr>}
          </tbody>
        </table>
      </section>
    </>
  );
}

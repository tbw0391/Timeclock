import { Flash, Header } from "@/components/ui";
import { formatPhone } from "@/lib/phone";
import { requireAdmin, type Profile } from "@/lib/session";
import { timeLabel } from "@/lib/time";
import { getT } from "@/lib/i18n/server";
import { setSuggestionStatus } from "../actions";

type Suggestion = { id: number; user_id: string | null; body: string; status: "new" | "done"; created_at: string };
type Props = { searchParams: Promise<{ error?: string; ok?: string }> };

export const dynamic = "force-dynamic";

export default async function SuggestionsPage({ searchParams }: Props) {
  const { error, ok } = await searchParams;
  const { supabase, profile, settings } = await requireAdmin();
  const { t, intl } = await getT();
  const [{ data: items }, { data: people }] = await Promise.all([
    supabase.from("suggestions").select("*").order("created_at", { ascending: false }).limit(300).returns<Suggestion[]>(),
    supabase.from("profiles").select("id, full_name, phone").returns<Profile[]>(),
  ]);
  const byId = new Map((people ?? []).map((p) => [p.id, p]));
  const fresh = (items ?? []).filter((s) => s.status === "new");
  const done = (items ?? []).filter((s) => s.status === "done");

  const list = (rows: Suggestion[], next: "new" | "done") => rows.map((s) => (
    <li key={s.id} className="border-t-2 border-dashed py-3" style={{ borderColor: "var(--soft-line)" }}>
      <p className="whitespace-pre-wrap">{s.body}</p>
      <div className="muted mt-1 flex flex-wrap items-center gap-3 text-sm">
        <span>{s.user_id ? byId.get(s.user_id)?.full_name || formatPhone(byId.get(s.user_id)?.phone) || t("suggest.formerStaff") : t("suggest.anonymousName")} · {timeLabel(s.created_at, settings.timezone, intl)}</span>
        <form action={setSuggestionStatus}>
          <input type="hidden" name="id" value={s.id} />
          <input type="hidden" name="status" value={next} />
          <button className="btn-ghost">{next === "done" ? t("suggest.markDone") : t("suggest.moveBack")}</button>
        </form>
      </div>
    </li>
  ));

  return (
    <>
      <Header profile={profile} settings={settings} />
      <Flash error={error} ok={ok} />
      <section className="card mb-6">
        <h2 className="mb-1 font-semibold">{t("suggest.newTitle", { count: fresh.length })}</h2>
        {fresh.length ? <ul>{list(fresh, "done")}</ul> : <p className="muted text-sm">{t("suggest.nothingNew")}</p>}
      </section>
      {done.length > 0 && (
        <section className="card">
          <details>
            <summary className="cursor-pointer font-semibold">{t("suggest.done", { count: done.length })}</summary>
            <ul className="mt-2">{list(done, "new")}</ul>
          </details>
        </section>
      )}
    </>
  );
}

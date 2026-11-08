import { Flash, Header } from "@/components/ui";
import { requireAdmin, type Profile } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/messages";
import { addDays, todayIn } from "@/lib/time";
import { dayCount, overlaps, rangeLabel, STATUS_STYLE, type TimeOff } from "@/lib/time-off";
import { decideTimeOff } from "./actions";

type Props = { searchParams: Promise<{ error?: string; ok?: string }> };

export const dynamic = "force-dynamic";

// Requests to decide, and who's out in the next few weeks.
export default async function TimeOffAdminPage({ searchParams }: Props) {
  const { error, ok } = await searchParams;
  const { supabase, profile, settings } = await requireAdmin();
  const { t, intl } = await getT();
  const today = todayIn(settings.timezone);
  const [{ data: rows }, { data: people }] = await Promise.all([
    supabase.from("time_off").select("*").gte("ends_on", addDays(today, -60)).order("starts_on").returns<TimeOff[]>(),
    supabase.from("profiles").select("id, full_name, phone").returns<Profile[]>(),
  ]);
  const all = rows ?? [];
  const nameOf = (id: string) => { const p = (people ?? []).find((x) => x.id === id); return p?.full_name || p?.phone || "—"; };
  const pending = all.filter((r) => r.status === "pending");
  const soon = all.filter((r) => overlaps(r, today, addDays(today, 30)));
  const decided = all.filter((r) => ["approved", "declined"].includes(r.status) && !soon.includes(r)).reverse();

  const line = (r: TimeOff) => (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-semibold">{nameOf(r.user_id)}</span>
      <span>{rangeLabel(r.starts_on, r.ends_on, intl)}</span>
      <span className="muted text-sm">{t("off.days", { count: dayCount(r.starts_on, r.ends_on) })} · {t(`off.kind.${r.kind}` as MessageKey)}</span>
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[r.status]}`}>{t(`off.status.${r.status}` as MessageKey)}</span>
    </div>
  );

  return (
    <>
      <Header profile={profile} settings={settings} />
      <Flash error={error} ok={ok} />
      <h1 className="mb-4 text-2xl font-bold">{t("off.adminTitle")}</h1>
      <section className="card mb-6">
        <h2 className="mb-1 font-semibold">{t("off.toDecide", { count: pending.length })}</h2>
        {pending.length ? (
          <ul>
            {pending.map((r) => {
              // Others already approved for any of the same days.
              const alsoOut = all.filter((o) => o.id !== r.id && o.user_id !== r.user_id && overlaps(o, r.starts_on, r.ends_on));
              return (
                <li key={r.id} className="border-t-2 border-dashed py-3" style={{ borderColor: "var(--soft-line)" }}>
                  {line(r)}
                  {r.note && <p className="muted mt-1 text-sm" dir="auto">{r.note}</p>}
                  {alsoOut.length > 0 && <p className="mt-1 text-sm text-amber-900">⚠️ {t("off.alsoOut", { names: [...new Set(alsoOut.map((o) => nameOf(o.user_id)))].join(", ") })}</p>}
                  <form action={decideTimeOff} className="mt-2 flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={r.id} />
                    <input name="note" maxLength={500} dir="auto" placeholder={t("off.replyNote")} className="input max-w-xs" />
                    <button name="status" value="approved" className="btn">{t("off.approve")}</button>
                    <button name="status" value="declined" className="btn-ghost">{t("off.decline")}</button>
                  </form>
                </li>
              );
            })}
          </ul>
        ) : <p className="muted text-sm">{t("off.nothingToDecide")}</p>}
      </section>
      <section className="card mb-6">
        <h2 className="mb-1 font-semibold">{t("off.whoOut")}</h2>
        {soon.length ? <ul className="space-y-2">{soon.map((r) => <li key={r.id}>{line(r)}</li>)}</ul> : <p className="muted text-sm">{t("off.nobodyOut")}</p>}
      </section>
      {decided.length > 0 && (
        <section className="card">
          <details>
            <summary className="cursor-pointer font-semibold">{t("off.decided", { count: decided.length })}</summary>
            <ul className="mt-2 space-y-2">
              {decided.map((r) => <li key={r.id}>{line(r)}{r.decision_note && <p className="muted text-sm" dir="auto">💬 {r.decision_note}</p>}</li>)}
            </ul>
          </details>
        </section>
      )}
    </>
  );
}

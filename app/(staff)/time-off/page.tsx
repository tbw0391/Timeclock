import { Flash, Header } from "@/components/ui";
import { getSession } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/messages";
import { addDays, todayIn } from "@/lib/time";
import { dayCount, rangeLabel, STATUS_STYLE, TIME_OFF_KINDS, type TimeOff } from "@/lib/time-off";
import { cancelTimeOff, requestTimeOff } from "./actions";

type Props = { searchParams: Promise<{ error?: string; ok?: string }> };

export const dynamic = "force-dynamic";

// Ask for days off, and see what's been decided.
export default async function TimeOffPage({ searchParams }: Props) {
  const { error, ok } = await searchParams;
  const { supabase, profile, settings } = await getSession();
  const { t, intl } = await getT();
  const { data: mine } = await supabase.from("time_off").select("*").eq("user_id", profile.id)
    .order("starts_on", { ascending: false }).limit(100).returns<TimeOff[]>();
  const today = todayIn(settings.timezone);
  const upcoming = (mine ?? []).filter((r) => r.ends_on >= today && r.status !== "cancelled");
  const past = (mine ?? []).filter((r) => !upcoming.includes(r));

  const item = (r: TimeOff) => (
    <li key={r.id} className="border-t-2 border-dashed py-3" style={{ borderColor: "var(--soft-line)" }}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{rangeLabel(r.starts_on, r.ends_on, intl)}</span>
        <span className="muted text-sm">{t("off.days", { count: dayCount(r.starts_on, r.ends_on) })} · {t(`off.kind.${r.kind}` as MessageKey)}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[r.status]}`}>{t(`off.status.${r.status}` as MessageKey)}</span>
      </div>
      {r.note && <p className="muted mt-1 text-sm" dir="auto">{r.note}</p>}
      {r.decision_note && <p className="mt-1 text-sm" dir="auto">💬 {r.decision_note}</p>}
      {["pending", "approved"].includes(r.status) && r.starts_on >= today && (
        <form action={cancelTimeOff} className="mt-2">
          <input type="hidden" name="id" value={r.id} />
          <button className="btn-ghost">{t("off.cancel")}</button>
        </form>
      )}
    </li>
  );

  return (
    <>
      <Header profile={profile} settings={settings} />
      <Flash error={error} ok={ok} />
      <h1 className="mb-4 text-2xl font-bold">{t("off.title")}</h1>
      <section className="card mb-6 max-w-lg">
        <h2 className="mb-3 font-semibold">{t("off.ask")}</h2>
        <form action={requestTimeOff} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">{t("off.first")}
              {/* Sick days can be put in afterwards, up to 30 days back. */}
              <input type="date" name="starts_on" required min={addDays(today, -30)} className="input mt-1" />
            </label>
            <label className="block text-sm">{t("off.last")}
              <input type="date" name="ends_on" min={addDays(today, -30)} className="input mt-1" />
            </label>
          </div>
          <p className="muted text-sm">{t("off.oneDay")}</p>
          <label className="block text-sm">{t("off.kind")}
            <select name="kind" className="input mt-1">
              {TIME_OFF_KINDS.map((k) => <option key={k} value={k}>{t(`off.kind.${k}` as MessageKey)}</option>)}
            </select>
          </label>
          <label className="block text-sm">{t("off.note")}
            <textarea name="note" rows={2} maxLength={500} dir="auto" className="input mt-1" />
          </label>
          <button className="btn">{t("off.send")}</button>
        </form>
      </section>
      <section className="card mb-6">
        <h2 className="mb-1 font-semibold">{t("off.upcoming")}</h2>
        {upcoming.length ? <ul>{upcoming.map(item)}</ul> : <p className="muted text-sm">{t("off.none")}</p>}
      </section>
      {past.length > 0 && (
        <section className="card">
          <details>
            <summary className="cursor-pointer font-semibold">{t("off.past", { count: past.length })}</summary>
            <ul className="mt-2">{past.map(item)}</ul>
          </details>
        </section>
      )}
    </>
  );
}

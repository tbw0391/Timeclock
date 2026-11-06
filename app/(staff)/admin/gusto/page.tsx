import { redirect } from "next/navigation";
import { Flash, Header } from "@/components/ui";
import { requireAdmin } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import { timeLabel } from "@/lib/time";
import { callGusto, gustoOn, type GustoEmployee, type GustoStatus } from "@/lib/gusto-sync";
import { gustoConnect, gustoDisconnect, gustoMatch, gustoSync, gustoSyncFrom } from "./actions";

type Person = { id: string; full_name: string; phone: string | null; active: boolean; gusto_employee_uuid: string | null };
type Props = { searchParams: Promise<{ error?: string; ok?: string; gusto?: string }> };

export const dynamic = "force-dynamic";

// Live Gusto connection: match people, send hours. Hidden unless GUSTO=on.
export default async function GustoPage({ searchParams }: Props) {
  if (!gustoOn()) redirect("/admin");
  const { error, ok, gusto: backFrom } = await searchParams;
  const { supabase, profile, settings } = await requireAdmin();
  const { t, intl } = await getT();
  // Loading Gusto's employees also matches anyone whose name is an exact fit,
  // so it goes before reading the people and the status.
  const list = await callGusto<{ employees: GustoEmployee[] }>("employees");
  const [status, { data: people }] = await Promise.all([
    callGusto<GustoStatus>("status"),
    supabase.from("profiles").select("id, full_name, phone, active, gusto_employee_uuid").order("full_name").returns<Person[]>(),
  ]);
  const s = status.data;
  const employees = list.data?.employees ?? [];
  // Where Gusto sends the manager back after connecting.
  const flash = backFrom === "connected" ? { ok: t("gusto.connected") }
    : backFrom === "cancelled" ? { error: t("gusto.cancelled") }
    : backFrom === "failed" ? { error: t("gusto.failed") } : {};

  return (
    <>
      <Header profile={profile} settings={settings} />
      <Flash error={error ?? flash.error} ok={ok ?? flash.ok} />
      <h1 className="mb-4 text-2xl font-bold">{t("gusto.title")}</h1>
      <section className="card mb-6 max-w-lg">
        <p className="muted mb-3 text-sm">{t("gusto.intro")}</p>
        {status.error || !s ? (
          <p className="text-sm text-red-700">{status.error}</p>
        ) : !s.configured ? (
          <p className="text-sm">{t("gusto.notConfigured")}</p>
        ) : !s.connected ? (
          <form action={gustoConnect}>
            <button className="btn">{t("gusto.connect")}</button>
          </form>
        ) : (
          <div className="space-y-3 text-sm">
            <p className="font-semibold">
              {t("gusto.connectedTo", { company: s.company || "Gusto" })}
              {s.demo && <span className="muted"> · {t("gusto.demo")}</span>}
            </p>
            <form action={gustoSyncFrom} className="flex flex-wrap items-end gap-2">
              <label>{t("gusto.syncFrom")}
                <input type="date" name="date" defaultValue={s.sync_from ?? ""} className="input mt-1" required />
              </label>
              <button className="btn-ghost">{t("gusto.saveDate")}</button>
            </form>
            <p>
              {t("gusto.pending", { count: s.pending ?? 0 })}
              {s.last_sync_at && <span className="muted"> · {t("gusto.lastSync", { time: timeLabel(s.last_sync_at, settings.timezone, intl) })}</span>}
            </p>
            {s.unmatched > 0 && <p className="text-amber-700">{t("gusto.unmatched", { count: s.unmatched })}</p>}
            {s.last_error && <p className="whitespace-pre-wrap text-amber-700">{t("gusto.problems")} {s.last_error}</p>}
            <div className="flex flex-wrap gap-3">
              <form action={gustoSync}><button className="btn">{t("gusto.syncNow")}</button></form>
              <form action={gustoDisconnect}><button className="btn-ghost">{t("gusto.disconnect")}</button></form>
            </div>
            <p className="muted">{t("gusto.payrollHint")}</p>
          </div>
        )}
      </section>

      {s?.connected && (
        <section className="card overflow-x-auto">
          <h2 className="mb-1 font-semibold">{t("gusto.people")}</h2>
          <p className="muted mb-3 text-sm">{t("gusto.peopleHint")}</p>
          {list.error && <p className="mb-3 text-sm text-red-700">{list.error}</p>}
          <table className="tbl">
            <tbody>
              {(people ?? []).map((p) => (
                <tr key={p.id} className={p.active ? "" : "muted"}>
                  <td>{p.full_name || p.phone}</td>
                  <td>
                    <form action={gustoMatch} className="flex flex-wrap gap-2">
                      <input type="hidden" name="user" value={p.id} />
                      <select name="employee" defaultValue={p.gusto_employee_uuid ?? ""} className="input" dir="ltr">
                        <option value="">{t("gusto.notMatched")}</option>
                        {employees.map((e) => <option key={e.uuid} value={e.uuid}>{e.name}</option>)}
                      </select>
                      <button className="btn-ghost">{t("common.save")}</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}

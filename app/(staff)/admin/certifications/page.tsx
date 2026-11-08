import { Flash, Header } from "@/components/ui";
import { requireAdmin, type Profile } from "@/lib/session";
import { dateLabel, todayIn } from "@/lib/time";
import { getT } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/messages";
import { byUrgency, CERT_STYLE, certStatus, CERT_SUGGESTIONS, type Cert } from "@/lib/certifications";
import { deleteCertification, saveCertification } from "./actions";

type Props = { searchParams: Promise<{ error?: string; ok?: string }> };

export const dynamic = "force-dynamic";

// Everyone's certifications, with what's expired or running out at the top.
export default async function CertificationsPage({ searchParams }: Props) {
  const { error, ok } = await searchParams;
  const { supabase, profile, settings } = await requireAdmin();
  const { t, intl } = await getT();
  const [{ data: people }, { data: certs }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, phone, active").eq("active", true).order("full_name").returns<Profile[]>(),
    supabase.from("certifications").select("id, user_id, kind, expires_on, note").returns<Cert[]>(),
  ]);
  const today = todayIn(settings.timezone);
  const staff = people ?? [];
  const nameOf = (id: string) => { const p = staff.find((x) => x.id === id); return p?.full_name || p?.phone || "—"; };
  const all = (certs ?? []).filter((c) => staff.some((p) => p.id === c.user_id)).sort(byUrgency);
  const due = all.filter((c) => ["expired", "soon"].includes(certStatus(c.expires_on, today)));

  const badge = (c: Cert) => {
    const s = certStatus(c.expires_on, today);
    const label = s === "never" ? t("cert.never") : t(`cert.${s}` as MessageKey, { date: dateLabel(c.expires_on!, intl) });
    return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${CERT_STYLE[s]}`}>{label}</span>;
  };

  return (
    <>
      <Header profile={profile} settings={settings} />
      <Flash error={error} ok={ok} />
      <h1 className="mb-1 text-2xl font-bold">{t("cert.title")}</h1>
      <p className="muted mb-4 text-sm">{t("cert.intro")}</p>
      <datalist id="cert-kinds">{CERT_SUGGESTIONS.map((k) => <option key={k} value={k} />)}</datalist>

      <section className="card mb-6">
        <h2 className="mb-2 font-semibold">{t("cert.attention", { count: due.length })}</h2>
        {due.length ? (
          <ul className="space-y-1">
            {due.map((c) => <li key={c.id} className="flex flex-wrap items-center gap-2"><span className="font-semibold">{nameOf(c.user_id)}</span> · <span dir="auto">{c.kind}</span> {badge(c)}</li>)}
          </ul>
        ) : <p className="muted text-sm">{t("cert.allGood")}</p>}
      </section>

      <div className="space-y-4">
        {staff.map((p) => {
          const mine = all.filter((c) => c.user_id === p.id);
          return (
            <section key={p.id} id={`p-${p.id}`} className="card">
              <h2 className="mb-2 text-lg font-bold">{p.full_name || p.phone}</h2>
              {mine.length === 0 && <p className="muted mb-2 text-sm">{t("cert.noneYet")}</p>}
              <ul className="space-y-3">
                {mine.map((c) => (
                  <li key={c.id}>
                    <form action={saveCertification} className="grid items-end gap-2 sm:grid-cols-[1fr_10rem_1fr_auto]">
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="user_id" value={p.id} />
                      <label className="block text-sm">{t("cert.kind")} {badge(c)}
                        <input name="kind" list="cert-kinds" required maxLength={80} defaultValue={c.kind} dir="auto" className="input mt-1" />
                      </label>
                      <label className="block text-sm">{t("cert.expires")}
                        <input type="date" name="expires_on" defaultValue={c.expires_on ?? ""} className="input mt-1" />
                      </label>
                      <label className="block text-sm">{t("cert.note")}
                        <input name="note" maxLength={200} defaultValue={c.note} dir="auto" className="input mt-1" />
                      </label>
                      <div className="flex gap-2">
                        <button className="btn-ghost">{t("common.save")}</button>
                        <button formAction={deleteCertification} className="btn-ghost">{t("cert.remove")}</button>
                      </div>
                    </form>
                  </li>
                ))}
              </ul>
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-semibold">{t("cert.add")}</summary>
                <form action={saveCertification} className="mt-2 grid items-end gap-2 sm:grid-cols-[1fr_10rem_1fr_auto]">
                  <input type="hidden" name="user_id" value={p.id} />
                  <label className="block text-sm">{t("cert.kind")}
                    <input name="kind" list="cert-kinds" required maxLength={80} dir="auto" className="input mt-1" />
                  </label>
                  <label className="block text-sm">{t("cert.expires")}
                    <input type="date" name="expires_on" className="input mt-1" />
                  </label>
                  <label className="block text-sm">{t("cert.note")}
                    <input name="note" maxLength={200} dir="auto" className="input mt-1" />
                  </label>
                  <button className="btn">{t("cert.addButton")}</button>
                </form>
              </details>
            </section>
          );
        })}
      </div>
    </>
  );
}

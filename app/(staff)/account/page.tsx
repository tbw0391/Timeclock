import { Flash, Header } from "@/components/ui";
import { getSession } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import { formatPhone } from "@/lib/phone";
import { setMyKioskPin } from "../actions";
import { byUrgency, CERT_STYLE, certStatus, type Cert } from "@/lib/certifications";
import type { MessageKey } from "@/lib/i18n/messages";
import { dateLabel, todayIn } from "@/lib/time";

type Props = { searchParams: Promise<{ error?: string; ok?: string }> };

export default async function AccountPage({ searchParams }: Props) {
  const { error, ok } = await searchParams;
  const { supabase, profile, settings } = await getSession();
  const { t, intl } = await getT();
  const [{ data: pinSet }, { data: certs }] = await Promise.all([
    supabase.rpc("my_kiosk_pin_set"),
    supabase.from("certifications").select("id, user_id, kind, expires_on, note").eq("user_id", profile.id).returns<Cert[]>(),
  ]);
  const today = todayIn(settings.timezone);
  return (
    <>
      <Header profile={profile} settings={settings} />
      <Flash error={error} ok={ok} />
      <div className="card max-w-sm space-y-3">
        <p><span className="muted">{t("account.signedInAs")}</span> <span dir="ltr">{formatPhone(profile.phone)}</span></p>
        <p className="muted text-sm">{t("account.signInHow")}</p>
      </div>
      <div className="card mt-4 max-w-sm space-y-3">
        <h2 className="font-semibold">{t("account.kioskPin")} {pinSet ? "✓" : ""}</h2>
        <p className="muted text-sm">{pinSet ? t("account.kioskPinSet") : t("account.kioskPinNone")}</p>
        <form action={setMyKioskPin} className="flex gap-2">
          <input name="pin" type="password" inputMode="numeric" pattern="\d{4}" maxLength={4} placeholder={t("account.fourDigits")} className="input" required autoComplete="off" />
          <button className="btn">{t("common.save")}</button>
        </form>
      </div>
      <div className="card mt-4 max-w-sm space-y-2">
        <h2 className="font-semibold">🎓 {t("account.certs")}</h2>
        {(certs ?? []).length ? (
          <ul className="space-y-1">
            {(certs ?? []).sort(byUrgency).map((c) => {
              const s = certStatus(c.expires_on, today);
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-2">
                  <span dir="auto">{c.kind}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${CERT_STYLE[s]}`}>
                    {s === "never" ? t("cert.never") : t(`cert.${s}` as MessageKey, { date: dateLabel(c.expires_on!, intl) })}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : <p className="muted text-sm">{t("account.certsNone")}</p>}
      </div>
      <div className="card mt-4 max-w-sm space-y-2 text-sm">
        <h2 className="font-semibold">{t("account.homeScreen")}</h2>
        <p>{t("account.iphone")}</p>
        <p>{t("account.android")}</p>
      </div>
    </>
  );
}

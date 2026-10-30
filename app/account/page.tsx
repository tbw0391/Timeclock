import { Flash, Header } from "@/components/ui";
import { getSession } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import { formatPhone } from "@/lib/phone";
import { setMyKioskPin } from "../actions";

type Props = { searchParams: Promise<{ error?: string; ok?: string }> };

export default async function AccountPage({ searchParams }: Props) {
  const { error, ok } = await searchParams;
  const { supabase, profile, settings } = await getSession();
  const { t } = await getT();
  const { data: pinSet } = await supabase.rpc("my_kiosk_pin_set");
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
      <div className="card mt-4 max-w-sm space-y-2 text-sm">
        <h2 className="font-semibold">{t("account.homeScreen")}</h2>
        <p>{t("account.iphone")}</p>
        <p>{t("account.android")}</p>
      </div>
    </>
  );
}

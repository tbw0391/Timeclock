import Image from "next/image";
import Link from "next/link";
import { Flash } from "@/components/ui";
import { LanguagePicker } from "@/components/LanguagePicker";
import { getT } from "@/lib/i18n/server";
import { formatPhone, normalizePhone } from "@/lib/phone";
import { sendCode, verifyCode } from "./actions";

type Props = { searchParams: Promise<{ phone?: string; error?: string; ok?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const sp = await searchParams;
  const { t, locale } = await getT();
  const phone = normalizePhone(sp.phone ?? "");
  return (
    <div className="mx-auto mt-6 max-w-sm">
      <div className="mb-6 flex justify-center"><LanguagePicker current={locale} label={t("common.language")} /></div>
      <h1 className="mb-6">
        <Image src="/brand/kite-wordmark.png" alt="The KITE Learning Center" width={900} height={355} priority className="h-auto w-full" />
        <span className="mt-2 block text-center text-lg font-semibold">{t("app.timeclock")}</span>
      </h1>
      <Flash error={sp.error} ok={sp.ok} />
      <div className="card">
        {phone ? (
          <form action={verifyCode} className="space-y-3">
            <p className="text-sm">{t("login.enterCode", { phone: "⁦" + formatPhone(phone) + "⁩" })}</p>
            <input type="hidden" name="phone" value={phone} />
            <input name="code" inputMode="numeric" pattern="\d{6,10}" placeholder={t("login.code")} className="input" required autoFocus autoComplete="one-time-code" dir="ltr" />
            <button className="btn w-full">{t("login.signIn")}</button>
          </form>
        ) : (
          <form action={sendCode} className="space-y-3">
            <input name="phone" type="tel" inputMode="tel" placeholder={t("common.phoneNumber")} className="input" required autoComplete="tel" dir="ltr" />
            <button className="btn w-full">{t("login.textMe")}</button>
          </form>
        )}
      </div>
      <div className="muted mt-4 flex justify-between gap-3 text-sm">
        {phone ? (
          <>
            <Link href="/login">{t("login.differentNumber")}</Link>
            <form action={sendCode}>
              <input type="hidden" name="phone" value={phone} />
              <button className="underline">{t("login.sendNew")}</button>
            </form>
          </>
        ) : <span>{t("login.newHere")}</span>}
      </div>
    </div>
  );
}

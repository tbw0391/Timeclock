import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { KIOSK_COOKIE, type KioskPerson } from "@/lib/kiosk";
import { KioskBoard, type KioskText } from "@/components/KioskBoard";

export const dynamic = "force-dynamic";

// The shared-tablet screen. It runs without anyone signed in; the device's
// kiosk cookie is what lets it list people and punch. Kiosks are English-only
// (see getLocale).
export default async function KioskPage() {
  const { t } = await getT();
  const token = (await cookies()).get(KIOSK_COOKIE)?.value;
  const supabase = await createClient();
  const [roster, info] = token
    ? await Promise.all([
        supabase.rpc("kiosk_roster", { p_token: token }),
        supabase.rpc("kiosk_settings", { p_token: token }).single<{ kiosk_name: string; business_name: string; timezone: string }>(),
      ])
    : [null, null];

  if (!token || roster?.error || info?.error || !info?.data) {
    return (
      <div className="mx-auto mt-10 max-w-md space-y-4">
        <div className="card space-y-3 text-center">
          <h1 className="text-xl font-semibold">{t("kiosk.notKioskTitle")}</h1>
          <p className="muted">{t("kiosk.notKioskBody")}</p>
          <Link href="/login" className="btn">{t("kiosk.goSignIn")}</Link>
        </div>
      </div>
    );
  }

  const text: KioskText = {
    tapName: t("kiosk.tapName"), whichManager: t("kiosk.whichManager"), onClock: t("kiosk.onClock"),
    offClock: t("kiosk.offClock"), nobody: t("kiosk.nobody"), needsPin: t("kiosk.needsPin"), hi: t("kiosk.hi"),
    enterPinIn: t("kiosk.enterPinIn"), enterPinOut: t("kiosk.enterPinOut"), enterPinExit: t("kiosk.enterPinExit"),
    pinHint: t("kiosk.pinHint"), digitsEntered: t("kiosk.digitsEntered"), checking: t("kiosk.checking"),
    deleteDigit: t("kiosk.deleteDigit"), turnOff: t("kiosk.turnOff"), cancel: t("common.cancel"), back: t("common.back"),
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Image src="/brand/kite.png" alt="" width={28} height={49} priority />
          <div>
            <p className="text-xl font-bold">{info.data.business_name}</p>
            <p className="muted text-sm">{t("kiosk.label", { name: info.data.kiosk_name })}</p>
          </div>
        </div>
      </div>
      <KioskBoard people={(roster?.data ?? []) as KioskPerson[]} tz={info.data.timezone} text={text} />
    </div>
  );
}

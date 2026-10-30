"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { text } from "@/lib/flash";
import { KIOSK_COOKIE, type KioskResult } from "@/lib/kiosk";
import { getT } from "@/lib/i18n/server";

type Punched = { ok: boolean; error?: string; action?: "in" | "out"; at?: string; clock_in?: string };

function num(form: FormData, k: string) {
  const n = Number.parseFloat(text(form, k));
  return Number.isFinite(n) ? n : null;
}

export async function kioskPunch(_prev: KioskResult | null, form: FormData): Promise<KioskResult> {
  const { t, db, intl } = await getT();
  const token = (await cookies()).get(KIOSK_COOKIE)?.value ?? "";
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("kiosk_punch", {
    p_token: token,
    p_user: text(form, "user_id"),
    p_pin: text(form, "pin"),
    p_lat: num(form, "lat"),
    p_lng: num(form, "lng"),
    p_accuracy: num(form, "accuracy"),
    p_gps: text(form, "gps") || null,
  });
  const r = data as Punched | null;
  if (error || !r) return { ok: false, message: error ? db(error.message) : t("common.somethingWrong"), nonce: Date.now() };
  if (!r.ok) return { ok: false, message: db(r.error ?? t("common.somethingWrong")), nonce: Date.now() };

  const tz = text(form, "tz") || "America/New_York";
  const time = new Date(r.at!).toLocaleTimeString(intl, { timeZone: tz, hour: "numeric", minute: "2-digit" });
  const name = text(form, "name");
  if (r.action === "in") return { ok: true, action: "in", message: t("kiosk.clockedIn", { name, time }), nonce: Date.now() };
  const hrs = ((Date.parse(r.at!) - Date.parse(r.clock_in!)) / 3_600_000).toFixed(2);
  return { ok: true, action: "out", message: t("kiosk.clockedOut", { name, time, hours: hrs }), nonce: Date.now() };
}

export async function kioskExit(_prev: KioskResult | null, form: FormData): Promise<KioskResult> {
  const { t, db } = await getT();
  const store = await cookies();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("kiosk_exit", {
    p_token: store.get(KIOSK_COOKIE)?.value ?? "",
    p_user: text(form, "user_id"),
    p_pin: text(form, "pin"),
  });
  const r = data as Punched | null;
  if (error || !r) return { ok: false, message: error ? db(error.message) : t("common.somethingWrong"), nonce: Date.now() };
  if (!r.ok) return { ok: false, message: db(r.error ?? t("common.somethingWrong")), nonce: Date.now() };
  store.delete(KIOSK_COOKIE);
  redirect(`/login?ok=${encodeURIComponent(t("login.kioskOff"))}`);
}

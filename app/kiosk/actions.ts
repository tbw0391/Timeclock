"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { text } from "@/lib/flash";
import { KIOSK_COOKIE, type KioskResult } from "@/lib/kiosk";

type Punched = { ok: boolean; error?: string; action?: "in" | "out"; at?: string; clock_in?: string };

function num(form: FormData, k: string) {
  const n = Number.parseFloat(text(form, k));
  return Number.isFinite(n) ? n : null;
}

export async function kioskPunch(_prev: KioskResult | null, form: FormData): Promise<KioskResult> {
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
  if (error || !r) return { ok: false, message: error?.message ?? "Something went wrong. Try again.", nonce: Date.now() };
  if (!r.ok) return { ok: false, message: r.error ?? "Try again.", nonce: Date.now() };

  const tz = text(form, "tz") || "America/New_York";
  const time = new Date(r.at!).toLocaleTimeString("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" });
  const name = text(form, "name");
  if (r.action === "in") return { ok: true, message: `${name} clocked IN at ${time}`, nonce: Date.now() };
  const hrs = ((Date.parse(r.at!) - Date.parse(r.clock_in!)) / 3_600_000).toFixed(2);
  return { ok: true, message: `${name} clocked OUT at ${time} · ${hrs} h`, nonce: Date.now() };
}

export async function kioskExit(_prev: KioskResult | null, form: FormData): Promise<KioskResult> {
  const store = await cookies();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("kiosk_exit", {
    p_token: store.get(KIOSK_COOKIE)?.value ?? "",
    p_user: text(form, "user_id"),
    p_pin: text(form, "pin"),
  });
  const r = data as Punched | null;
  if (error || !r) return { ok: false, message: error?.message ?? "Something went wrong. Try again.", nonce: Date.now() };
  if (!r.ok) return { ok: false, message: r.error ?? "Try again.", nonce: Date.now() };
  store.delete(KIOSK_COOKIE);
  redirect("/login?ok=Kiosk+mode+is+off+on+this+device.");
}

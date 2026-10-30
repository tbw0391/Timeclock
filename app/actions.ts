"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { back, text } from "@/lib/flash";
import { getT } from "@/lib/i18n/server";

// Location fields set by ClockForm; the database validates them.
function gps(form: FormData) {
  const num = (k: string) => {
    const n = Number.parseFloat(text(form, k));
    return Number.isFinite(n) ? n : null;
  };
  return { p_lat: num("lat"), p_lng: num("lng"), p_accuracy: num("accuracy"), p_gps: text(form, "gps") || null };
}

export async function clockIn(form: FormData) {
  const { t, db } = await getT();
  const supabase = await createClient();
  const { error } = await supabase.rpc("clock_in", { p_note: text(form, "note"), ...gps(form) });
  if (error) back("/time", { error: db(error.message) });
  revalidatePath("/", "layout");
  back("/time", { ok: t("time.clockedIn") });
}

export async function clockOut(form: FormData) {
  const { t, db } = await getT();
  const supabase = await createClient();
  const { error } = await supabase.rpc("clock_out", { p_note: text(form, "note"), ...gps(form) });
  if (error) back("/time", { error: db(error.message) });
  revalidatePath("/", "layout");
  back("/time", { ok: t("time.clockedOut") });
}

export async function setMyKioskPin(form: FormData) {
  const { t, db } = await getT();
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_my_kiosk_pin", { p_pin: text(form, "pin") });
  if (error) back("/account", { error: db(error.message) });
  back("/account", { ok: t("account.pinSaved") });
}

export async function sendSuggestion(form: FormData) {
  const { t, db } = await getT();
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_suggestion", {
    p_body: text(form, "body"),
    p_anonymous: form.get("anonymous") === "on",
  });
  if (error) back("/suggest", { error: db(error.message) });
  back("/suggest", { ok: t("suggest.thanks") });
}

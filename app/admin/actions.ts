"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { back, text } from "@/lib/flash";
import { KIOSK_COOKIE, KIOSK_COOKIE_MAX_AGE } from "@/lib/kiosk";

function returnTo(form: FormData, fallback: string) {
  const r = text(form, "return_to");
  return r.startsWith("/admin") ? r : fallback;
}

// Turns the device the manager is using into a kiosk: it gets the kiosk token
// as a cookie, and the manager is signed out so the tablet holds no session.
export async function startKiosk(form: FormData) {
  const supabase = await createClient();
  const { data: token, error } = await supabase.rpc("admin_create_kiosk", { p_name: text(form, "name") });
  if (error || !token) back("/admin", { error: error?.message ?? "Couldn't set up the kiosk" });
  await supabase.auth.signOut();
  (await cookies()).set(KIOSK_COOKIE, token as string, {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: KIOSK_COOKIE_MAX_AGE,
  });
  redirect("/kiosk");
}

export async function deleteKiosk(form: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_delete_kiosk", { p_id: text(form, "id") });
  if (error) back("/admin", { error: error.message });
  revalidatePath("/admin");
  back("/admin", { ok: "Kiosk removed. That device can no longer clock people in." });
}

export async function setKioskPin(form: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_kiosk_pin", { p_user: text(form, "id"), p_pin: text(form, "pin") });
  if (error) back("/admin", { error: error.message });
  revalidatePath("/admin");
  back("/admin", { ok: "Kiosk PIN set." });
}

export async function setSuggestionStatus(form: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_suggestion_status", {
    p_id: Number(text(form, "id")),
    p_status: text(form, "status") === "done" ? "done" : "new",
  });
  if (error) back("/admin/suggestions", { error: error.message });
  revalidatePath("/admin", "layout");
  back("/admin/suggestions", {});
}

export async function saveEmployee(form: FormData) {
  const supabase = await createClient();
  const role = text(form, "role") === "admin" ? "admin" : "employee";
  const { error } = await supabase.rpc("admin_set_employee", {
    p_user: text(form, "id"),
    p_name: text(form, "full_name"),
    p_role: role,
    p_active: form.get("active") === "on",
  });
  if (error) back("/admin", { error: error.message });
  revalidatePath("/admin");
  back("/admin", { ok: "Saved." });
}

export async function savePunch(form: FormData) {
  const to = returnTo(form, "/admin/timesheets");
  const clockIn = text(form, "clock_in");
  if (!clockIn) back(to, { error: "Clock-in time is required" });
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_save_punch", {
    p_id: text(form, "id") || null,
    p_user: text(form, "user_id"),
    p_in: clockIn,
    p_out: text(form, "clock_out") || null,
    p_note: text(form, "note"),
    p_reason: text(form, "reason"),
  });
  if (error) back(to, { error: error.message });
  revalidatePath("/admin", "layout");
  back(to, { ok: "Punch saved." });
}

export async function deletePunch(form: FormData) {
  const to = returnTo(form, "/admin/timesheets");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_delete_punch", {
    p_id: text(form, "id"),
    p_reason: text(form, "reason"),
  });
  if (error) back(to, { error: error.message });
  revalidatePath("/admin", "layout");
  back(to, { ok: "Punch deleted." });
}

export async function saveSettings(form: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_settings", {
    p_business_name: text(form, "business_name") || "Timeclock",
    p_timezone: text(form, "timezone"),
    p_week_starts_on: Number(text(form, "week_starts_on")),
    p_overtime_hours: Number(text(form, "overtime_hours")),
  });
  if (error) back("/admin", { error: error.message });
  revalidatePath("/", "layout");
  back("/admin", { ok: "Settings saved." });
}

export async function createEmployee(form: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_create_employee", {
    p_name: text(form, "full_name"),
    p_phone: text(form, "phone"),
  });
  if (error) back("/admin", { error: error.message });
  revalidatePath("/admin");
  back("/admin", { ok: "Added. They sign in with their phone number and get a code by text." });
}

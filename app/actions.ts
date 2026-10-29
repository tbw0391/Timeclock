"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { back, text } from "@/lib/flash";
import { isPin } from "@/lib/phone";

export async function clockIn(form: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("clock_in", { p_note: text(form, "note") });
  if (error) back("/", { error: error.message });
  revalidatePath("/");
  back("/", { ok: "Clocked in." });
}

export async function clockOut(form: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("clock_out", { p_note: text(form, "note") });
  if (error) back("/", { error: error.message });
  revalidatePath("/");
  back("/", { ok: "Clocked out." });
}

export async function changePin(form: FormData) {
  const password = text(form, "pin");
  if (!isPin(password)) back("/account", { error: "PIN must be at least 6 digits" });
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) back("/account", { error: error.message });
  back("/account", { ok: "PIN updated." });
}

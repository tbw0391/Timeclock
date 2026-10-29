"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { back, text } from "@/lib/flash";

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

export async function changePassword(form: FormData) {
  const password = text(form, "password");
  if (password.length < 8) back("/account", { error: "Use at least 8 characters" });
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) back("/account", { error: error.message });
  back("/account", { ok: "Password updated." });
}

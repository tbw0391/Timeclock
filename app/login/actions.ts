"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { back, text } from "@/lib/flash";

async function origin() {
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
}

export async function signIn(form: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: text(form, "email"),
    password: text(form, "password"),
  });
  if (error) back("/login", { error: error.message });
  redirect("/");
}

export async function signUp(form: FormData) {
  const name = text(form, "full_name");
  if (!name) back("/login?mode=signup", { error: "Enter your name" });
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: text(form, "email"),
    password: text(form, "password"),
    options: { data: { full_name: name }, emailRedirectTo: `${await origin()}/auth/callback` },
  });
  if (error) back("/login?mode=signup", { error: error.message });
  if (!data.session) back("/login", { ok: "Check your email to confirm your account, then sign in." });
  redirect("/");
}

export async function resetPassword(form: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(text(form, "email"), {
    redirectTo: `${await origin()}/auth/callback?next=/account`,
  });
  if (error) back("/login?mode=reset", { error: error.message });
  back("/login", { ok: "If that email has an account, a reset link is on its way." });
}

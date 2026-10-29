"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { back, text } from "@/lib/flash";
import { isPin, normalizePhone, phoneEmail } from "@/lib/phone";

export async function signIn(form: FormData) {
  const phone = normalizePhone(text(form, "phone"));
  if (!phone) back("/login", { error: "Enter your 10-digit phone number" });
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: phoneEmail(phone),
    password: text(form, "pin"),
  });
  if (error) back("/login", { error: "Wrong phone number or PIN" });
  redirect("/");
}

// Only the manager's number can sign up; the database trigger rejects the rest.
export async function signUp(form: FormData) {
  const name = text(form, "full_name");
  const phone = normalizePhone(text(form, "phone"));
  const pin = text(form, "pin");
  if (!name) back("/login?mode=setup", { error: "Enter your name" });
  if (!phone) back("/login?mode=setup", { error: "Enter your 10-digit phone number" });
  if (!isPin(pin)) back("/login?mode=setup", { error: "PIN must be at least 6 digits" });
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: phoneEmail(phone),
    password: pin,
    options: { data: { full_name: name, phone } },
  });
  if (error) {
    // The trigger's own message doesn't make it through Supabase Auth.
    const msg = /database error/i.test(error.message)
      ? "Only the manager can set up an account here. Ask your manager to add you."
      : /already registered/i.test(error.message)
        ? "That number already has an account. Sign in instead."
        : error.message;
    back("/login?mode=setup", { error: msg });
  }
  if (!data.session) {
    back("/login", { error: "Account created, but Supabase is asking for email confirmation. Turn off Confirm email under Authentication → Providers → Email." });
  }
  redirect("/");
}

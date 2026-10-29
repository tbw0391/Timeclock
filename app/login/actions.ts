"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { back, text } from "@/lib/flash";
import { isPin, loginEmail, normalizePhone } from "@/lib/phone";

export async function signIn(form: FormData) {
  const phone = normalizePhone(text(form, "phone"));
  if (!phone) back("/login", { error: "Enter a 10-digit phone number" });
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: loginEmail(phone),
    password: text(form, "pin"),
  });
  if (error) back("/login", { error: "Phone number or PIN is wrong" });
  redirect("/");
}

export async function signUp(form: FormData) {
  const name = text(form, "full_name");
  const phone = normalizePhone(text(form, "phone"));
  const pin = text(form, "pin");
  if (!name) back("/login?mode=signup", { error: "Enter your name" });
  if (!phone) back("/login?mode=signup", { error: "Enter a 10-digit phone number" });
  if (!isPin(pin)) back("/login?mode=signup", { error: "PIN must be at least 6 digits" });
  if (pin !== text(form, "pin2")) back("/login?mode=signup", { error: "PINs don't match" });
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: loginEmail(phone),
    password: pin,
    options: { data: { full_name: name, phone } },
  });
  if (error) {
    const taken = /already registered/i.test(error.message);
    back("/login?mode=signup", {
      error: taken ? "That phone number already has an account. Sign in instead."
        : /database error/i.test(error.message) ? "Only the manager sets up here. Ask your manager to add you."
        : error.message,
    });
  }
  if (!data.session) back("/login", { error: "Account created but sign-in is blocked. Ask the manager to check the Supabase email settings." });
  redirect("/");
}

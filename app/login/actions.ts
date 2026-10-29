"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { back, text } from "@/lib/flash";
import { e164, isCode, normalizePhone } from "@/lib/phone";

// Texts a sign-in code. shouldCreateUser lets the manager's first sign-in create
// their account; the database trigger refuses any number nobody added, so no
// account is made and no text goes out.
export async function sendCode(form: FormData) {
  const phone = normalizePhone(text(form, "phone"));
  if (!phone) back("/login", { error: "Enter a 10-digit phone number" });
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    phone: e164(phone),
    options: { shouldCreateUser: true, channel: "sms" },
  });
  if (error) {
    back("/login", {
      error: /database error/i.test(error.message)
        ? "That number isn't set up. Ask your manager to add you."
        : error.message,
    });
  }
  back(`/login?phone=${phone}`, { ok: "Code sent. It may take a minute to arrive." });
}

export async function verifyCode(form: FormData) {
  const phone = normalizePhone(text(form, "phone"));
  if (!phone) back("/login", { error: "Enter a 10-digit phone number" });
  const code = text(form, "code").replace(/\s/g, "");
  if (!isCode(code)) back(`/login?phone=${phone}`, { error: "Enter the code from the text" });
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ phone: e164(phone), token: code, type: "sms" });
  if (error) {
    back(`/login?phone=${phone}`, {
      error: error.code === "otp_expired" ? "That code is wrong or has expired. Try again or send a new one." : error.message,
    });
  }
  redirect("/");
}

"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { back, text } from "@/lib/flash";
import { getT } from "@/lib/i18n/server";
import { e164, isCode, normalizePhone } from "@/lib/phone";

// Texts a sign-in code. shouldCreateUser lets the manager's first sign-in create
// their account; the database trigger refuses any number nobody added, so no
// account is made and no text goes out.
export async function sendCode(form: FormData) {
  const { t } = await getT();
  const phone = normalizePhone(text(form, "phone"));
  if (!phone) back("/login", { error: t("login.enter10") });
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    phone: e164(phone),
    options: { shouldCreateUser: true, channel: "sms" },
  });
  if (error) {
    back("/login", { error: /database error/i.test(error.message) ? t("login.notSetUp") : error.message });
  }
  back(`/login?phone=${phone}`, { ok: t("login.codeSent") });
}

export async function verifyCode(form: FormData) {
  const { t } = await getT();
  const phone = normalizePhone(text(form, "phone"));
  if (!phone) back("/login", { error: t("login.enter10") });
  const code = text(form, "code").replace(/\s/g, "");
  if (!isCode(code)) back(`/login?phone=${phone}`, { error: t("login.enterTheCode") });
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ phone: e164(phone), token: code, type: "sms" });
  if (error) {
    back(`/login?phone=${phone}`, { error: error.code === "otp_expired" ? t("login.badCode") : error.message });
  }
  redirect("/");
}

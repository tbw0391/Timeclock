import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  email: string;
  phone: string | null;
  full_name: string;
  role: "employee" | "admin";
  active: boolean;
  created_at: string;
};

export type Settings = {
  business_name: string;
  timezone: string;
  week_starts_on: number;
  overtime_hours: number;
};

export type Punch = {
  id: string;
  user_id: string;
  clock_in: string;
  clock_out: string | null;
  note: string;
};

export async function getSession() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [{ data: profile }, { data: settings }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single<Profile>(),
    supabase.from("settings").select("*").single<Settings>(),
  ]);
  if (!profile || !settings) redirect("/login");
  return { supabase, profile, settings: { ...settings, overtime_hours: Number(settings.overtime_hours) } };
}

export async function requireAdmin() {
  const session = await getSession();
  if (session.profile.role !== "admin" || !session.profile.active) redirect("/");
  return session;
}

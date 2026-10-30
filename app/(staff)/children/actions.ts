"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { back, text } from "@/lib/flash";
import { getT } from "@/lib/i18n/server";

export async function toggleChild(form: FormData) {
  const { t, db, intl } = await getT();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("child_toggle", { p_child: text(form, "id") });
  if (error) back("/children", { error: db(error.message) });
  const r = data as { action: "in" | "out"; at: string };
  const time = new Date(r.at).toLocaleTimeString(intl, { timeZone: text(form, "tz") || "America/New_York", hour: "numeric", minute: "2-digit" });
  const name = text(form, "name");
  revalidatePath("/", "layout");
  back("/children", { ok: t(r.action === "in" ? "kids.checkedIn" : "kids.checkedOut", { name, time }) });
}

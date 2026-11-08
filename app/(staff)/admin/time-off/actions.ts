"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { back, text } from "@/lib/flash";
import { getT } from "@/lib/i18n/server";

const HERE = "/admin/time-off";

// Approve or decline (the button pressed says which), with an optional note.
export async function decideTimeOff(form: FormData) {
  const { t, db } = await getT();
  const status = text(form, "status") === "approved" ? "approved" : "declined";
  const { error } = await (await createClient()).rpc("admin_decide_time_off", {
    p_id: Number(text(form, "id")), p_status: status, p_note: text(form, "note"),
  });
  if (error) back(HERE, { error: db(error.message) });
  revalidatePath("/", "layout");
  back(HERE, { ok: status === "approved" ? t("off.approvedOk") : t("off.declinedOk") });
}

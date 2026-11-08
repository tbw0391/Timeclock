"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { back, text } from "@/lib/flash";
import { getT } from "@/lib/i18n/server";

const HERE = "/time-off";

export async function requestTimeOff(form: FormData) {
  const { t, db } = await getT();
  const start = text(form, "starts_on");
  const { error } = await (await createClient()).rpc("request_time_off", {
    p_start: start || null,
    p_end: text(form, "ends_on") || start || null,
    p_kind: text(form, "kind"),
    p_note: text(form, "note"),
  });
  if (error) back(HERE, { error: db(error.message) });
  revalidatePath("/", "layout");
  back(HERE, { ok: t("off.sent") });
}

export async function cancelTimeOff(form: FormData) {
  const { t, db } = await getT();
  const { error } = await (await createClient()).rpc("cancel_time_off", { p_id: Number(text(form, "id")) });
  if (error) back(HERE, { error: db(error.message) });
  revalidatePath("/", "layout");
  back(HERE, { ok: t("off.cancelled") });
}

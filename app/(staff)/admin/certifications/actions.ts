"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { back, text } from "@/lib/flash";
import { getT } from "@/lib/i18n/server";
import { isDate } from "@/lib/time";

const HERE = "/admin/certifications";

// Adds one (no id) or saves changes to one.
export async function saveCertification(form: FormData) {
  const { t, db } = await getT();
  const id = text(form, "id");
  const expires = text(form, "expires_on");
  const { error } = await (await createClient()).rpc("admin_set_certification", {
    p_id: id ? Number(id) : null,
    p_user: text(form, "user_id"),
    p_kind: text(form, "kind"),
    p_expires: isDate(expires) ? expires : null,
    p_note: text(form, "note"),
  });
  if (error) back(HERE, { error: db(error.message) });
  revalidatePath("/", "layout");
  back(HERE, { ok: t("cert.saved") });
}

export async function deleteCertification(form: FormData) {
  const { t, db } = await getT();
  const { error } = await (await createClient()).rpc("admin_delete_certification", { p_id: Number(text(form, "id")) });
  if (error) back(HERE, { error: db(error.message) });
  revalidatePath("/", "layout");
  back(HERE, { ok: t("cert.deleted") });
}

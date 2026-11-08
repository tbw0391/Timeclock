"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { back, text } from "@/lib/flash";
import { getT } from "@/lib/i18n/server";

const HERE = "/admin/announcements";

export async function postAnnouncement(form: FormData) {
  const { t, db } = await getT();
  const { error } = await (await createClient()).rpc("admin_post_announcement", {
    p_body: text(form, "body"),
    p_until: text(form, "until") || null,
  });
  if (error) back(HERE, { error: db(error.message) });
  revalidatePath("/", "layout");
  back(HERE, { ok: t("ann.posted") });
}

export async function deleteAnnouncement(form: FormData) {
  const { t, db } = await getT();
  const { error } = await (await createClient()).rpc("admin_delete_announcement", { p_id: Number(text(form, "id")) });
  if (error) back(HERE, { error: db(error.message) });
  revalidatePath("/", "layout");
  back(HERE, { ok: t("ann.deleted") });
}

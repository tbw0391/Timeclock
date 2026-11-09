"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { back, text } from "@/lib/flash";
import { getT } from "@/lib/i18n/server";
import { addDays, isDate } from "@/lib/time";

// Each form carries the week being looked at, so we land back on it.
const here = (form: FormData) => {
  const week = text(form, "week");
  return isDate(week) ? `/admin/schedule?week=${week}` : "/admin/schedule";
};

export async function addShift(form: FormData) {
  const { t, db } = await getT();
  const { error } = await (await createClient()).rpc("admin_add_shift", {
    p_user: text(form, "user_id"),
    p_day: text(form, "day") || null,
    p_starts: text(form, "starts") || null,
    p_ends: text(form, "ends") || null,
    p_note: text(form, "note"),
  });
  if (error) back(here(form), { error: db(error.message) });
  revalidatePath("/", "layout");
  back(here(form), { ok: t("sched.added") });
}

export async function deleteShift(form: FormData) {
  const { t, db } = await getT();
  const { error } = await (await createClient()).rpc("admin_delete_shift", { p_id: Number(text(form, "id")) });
  if (error) back(here(form), { error: db(error.message) });
  revalidatePath("/", "layout");
  back(here(form), { ok: t("sched.removed") });
}

// Copies the week before onto the week being looked at.
export async function copyLastWeek(form: FormData) {
  const { t, db } = await getT();
  const week = text(form, "week");
  if (!isDate(week)) back("/admin/schedule", {});
  const { data, error } = await (await createClient()).rpc("admin_copy_week", { p_from: addDays(week, -7), p_to: week });
  if (error) back(here(form), { error: db(error.message) });
  revalidatePath("/", "layout");
  back(here(form), { ok: t("sched.copied", { count: Number(data ?? 0) }) });
}

"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { back, text } from "@/lib/flash";
import { getT } from "@/lib/i18n/server";
import { callGusto } from "@/lib/gusto-sync";

const PAGE = "/admin/gusto";

async function gustoError(code: string) {
  const { t } = await getT();
  return code === "gusto_not_configured" ? t("gusto.notConfigured") : code;
}

export async function gustoConnect() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const { data, error } = await callGusto<{ url: string }>("connect", { return_to: `${proto}://${h.get("host")}` });
  if (error || !data) back(PAGE, { error: await gustoError(error ?? "") });
  redirect(data.url);
}

export async function gustoSyncFrom(form: FormData) {
  const { t } = await getT();
  const { error } = await callGusto("sync_from", { date: text(form, "date") });
  if (error) back(PAGE, { error: await gustoError(error) });
  back(PAGE, { ok: t("gusto.dateSaved") });
}

export async function gustoMatch(form: FormData) {
  const { t } = await getT();
  const { error } = await callGusto("match", { user: text(form, "user"), employee: text(form, "employee") });
  if (error) back(PAGE, { error: await gustoError(error) });
  back(PAGE, { ok: t("gusto.matched") });
}

// The function sends a batch at a time; keep going until it's caught up.
export async function gustoSync() {
  const { t } = await getT();
  let sent = 0;
  const problems: string[] = [];
  for (let i = 0; i < 10; i++) {
    const { data, error } = await callGusto<{ done: boolean; pushed: { time: number; deleted: number }; errors: string[] }>("sync");
    if (error || !data) back(PAGE, { error: await gustoError(error ?? "") });
    sent += data.pushed.time + data.pushed.deleted;
    problems.push(...data.errors);
    if (data.done) break;
  }
  revalidatePath(PAGE);
  if (problems.length) back(PAGE, { error: `${t("gusto.sent", { count: sent })} ${t("gusto.problems")} ${problems.slice(0, 3).join("; ")}` });
  back(PAGE, { ok: t("gusto.sent", { count: sent }) });
}

export async function gustoDisconnect() {
  const { t } = await getT();
  const { error } = await callGusto("disconnect");
  if (error) back(PAGE, { error: await gustoError(error) });
  back(PAGE, { ok: t("gusto.disconnected") });
}

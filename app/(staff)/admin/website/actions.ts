"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { back, text } from "@/lib/flash";
import { getT } from "@/lib/i18n/server";
import { isSiteLang } from "@/lib/site/base";
import { contactFrom, sectionsFrom } from "@/lib/site/edit";
import { allSiteStrings, siteContact, siteEvents, sitePage } from "@/lib/site/server";
import { cleanEvents, type SiteEvent } from "@/lib/site/events";
import { pageStrings } from "@/lib/site/strings";
import { translateMissing, translateOn } from "@/lib/site/translate";

const WEBSITE = "/admin/website";
const editPath = (slug: string, lang?: string) =>
  `${WEBSITE}/edit?page=${encodeURIComponent(slug)}${lang ? `&lang=${lang}` : ""}`;

// After English is saved: translate whatever is new, when translation is on.
// The English is already saved either way; a translation problem is reported
// but doesn't undo the save.
async function translateAfterSave(strings: string[], to: string, ok: string) {
  const { t } = await getT();
  if (translateOn()) {
    const { left, error } = await translateMissing(await createClient(), strings);
    revalidatePath("/site", "layout");
    if (error || left) back(to, { error: t("site.savedNotTranslated", { error: error || t("site.translateMore", { count: left }) }) });
  }
  back(to, { ok });
}

export async function saveNotice(form: FormData) {
  const { t, db } = await getT();
  const supabase = await createClient();
  const clear = text(form, "clear") === "1";
  const words = clear ? "" : text(form, "text");
  const { error } = await supabase.rpc("admin_set_notice", {
    p_text: words,
    p_until: clear ? null : text(form, "until") || null,
  });
  if (error) back(WEBSITE, { error: db(error.message) });
  revalidatePath("/site", "layout");
  if (clear) back(WEBSITE, { ok: t("site.bannerCleared") });
  await translateAfterSave([words], WEBSITE, t("site.bannerSaved"));
}

// One page's words and links. Starts from the page as the website shows it
// now, so anything not on the form (photos) stays the same.
export async function savePage(form: FormData) {
  const { t, db } = await getT();
  const slug = text(form, "slug");
  const page = await sitePage(slug);
  const to = editPath(slug);
  if (!page) back(WEBSITE, { error: t("common.somethingWrong") });
  const reset = text(form, "reset") === "1";
  const sections = sectionsFrom((name) => { const v = form.get(name); return typeof v === "string" ? v : null; }, page.sections);
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_site_content", { p_key: `page:${slug}`, p_value: reset ? null : { sections } });
  if (error) back(to, { error: db(error.message) });
  revalidatePath("/site", "layout");
  // Putting a page back brings back its original words, which may need translating too.
  const now = reset ? (await sitePage(slug))! : { ...page, sections };
  await translateAfterSave(pageStrings(now), to, reset ? t("site.pageReset") : t("site.pageSaved"));
}

export async function saveContact(form: FormData) {
  const { t, db } = await getT();
  const contact = contactFrom((name) => text(form, name), await siteContact());
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_site_content", { p_key: "contact", p_value: contact });
  if (error) back(WEBSITE, { error: db(error.message) });
  revalidatePath("/site", "layout");
  await translateAfterSave([contact.hours], WEBSITE, t("site.contactSaved"));
}

// Translates everything on the website that isn't translated yet. Large jobs
// stop before Vercel's time limit and say how many are left.
export async function translateSite() {
  const { t } = await getT();
  if (!translateOn()) back(WEBSITE, {});
  const { left, error } = await translateMissing(await createClient(), await allSiteStrings(), 200);
  revalidatePath("/site", "layout");
  if (error) back(WEBSITE, { error: t("site.translateFailed", { error }) });
  back(WEBSITE, left ? { error: t("site.translateMore", { count: left }) } : { ok: t("site.translateDone") });
}

// A manager's corrections to one page's translation. Fields come in threes:
// en<i> (the English) and was<i> (the translation shown), both hidden, and
// tr<i> (the translation now). Only changed ones are saved, as corrections.
export async function saveTranslations(form: FormData) {
  const { t, db } = await getT();
  const slug = text(form, "slug");
  const lang = text(form, "lang");
  const to = editPath(slug, lang);
  if (!isSiteLang(lang)) back(WEBSITE, { error: t("common.somethingWrong") });
  const rows: { en: string; tr: string }[] = [];
  for (let i = 0; form.has(`en${i}`); i++) {
    const en = form.get(`en${i}`);
    const tr = text(form, `tr${i}`);
    if (typeof en === "string" && tr && tr !== text(form, `was${i}`)) rows.push({ en, tr });
  }
  const { error } = await (await createClient()).rpc("admin_set_site_strings", { p_lang: lang, p_rows: rows, p_edited: true });
  if (error) back(to, { error: db(error.message) });
  revalidatePath("/site", "layout");
  back(to, { ok: t("site.translationSaved") });
}

// One photo from a manager's phone, already shrunk to a JPEG in the browser
// (components/PhotoPicker.tsx). Returns its name for the page's form; it
// shows on the website once the page is saved.
export async function uploadSitePhoto(form: FormData): Promise<{ id?: string; error?: string }> {
  const { t } = await getT();
  const file = form.get("photo");
  if (!(file instanceof File) || file.type !== "image/jpeg" || file.size > 4 * 1024 * 1024) return { error: t("site.photo.badType") };
  const name = `${crypto.randomUUID()}.jpg`;
  const { error } = await (await createClient()).storage.from("site-photos").upload(name, file, { contentType: "image/jpeg", cacheControl: "31536000" });
  if (error) return { error: t("site.photo.failed", { error: error.message }) };
  return { id: `up/${name}` };
}

export async function setMessageStatus(form: FormData) {
  const { db } = await getT();
  const { error } = await (await createClient()).rpc("admin_set_message_status", {
    p_id: Number(text(form, "id")),
    p_status: text(form, "status") === "done" ? "done" : "new",
  });
  if (error) back(`${WEBSITE}/messages`, { error: db(error.message) });
  revalidatePath("/", "layout");
  back(`${WEBSITE}/messages`, {});
}

// Saves the events list. Starts from the events still to come, so past ones
// are cleared out along the way.
async function saveEvents(change: (events: SiteEvent[]) => SiteEvent[]) {
  const { db } = await getT();
  const items = cleanEvents(change(await siteEvents()));
  const { error } = await (await createClient()).rpc("admin_set_site_content", { p_key: "events", p_value: { items } });
  if (error) back(WEBSITE, { error: db(error.message) });
  revalidatePath("/site", "layout");
}

export async function addEvent(form: FormData) {
  const { t } = await getT();
  const event = cleanEvents([{ date: text(form, "date"), title: text(form, "title"), details: text(form, "details") }])[0];
  if (!event) back(WEBSITE, { error: t("site.eventMissing") });
  await saveEvents((events) => [...events, event]);
  await translateAfterSave([event.title, event.details ?? ""], WEBSITE, t("site.eventAdded"));
}

export async function removeEvent(form: FormData) {
  const { t } = await getT();
  const [date, title] = [text(form, "date"), text(form, "title")];
  await saveEvents((events) => events.filter((e) => !(e.date === date && e.title === title)));
  back(WEBSITE, { ok: t("site.eventRemoved") });
}

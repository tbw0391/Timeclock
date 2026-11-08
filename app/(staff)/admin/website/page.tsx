import { Flash, Header } from "@/components/ui";
import { requireAdmin } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import { PAGES } from "@/lib/site/content";
import { allSiteStrings, editedPages, siteContact, siteEvents, untranslatedCount } from "@/lib/site/server";
import { eventDate } from "@/lib/site/events";
import { translateOn } from "@/lib/site/translate";
import { addEvent, removeEvent, saveContact, saveNotice, translateSite } from "./actions";

type Notice = { text: string; until: string | null };
type Props = { searchParams: Promise<{ error?: string; ok?: string }> };

export const dynamic = "force-dynamic";
// Saving translates new words, and "Translate the whole site" can take a while.
export const maxDuration = 300;

// Website editor: the banner across the top, each page's words, and the
// contact details, plus translations into the staff app's other languages.
// Photos come later.
export default async function WebsitePage({ searchParams }: Props) {
  const { error, ok } = await searchParams;
  const { supabase, profile, settings } = await requireAdmin();
  const { t, intl } = await getT();
  const [{ data: row }, { data: showing }, edited, contact, events] = await Promise.all([
    supabase.from("site_content").select("value").eq("key", "notice").maybeSingle<{ value: Notice }>(),
    supabase.rpc("site_notice"),
    editedPages(),
    siteContact(),
    siteEvents(),
  ]);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: settings.timezone });
  const missing = translateOn() ? await untranslatedCount(await allSiteStrings()) : 0;
  const notice = row?.value ?? { text: "", until: null };

  return (
    <>
      <Header profile={profile} settings={settings} />
      <Flash error={error} ok={ok} />
      <h1 className="mb-4 text-2xl font-bold">{t("site.title")}</h1>
      <section className="card mb-6 max-w-lg">
        <h2 className="mb-1 font-semibold">{t("site.banner")}</h2>
        <p className="muted mb-3 text-sm">{t("site.bannerHint")}</p>
        {/* Preview in the website's own colors. The site is English-only. */}
        <p
          dir="ltr"
          className="mb-4 rounded-xl border-[3px] px-4 py-2 text-center font-semibold"
          style={{ background: showing ? "var(--bow)" : "transparent", color: "var(--charcoal)", borderColor: "var(--charcoal)", borderStyle: showing ? "solid" : "dashed" }}
        >
          {(showing as string | null) ?? t("site.bannerOff")}
        </p>
        <form action={saveNotice} className="space-y-3">
          <input name="text" dir="ltr" maxLength={200} defaultValue={notice.text} placeholder={t("site.bannerPlaceholder")} className="input" />
          <label className="block text-sm">
            {t("site.bannerUntil")}
            <input type="date" name="until" defaultValue={notice.until ?? ""} className="input mt-1" />
          </label>
          <div className="flex flex-wrap gap-3">
            <button className="btn">{t("common.save")}</button>
            <button name="clear" value="1" className="btn-ghost">{t("site.bannerClear")}</button>
          </div>
        </form>
      </section>

      <section className="card mb-6 max-w-lg">
        <h2 className="mb-1 font-semibold">{t("site.pages")}</h2>
        <p className="muted mb-3 text-sm">{t("site.pagesHint")}</p>
        <ul className="divide-y">
          {PAGES.map((p) => (
            <li key={p.slug}>
              <a href={`/admin/website/edit?page=${p.slug}`} className="flex items-center justify-between gap-3 py-2.5">
                <span dir="ltr">
                  {p.slug ? p.title : "Home"}
                  {edited.has(p.slug) && <span className="ms-2 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">{t("site.edited")}</span>}
                </span>
                <span className="text-sm underline">{t("site.edit")}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="card mb-6 max-w-lg">
        <h2 className="mb-1 font-semibold">{t("site.events")}</h2>
        <p className="muted mb-3 text-sm">{t("site.eventsHint")}</p>
        {events.length ? (
          <ul className="mb-4 divide-y">
            {events.map((e) => (
              <li key={e.date + e.title} className="flex items-start justify-between gap-3 py-2.5">
                <div dir="ltr">
                  <p className="text-sm font-semibold">{eventDate(e.date, intl)}</p>
                  <p>{e.title}</p>
                  {e.details && <p className="muted whitespace-pre-line text-sm">{e.details}</p>}
                </div>
                <form action={removeEvent}>
                  <input type="hidden" name="date" value={e.date} />
                  <input type="hidden" name="title" value={e.title} />
                  <button className="btn-ghost">{t("site.photo.remove")}</button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted mb-4 text-sm">{t("site.eventsNone")}</p>
        )}
        <form action={addEvent} className="space-y-3">
          <label className="block text-sm">
            {t("site.eventDate")}
            <input type="date" name="date" required min={today} className="input mt-1" />
          </label>
          <label className="block text-sm">
            {t("site.eventTitle")}
            <input name="title" dir="ltr" required maxLength={150} placeholder="Community Day" className="input mt-1" />
          </label>
          <label className="block text-sm">
            {t("site.eventDetails")}
            <textarea name="details" dir="ltr" rows={3} maxLength={1500} className="input mt-1" />
          </label>
          <button className="btn">{t("site.eventAdd")}</button>
        </form>
      </section>

      <section className="card mb-6 max-w-lg">
        <h2 className="mb-1 font-semibold">{t("site.contact")}</h2>
        <p className="muted mb-3 text-sm">{t("site.contactHint")}</p>
        <form action={saveContact} className="space-y-3">
          <label className="block text-sm">
            {t("site.phone")}
            <input name="phone" dir="ltr" type="tel" required defaultValue={contact.phone} className="input mt-1" />
          </label>
          <label className="block text-sm">
            {t("site.email")}
            <input name="email" dir="ltr" type="email" required defaultValue={contact.email} className="input mt-1" />
          </label>
          <label className="block text-sm">
            {t("site.address")}
            <input name="address1" dir="ltr" required defaultValue={contact.address[0]} className="input mt-1" />
            <input name="address2" dir="ltr" required defaultValue={contact.address[1]} className="input mt-2" />
          </label>
          <label className="block text-sm">
            {t("site.hours")}
            <input name="hours" dir="ltr" required defaultValue={contact.hours} className="input mt-1" />
          </label>
          <button className="btn">{t("common.save")}</button>
        </form>
      </section>
      <section className="card max-w-lg">
        <h2 className="mb-1 font-semibold">{t("site.translate")}</h2>
        {translateOn() ? (
          <>
            <p className="muted mb-3 text-sm">{t("site.translateHint")}</p>
            <p className="mb-3 font-semibold">{missing ? t("site.translateMissing", { count: missing }) : t("site.translateAllDone")}</p>
            {missing > 0 && (
              <form action={translateSite}>
                <button className="btn">{t("site.translateAll")}</button>
                <p className="muted mt-2 text-sm">{t("site.translateSlow")}</p>
              </form>
            )}
          </>
        ) : (
          <p className="muted text-sm">{t("site.translateOff")}</p>
        )}
      </section>
      <p className="mt-4 text-sm">
        <a href="/site" target="_blank" rel="noopener" className="underline">{t("site.view")}</a>
        {" · "}
        <a href="/admin/website/messages" className="underline">{t("tile.messages")}</a>
      </p>
    </>
  );
}

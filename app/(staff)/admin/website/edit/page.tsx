import { notFound } from "next/navigation";
import { Flash, Header } from "@/components/ui";
import { requireAdmin } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/messages";
import type { Button, Section } from "@/lib/site/content";
import { LOCALES } from "@/lib/i18n/locales";
import { SITE_LANGS, isSiteLang } from "@/lib/site/base";
import { editedPages, sitePage, translations } from "@/lib/site/server";
import { pageStrings } from "@/lib/site/strings";
import { translateOn } from "@/lib/site/translate";
import { GalleryPicker, PhotoPicker, type PhotoLabels } from "@/components/PhotoPicker";
import { savePage, saveTranslations, uploadSitePhoto } from "../actions";

type Props = { searchParams: Promise<{ page?: string; lang?: string; error?: string; ok?: string }> };

export const dynamic = "force-dynamic";
// Saving translates any new words.
export const maxDuration = 300;

// One field. The website is in English, so what's typed is left-to-right.
function Field({ name, label, value, long, required }: { name: string; label: string; value?: string; long?: boolean; required?: boolean }) {
  const v = value ?? "";
  return (
    <label className="block text-sm">
      {label}
      {long ? (
        <textarea name={name} dir="ltr" rows={Math.min(14, Math.max(3, Math.ceil(v.length / 45) + v.split("\n").length))} defaultValue={v} required={required} className="input mt-1" />
      ) : (
        <input name={name} dir="ltr" defaultValue={v} required={required} className="input mt-1" />
      )}
    </label>
  );
}

// Website editor for one page: every word and link on it, section by section,
// or with ?lang= its translation, string by string.
export default async function EditPage({ searchParams }: Props) {
  const { page: slug = "", lang: langParam, error, ok } = await searchParams;
  const lang = translateOn() && isSiteLang(langParam) ? langParam : null;
  const { profile, settings } = await requireAdmin();
  const { t } = await getT();
  const [page, edited] = await Promise.all([sitePage(slug), editedPages()]);
  if (!page) notFound();

  const labels: PhotoLabels = {
    change: t("site.photo.change"), add: t("site.photo.add"), addMany: t("site.photo.addMany"), remove: t("site.photo.remove"),
    left: t("site.photo.left"), right: t("site.photo.right"), uploading: t("site.photo.uploading"), badType: t("site.photo.badType"), none: t("site.photo.none"),
  };
  const pic = (name: string, value?: string, optional?: boolean) =>
    <PhotoPicker name={name} value={value} optional={optional} upload={uploadSitePhoto} labels={labels} />;

  const buttons = (p: string, list?: Button[]) => list?.map((b, j) => (
    <div key={j} className="grid gap-2 rounded-xl border-2 p-3 sm:grid-cols-2" style={{ borderColor: "var(--soft-line)" }}>
      <Field name={`${p}.b${j}.label`} label={t("site.f.button")} value={b.label} required />
      <label className="block text-sm">
        {t("site.f.link")}
        <input name={`${p}.b${j}.href`} dir="ltr" defaultValue={b.href} required pattern="(https?://|mailto:|tel:|/).*" title={t("site.f.linkHint")} className="input mt-1" />
      </label>
    </div>
  ));

  function fields(s: Section, i: number) {
    const p = `s${i}`;
    switch (s.kind) {
      case "hero":
        return <>{pic(`${p}.image`, s.image)}<Field name={`${p}.title`} label={t("site.f.title")} value={s.title} long required /><Field name={`${p}.text`} label={t("site.f.text")} value={s.text} long />{buttons(p, s.buttons)}</>;
      case "text":
        return <><Field name={`${p}.title`} label={t("site.f.title")} value={s.title} /><Field name={`${p}.body`} label={t("site.f.body")} value={s.body} long required />{pic(`${p}.image`, s.image, true)}{buttons(p, s.buttons)}</>;
      case "list":
        return (
          <>
            <Field name={`${p}.title`} label={t("site.f.title")} value={s.title} required />
            <Field name={`${p}.note`} label={t("site.f.note")} value={s.note} />
            <label className="block text-sm">
              {t("site.f.items")}
              <textarea name={`${p}.items`} dir="ltr" rows={Math.min(20, s.items.length + 2)} defaultValue={s.items.join("\n")} className="input mt-1" />
            </label>
          </>
        );
      case "cards":
        return (
          <>
            <Field name={`${p}.title`} label={t("site.f.title")} value={s.title} />
            <Field name={`${p}.intro`} label={t("site.f.intro")} value={s.intro} />
            {pic(`${p}.image`, s.image, true)}
            {s.items.map((c, j) => (
              <div key={j} className="space-y-2 border-s-4 ps-3" style={{ borderColor: "var(--soft-line)" }}>
                <Field name={`${p}.i${j}.title`} label={`${t("site.f.title")} ${j + 1}`} value={c.title} required />
                <Field name={`${p}.i${j}.body`} label={t("site.f.body")} value={c.body} long required />
                {c.button && buttons(`${p}.i${j}`, [c.button])}
              </div>
            ))}
          </>
        );
      case "tiles":
        return (
          <>
            <Field name={`${p}.title`} label={t("site.f.title")} value={s.title} />
            {s.items.map((x, j) => (
              <div key={j} className="space-y-2 border-s-4 ps-3" style={{ borderColor: "var(--soft-line)" }}>
                {pic(`${p}.i${j}.image`, x.image)}
                <Field name={`${p}.i${j}.caption`} label={`${t("site.f.caption")} ${j + 1}`} value={x.caption} required />
              </div>
            ))}
          </>
        );
      case "people":
        return (
          <>
            <Field name={`${p}.title`} label={t("site.f.title")} value={s.title} />
            {s.items.map((m, j) => (
              <div key={j} className="space-y-2 border-s-4 ps-3" style={{ borderColor: "var(--soft-line)" }}>
                {pic(`${p}.i${j}.image`, m.image)}
                <Field name={`${p}.i${j}.name`} label={t("site.f.name")} value={m.name} required />
                {m.role !== undefined && <Field name={`${p}.i${j}.role`} label={t("site.f.role")} value={m.role} />}
                {m.bio !== undefined && <Field name={`${p}.i${j}.bio`} label={t("site.f.bio")} value={m.bio} long />}
              </div>
            ))}
          </>
        );
      case "gallery":
        return <><Field name={`${p}.title`} label={t("site.f.title")} value={s.title} /><GalleryPicker name={`${p}.images`} value={s.images} upload={uploadSitePhoto} labels={labels} /></>;
      case "buttons":
        return buttons(p, s.buttons);
      case "contact":
        return <><Field name={`${p}.title`} label={t("site.f.title")} value={s.title} /><Field name={`${p}.text`} label={t("site.f.text")} value={s.text} /><p className="muted text-sm">{t("site.contactBox")}</p></>;
      case "events":
        return (
          <>
            <Field name={`${p}.title`} label={t("site.f.title")} value={s.title} required />
            <Field name={`${p}.empty`} label={t("site.f.empty")} value={s.empty} required />
            <p className="muted text-sm">{t("site.eventsWhere")} <a href="/admin/website" className="underline">{t("site.back")}</a></p>
          </>
        );
    }
  }

  // Each English string on the page over a box for its translation.
  async function translationForm(l: (typeof SITE_LANGS)[number]) {
    const have = await translations(l);
    const strings = pageStrings(page!);
    const { dir } = LOCALES[l];
    return (
      <form action={saveTranslations} className="max-w-2xl space-y-4">
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="lang" value={l} />
        <p className="muted text-sm">{t("site.trHint")}</p>
        {strings.map((en, i) => {
          const row = have.get(en);
          return (
            <div key={i} className="card space-y-2">
              <p dir="ltr" lang="en" className="muted whitespace-pre-line text-sm">{en}</p>
              <input type="hidden" name={`en${i}`} value={en} />
              <input type="hidden" name={`was${i}`} value={row?.tr ?? ""} />
              <textarea name={`tr${i}`} dir={dir} lang={l} rows={Math.min(14, Math.max(2, Math.ceil(en.length / 45) + en.split("\n").length))}
                defaultValue={row?.tr ?? ""} placeholder={t("site.trMissing")} className="input" />
              {row?.edited && <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">{t("site.trEdited")}</span>}
            </div>
          );
        })}
        <div className="sticky bottom-0 -mx-4 border-t-2 px-4 py-3" style={{ background: "var(--bg)", borderColor: "var(--soft-line)" }}>
          <button className="btn">{t("common.save")}</button>
        </div>
      </form>
    );
  }

  const view = `/site${lang ? `/${lang}` : ""}${slug ? `/${slug}` : ""}`;
  const tab = (l: string | null) => `/admin/website/edit?page=${encodeURIComponent(slug)}${l ? `&lang=${l}` : ""}`;
  return (
    <>
      <Header profile={profile} settings={settings} />
      <Flash error={error} ok={ok} />
      <p className="mb-2 text-sm"><a href="/admin/website" className="underline">{t("site.back")}</a></p>
      <h1 className="mb-1 text-2xl font-bold" dir="ltr">{slug ? page.title : "Home"}</h1>
      <p className="mb-4 text-sm"><a href={view} target="_blank" rel="noopener" className="underline">{t("site.viewPage")}</a></p>
      {translateOn() && (
        <nav className="mb-4 flex flex-wrap gap-2">
          {[null, ...SITE_LANGS].map((l) => (
            <a key={l ?? "en"} href={tab(l)} lang={l ?? "en"} className={l === lang ? "btn" : "btn-ghost"}>{LOCALES[l ?? "en"].name}</a>
          ))}
        </nav>
      )}
      {lang ? await translationForm(lang) : <>
      <form action={savePage} className="max-w-2xl space-y-4">
        <input type="hidden" name="slug" value={slug} />
        <p className="rounded-xl px-3 py-2 text-sm" style={{ background: "var(--bow)", color: "var(--charcoal)" }}>📷 {t("site.photo.consent")}</p>
        {page.sections.map((s, i) => (
          <section key={i} className="card space-y-3">
            <h2 className="muted text-sm font-semibold">{i + 1}. {t(`site.kind.${s.kind}` as MessageKey)}</h2>
            {fields(s, i)}
          </section>
        ))}
        <div className="sticky bottom-0 -mx-4 border-t-2 px-4 py-3" style={{ background: "var(--bg)", borderColor: "var(--soft-line)" }}>
          <button className="btn">{t("common.save")}</button>
        </div>
      </form>
      {edited.has(slug) && (
        <form action={savePage} className="mt-6 max-w-2xl">
          <input type="hidden" name="slug" value={slug} />
          <p className="muted mb-2 text-sm">{t("site.resetHint")}</p>
          <button name="reset" value="1" className="btn-ghost">{t("site.reset")}</button>
        </form>
      )}
      </>}
    </>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionView } from "@/components/site/Sections";
import { SITE } from "@/lib/site/content";
import { intlLocale } from "@/lib/i18n/locales";
import { siteBase, siteContact, siteEvents, siteLang, sitePage, siteTr } from "@/lib/site/server";
import { translatePage } from "@/lib/site/strings";

type Props = { params: Promise<{ slug?: string[] }> };

// The page with managers' edits, in the language being read.
async function find(params: Props["params"]) {
  const [page, tr] = await Promise.all([sitePage((await params).slug?.join("/") ?? ""), siteTr()]);
  return page && translatePage(page, tr);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await find(params);
  if (!page) return {};
  return {
    title: page.slug ? `${page.title} | ${SITE.name}` : `${SITE.name} | ${page.title}`,
    description: page.description,
  };
}

export default async function SitePage({ params }: Props) {
  const page = await find(params);
  if (!page) notFound();
  const hasEvents = page.sections.some((s) => s.kind === "events");
  const [base, contact, tr, lang, events] = await Promise.all([siteBase(), siteContact(), siteTr(), siteLang(), hasEvents ? siteEvents() : []]);
  const shownAt = Date.now();
  const shown = events.map((e) => ({ ...e, title: tr(e.title), details: e.details && tr(e.details) }));
  return page.sections.map((s, i) => (
    <SectionView key={i} section={s} base={base} index={i} contact={{ ...contact, hours: tr(contact.hours) }} tr={tr} lang={lang ?? "en"} shownAt={shownAt}
      events={shown} intl={intlLocale(lang ?? "en")} />
  ));
}

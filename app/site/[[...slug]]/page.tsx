import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionView } from "@/components/site/Sections";
import { SITE, pageFor } from "@/lib/site/content";
import { siteBase } from "@/lib/site/server";

type Props = { params: Promise<{ slug?: string[] }> };

const find = async (params: Props["params"]) => pageFor((await params).slug?.join("/") ?? "");

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
  const base = await siteBase();
  return page.sections.map((s, i) => <SectionView key={i} section={s} base={base} index={i} />);
}

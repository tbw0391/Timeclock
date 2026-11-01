import { Flash, Header } from "@/components/ui";
import { requireAdmin } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import { saveNotice } from "../actions";

type Notice = { text: string; until: string | null };
type Props = { searchParams: Promise<{ error?: string; ok?: string }> };

export const dynamic = "force-dynamic";

// Website editor. For now just the banner across the top of every page.
export default async function WebsitePage({ searchParams }: Props) {
  const { error, ok } = await searchParams;
  const { supabase, profile, settings } = await requireAdmin();
  const { t } = await getT();
  const [{ data: row }, { data: showing }] = await Promise.all([
    supabase.from("site_content").select("value").eq("key", "notice").maybeSingle<{ value: Notice }>(),
    supabase.rpc("site_notice"),
  ]);
  const notice = row?.value ?? { text: "", until: null };

  return (
    <>
      <Header profile={profile} settings={settings} />
      <Flash error={error} ok={ok} />
      <h1 className="mb-4 text-2xl font-bold">{t("site.title")}</h1>
      <section className="card max-w-lg">
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
      <p className="mt-4 text-sm">
        <a href="/site" target="_blank" rel="noopener" className="underline">{t("site.view")}</a>
      </p>
    </>
  );
}

import { Flash, Header } from "@/components/ui";
import { getSession } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import { sendSuggestion } from "../actions";

type Props = { searchParams: Promise<{ error?: string; ok?: string }> };

export default async function SuggestPage({ searchParams }: Props) {
  const { error, ok } = await searchParams;
  const { profile, settings } = await getSession();
  const { t } = await getT();
  return (
    <>
      <Header profile={profile} settings={settings} />
      <Flash error={error} ok={ok} />
      <div className="card max-w-lg">
        <h1 className="mb-1 text-xl font-semibold">{t("suggest.title")}</h1>
        <p className="muted mb-3 text-sm">{t("suggest.intro")}</p>
        <form action={sendSuggestion} className="space-y-3">
          <textarea name="body" rows={5} maxLength={2000} placeholder={t("suggest.placeholder")} className="input" required />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="anonymous" /> {t("suggest.anonymous")}
          </label>
          <button className="btn">{t("suggest.send")}</button>
        </form>
      </div>
    </>
  );
}

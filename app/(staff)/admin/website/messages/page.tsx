import { Flash, Header } from "@/components/ui";
import { requireAdmin } from "@/lib/session";
import { timeLabel } from "@/lib/time";
import { getT } from "@/lib/i18n/server";
import { LOCALES, type Locale } from "@/lib/i18n/locales";
import { setMessageStatus } from "../actions";

type Message = { id: number; name: string; reply_to: string; body: string; lang: Locale; status: "new" | "done"; created_at: string };
type Props = { searchParams: Promise<{ error?: string; ok?: string }> };

export const dynamic = "force-dynamic";

// A phone number or email from the form, as a link to reply with.
function replyLink(v: string) {
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return `mailto:${v}`;
  const digits = v.replace(/\D/g, "");
  if (digits.length === 10 || (digits.length === 11 && digits.startsWith("1"))) return `tel:+${digits.length === 10 ? "1" : ""}${digits}`;
  return null;
}

// Messages from the website's contact form, newest first.
export default async function MessagesPage({ searchParams }: Props) {
  const { error, ok } = await searchParams;
  const { supabase, profile, settings } = await requireAdmin();
  const { t, intl } = await getT();
  const { data: items } = await supabase.from("site_messages").select("*").order("created_at", { ascending: false }).limit(300).returns<Message[]>();
  const fresh = (items ?? []).filter((m) => m.status === "new");
  const done = (items ?? []).filter((m) => m.status === "done");

  const list = (rows: Message[], next: "new" | "done") => rows.map((m) => {
    const href = replyLink(m.reply_to);
    return (
      <li key={m.id} className="border-t-2 border-dashed py-3" style={{ borderColor: "var(--soft-line)" }}>
        <p className="font-semibold">
          {m.name} ·{" "}
          {href ? <a href={href} dir="ltr" className="underline">{m.reply_to}</a> : <span dir="ltr">{m.reply_to}</span>}
        </p>
        <p className="mt-1 whitespace-pre-wrap" dir="auto">{m.body}</p>
        <div className="muted mt-1 flex flex-wrap items-center gap-3 text-sm">
          <span>{timeLabel(m.created_at, settings.timezone, intl)}{m.lang !== "en" && ` · ${t("msg.readIn", { lang: LOCALES[m.lang].name })}`}</span>
          <form action={setMessageStatus}>
            <input type="hidden" name="id" value={m.id} />
            <input type="hidden" name="status" value={next} />
            <button className="btn-ghost">{next === "done" ? t("msg.markDone") : t("msg.moveBack")}</button>
          </form>
        </div>
      </li>
    );
  });

  return (
    <>
      <Header profile={profile} settings={settings} />
      <Flash error={error} ok={ok} />
      <h1 className="mb-1 text-2xl font-bold">{t("msg.title")}</h1>
      <p className="muted mb-4 text-sm">{t("msg.intro")}</p>
      <section className="card mb-6">
        <h2 className="mb-1 font-semibold">{t("msg.new", { count: fresh.length })}</h2>
        {fresh.length ? <ul>{list(fresh, "done")}</ul> : <p className="muted text-sm">{t("msg.nothingNew")}</p>}
      </section>
      {done.length > 0 && (
        <section className="card">
          <details>
            <summary className="cursor-pointer font-semibold">{t("msg.done", { count: done.length })}</summary>
            <ul className="mt-2">{list(done, "new")}</ul>
          </details>
        </section>
      )}
    </>
  );
}

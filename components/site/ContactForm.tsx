"use client";

import { useActionState } from "react";
import { sendSiteMessage, type SendState } from "@/app/site/actions";

export type ContactLabels = {
  title: string; name: string; replyTo: string; message: string; send: string; sending: string; sent: string; failed: string;
};

// "Send us a message" in the contact box. shownAt is when the page was made,
// for the bot check in sendSiteMessage.
export function ContactForm({ labels, lang, shownAt }: { labels: ContactLabels; lang: string; shownAt: number }) {
  const [state, action, pending] = useActionState<SendState, FormData>(sendSiteMessage, {});
  if (state.sent) return <p className="rounded-2xl px-4 py-3 text-lg font-semibold" style={{ background: "var(--mint)" }} role="status">{labels.sent}</p>;
  return (
    <form action={action} className="space-y-3">
      <h3 className="text-xl font-bold">{labels.title}</h3>
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="shown_at" value={shownAt} />
      {/* Hidden from people; bots fill it in. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          {labels.name}
          <input name="name" required maxLength={100} autoComplete="name" className="input mt-1" />
        </label>
        <label className="block">
          {labels.replyTo}
          <input name="reply_to" required maxLength={200} autoComplete="email" dir="ltr" className="input mt-1" />
        </label>
      </div>
      <label className="block">
        {labels.message}
        <textarea name="message" required maxLength={3000} rows={5} className="input mt-1" />
      </label>
      {state.failed && <p className="font-semibold text-red-700" role="alert">{labels.failed}</p>}
      <button className="btn" disabled={pending} style={{ background: "var(--peach)", color: "var(--charcoal)" }}>{pending ? labels.sending : labels.send}</button>
    </form>
  );
}

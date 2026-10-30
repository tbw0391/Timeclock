import { Flash, Header } from "@/components/ui";
import { getSession } from "@/lib/session";
import { sendSuggestion } from "../actions";

type Props = { searchParams: Promise<{ error?: string; ok?: string }> };

export default async function SuggestPage({ searchParams }: Props) {
  const { error, ok } = await searchParams;
  const { profile, settings } = await getSession();
  return (
    <>
      <Header profile={profile} settings={settings} />
      <Flash error={error} ok={ok} />
      <div className="card max-w-lg">
        <h1 className="mb-1 text-xl font-semibold">💡 Suggestion box</h1>
        <p className="muted mb-3 text-sm">Got an idea to make things better? Only managers can read these.</p>
        <form action={sendSuggestion} className="space-y-3">
          <textarea name="body" rows={5} maxLength={2000} placeholder="Your idea…" className="input" required />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="anonymous" /> Send anonymously (your name isn&apos;t saved at all)
          </label>
          <button className="btn">Send suggestion</button>
        </form>
      </div>
    </>
  );
}

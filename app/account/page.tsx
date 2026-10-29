import { Flash, Header } from "@/components/ui";
import { getSession } from "@/lib/session";
import { formatPhone } from "@/lib/phone";

type Props = { searchParams: Promise<{ error?: string; ok?: string }> };

export default async function AccountPage({ searchParams }: Props) {
  const { error, ok } = await searchParams;
  const { profile, settings } = await getSession();
  return (
    <>
      <Header profile={profile} settings={settings} />
      <Flash error={error} ok={ok} />
      <div className="card max-w-sm space-y-3">
        <p><span className="muted">Signed in as</span> {formatPhone(profile.phone)}</p>
        <p className="muted text-sm">You sign in with a code texted to this number. To change it, ask your manager.</p>
      </div>
      <div className="card mt-4 max-w-sm space-y-2 text-sm">
        <h2 className="font-semibold">Put Timeclock on your home screen</h2>
        <p><span className="font-medium">iPhone (Safari):</span> tap the Share button, then &ldquo;Add to Home Screen&rdquo;.</p>
        <p><span className="font-medium">Android (Chrome):</span> tap the ⋮ menu, then &ldquo;Add to Home screen&rdquo; or &ldquo;Install app&rdquo;.</p>
      </div>
    </>
  );
}

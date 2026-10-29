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
    </>
  );
}

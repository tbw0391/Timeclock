import { Flash, Header } from "@/components/ui";
import { getSession } from "@/lib/session";
import { formatPhone } from "@/lib/phone";
import { changePin } from "../actions";

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
        <form action={changePin} className="space-y-3">
          <input name="pin" type="password" inputMode="numeric" pattern="\d{6,}" placeholder="New PIN (6+ digits)" minLength={6} className="input" required autoComplete="new-password" />
          <button className="btn">Change PIN</button>
        </form>
      </div>
    </>
  );
}

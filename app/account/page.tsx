import { Flash, Header } from "@/components/ui";
import { getSession } from "@/lib/session";
import { changePassword } from "../actions";

type Props = { searchParams: Promise<{ error?: string; ok?: string }> };

export default async function AccountPage({ searchParams }: Props) {
  const { error, ok } = await searchParams;
  const { profile, settings } = await getSession();
  return (
    <>
      <Header profile={profile} settings={settings} />
      <Flash error={error} ok={ok} />
      <div className="card max-w-sm space-y-3">
        <p><span className="muted">Signed in as</span> {profile.email}</p>
        <form action={changePassword} className="space-y-3">
          <input name="password" type="password" placeholder="New password (8+ characters)" minLength={8} className="input" required autoComplete="new-password" />
          <button className="btn">Set password</button>
        </form>
      </div>
    </>
  );
}

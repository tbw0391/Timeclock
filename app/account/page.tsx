import { Flash, Header } from "@/components/ui";
import { getSession } from "@/lib/session";
import { formatPhone } from "@/lib/phone";
import { setMyKioskPin } from "../actions";

type Props = { searchParams: Promise<{ error?: string; ok?: string }> };

export default async function AccountPage({ searchParams }: Props) {
  const { error, ok } = await searchParams;
  const { supabase, profile, settings } = await getSession();
  const { data: pinSet } = await supabase.rpc("my_kiosk_pin_set");
  return (
    <>
      <Header profile={profile} settings={settings} />
      <Flash error={error} ok={ok} />
      <div className="card max-w-sm space-y-3">
        <p><span className="muted">Signed in as</span> {formatPhone(profile.phone)}</p>
        <p className="muted text-sm">You sign in with a code texted to this number. To change it, ask your manager.</p>
      </div>
      <div className="card mt-4 max-w-sm space-y-3">
        <h2 className="font-semibold">Kiosk PIN {pinSet ? "✓" : ""}</h2>
        <p className="muted text-sm">
          {pinSet ? "You have a kiosk PIN. Enter a new one to change it." : "Pick 4 digits to clock in and out on the shared kiosk tablet."}
        </p>
        <form action={setMyKioskPin} className="flex gap-2">
          <input name="pin" type="password" inputMode="numeric" pattern="\d{4}" maxLength={4} placeholder="4 digits" className="input" required autoComplete="off" />
          <button className="btn">Save</button>
        </form>
      </div>
      <div className="card mt-4 max-w-sm space-y-2 text-sm">
        <h2 className="font-semibold">Put Timeclock on your home screen</h2>
        <p><span className="font-medium">iPhone (Safari):</span> tap the Share button, then &ldquo;Add to Home Screen&rdquo;.</p>
        <p><span className="font-medium">Android (Chrome):</span> tap the ⋮ menu, then &ldquo;Add to Home screen&rdquo; or &ldquo;Install app&rdquo;.</p>
      </div>
    </>
  );
}

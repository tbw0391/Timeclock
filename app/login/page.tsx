import Link from "next/link";
import { Flash } from "@/components/ui";
import { signIn, signUp } from "./actions";

type Props = { searchParams: Promise<{ mode?: string; error?: string; ok?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { mode, error, ok } = await searchParams;
  return (
    <div className="mx-auto mt-10 max-w-sm">
      <h1 className="mb-6 text-2xl font-semibold">Timeclock</h1>
      <Flash error={error} ok={ok} />
      <div className="card space-y-3">
        {mode === "setup" ? (
          <form action={signUp} className="space-y-3">
            <p className="muted text-sm">Manager setup. This only works for the manager&apos;s phone number.</p>
            <input name="full_name" placeholder="Your name" className="input" required autoComplete="name" />
            <input name="phone" type="tel" placeholder="Phone number" className="input" required autoComplete="tel" />
            <input name="pin" type="password" inputMode="numeric" pattern="\d{6,}" title="At least 6 digits" placeholder="Choose a PIN (6+ digits)" className="input" required autoComplete="new-password" />
            <button className="btn w-full">Create manager account</button>
          </form>
        ) : (
          <form action={signIn} className="space-y-3">
            <input name="phone" type="tel" placeholder="Phone number" className="input" required autoComplete="tel" />
            <input name="pin" type="password" inputMode="numeric" placeholder="PIN" className="input" required autoComplete="current-password" />
            <button className="btn w-full">Sign in</button>
          </form>
        )}
      </div>
      <p className="muted mt-4 flex justify-between gap-3 text-sm">
        {mode === "setup" ? <Link href="/login">Back to sign in</Link> : <span>Forgot your PIN? Ask your manager to reset it.</span>}
        {mode !== "setup" && <Link href="/login?mode=setup">Manager setup</Link>}
      </p>
    </div>
  );
}

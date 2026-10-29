import Link from "next/link";
import { Flash } from "@/components/ui";
import { signIn, signUp } from "./actions";

type Props = { searchParams: Promise<{ mode?: string; error?: string; ok?: string }> };

const pinProps = { type: "password", inputMode: "numeric", pattern: "\\d{6,}", minLength: 6, className: "input", required: true } as const;

export default async function LoginPage({ searchParams }: Props) {
  const { mode, error, ok } = await searchParams;
  const signup = mode === "signup";
  return (
    <div className="mx-auto mt-10 max-w-sm">
      <h1 className="mb-6 text-2xl font-semibold">Timeclock</h1>
      <Flash error={error} ok={ok} />
      <div className="card">
        <form action={signup ? signUp : signIn} className="space-y-3">
          {signup && <input name="full_name" placeholder="Full name" className="input" required autoComplete="name" />}
          <input name="phone" type="tel" inputMode="tel" placeholder="Phone number" className="input" required autoComplete="tel" />
          <input name="pin" placeholder={signup ? "Pick a PIN (6+ digits)" : "PIN"} autoComplete={signup ? "new-password" : "current-password"} {...pinProps} />
          {signup && <input name="pin2" placeholder="PIN again" autoComplete="new-password" {...pinProps} />}
          <button className="btn w-full">{signup ? "Create account" : "Sign in"}</button>
          {signup && <p className="muted text-sm">One-time setup for the manager. Everyone else is added by the manager.</p>}
        </form>
      </div>
      <p className="muted mt-4 flex justify-between text-sm">
        {signup ? <Link href="/login">Back to sign in</Link> : <span>New or forgot your PIN? Ask your manager.</span>}
        {!signup && <Link href="/login?mode=signup" className="text-xs">Manager setup</Link>}
      </p>
    </div>
  );
}

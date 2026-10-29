import Link from "next/link";
import { Flash } from "@/components/ui";
import { resetPassword, signIn, signUp } from "./actions";

type Props = { searchParams: Promise<{ mode?: string; error?: string; ok?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { mode, error, ok } = await searchParams;
  return (
    <div className="mx-auto mt-10 max-w-sm">
      <h1 className="mb-6 text-2xl font-semibold">Timeclock</h1>
      <Flash error={error} ok={ok} />
      <div className="card space-y-3">
        {mode === "signup" ? (
          <form action={signUp} className="space-y-3">
            <input name="full_name" placeholder="Full name" className="input" required />
            <input name="email" type="email" placeholder="Email" className="input" required autoComplete="email" />
            <input name="password" type="password" placeholder="Password (8+ characters)" minLength={8} className="input" required autoComplete="new-password" />
            <button className="btn w-full">Create account</button>
            <p className="muted text-sm">A manager approves new accounts before you can clock in.</p>
          </form>
        ) : mode === "reset" ? (
          <form action={resetPassword} className="space-y-3">
            <input name="email" type="email" placeholder="Email" className="input" required autoComplete="email" />
            <button className="btn w-full">Send reset link</button>
          </form>
        ) : (
          <form action={signIn} className="space-y-3">
            <input name="email" type="email" placeholder="Email" className="input" required autoComplete="email" />
            <input name="password" type="password" placeholder="Password" className="input" required autoComplete="current-password" />
            <button className="btn w-full">Sign in</button>
          </form>
        )}
      </div>
      <p className="muted mt-4 flex justify-between text-sm">
        {mode ? <Link href="/login">Sign in</Link> : <Link href="/login?mode=signup">New here? Create an account</Link>}
        {mode !== "reset" && <Link href="/login?mode=reset">Forgot password</Link>}
      </p>
    </div>
  );
}

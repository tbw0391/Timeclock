import Link from "next/link";
import { Flash } from "@/components/ui";
import { formatPhone, normalizePhone } from "@/lib/phone";
import { sendCode, verifyCode } from "./actions";

type Props = { searchParams: Promise<{ phone?: string; error?: string; ok?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const sp = await searchParams;
  const phone = normalizePhone(sp.phone ?? "");
  return (
    <div className="mx-auto mt-10 max-w-sm">
      <h1 className="rainbow mb-6 text-4xl font-bold">Timeclock</h1>
      <Flash error={sp.error} ok={sp.ok} />
      <div className="card">
        {phone ? (
          <form action={verifyCode} className="space-y-3">
            <p className="text-sm">Enter the code we texted to {formatPhone(phone)}.</p>
            <input type="hidden" name="phone" value={phone} />
            <input name="code" inputMode="numeric" pattern="\d{6,10}" placeholder="Code" className="input" required autoFocus autoComplete="one-time-code" />
            <button className="btn w-full">Sign in</button>
          </form>
        ) : (
          <form action={sendCode} className="space-y-3">
            <input name="phone" type="tel" inputMode="tel" placeholder="Phone number" className="input" required autoComplete="tel" />
            <button className="btn w-full">Text me a code</button>
          </form>
        )}
      </div>
      <div className="muted mt-4 flex justify-between gap-3 text-sm">
        {phone ? (
          <>
            <Link href="/login">Use a different number</Link>
            <form action={sendCode}>
              <input type="hidden" name="phone" value={phone} />
              <button className="underline">Send a new code</button>
            </form>
          </>
        ) : <span>New here? Ask your manager to add your number.</span>}
      </div>
    </div>
  );
}

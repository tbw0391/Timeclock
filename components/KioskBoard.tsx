"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { kioskExit, kioskPunch } from "@/app/(staff)/kiosk/actions";
import type { KioskPerson, KioskResult } from "@/lib/kiosk";

const COLORS = ["var(--peach)", "var(--lavender)", "var(--mint)", "var(--sky)"];
const IDLE_MS = 30_000;
const DONE_MS = 4_000;

// Translated kiosk text from the server; {name}/{count} are filled in here.
export type KioskText = Record<
  "tapName" | "whichManager" | "onClock" | "offClock" | "nobody" | "needsPin" | "hi" | "enterPinIn"
  | "enterPinOut" | "enterPinExit" | "pinHint" | "digitsEntered" | "checking" | "deleteDigit" | "turnOff"
  | "cancel" | "back",
  string
>;

const fill = (s: string, vars: Record<string, string | number>) =>
  Object.entries(vars).reduce((out, [k, v]) => out.replaceAll(`{${k}}`, String(v)), s);

// The tablet doesn't move, so one location fix is reused for a while.
function useTabletLocation() {
  const fix = useRef<Record<string, string>>({ gps: "unsupported" });
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    const get = () => navigator.geolocation.getCurrentPosition(
      (p) => { fix.current = { lat: String(p.coords.latitude), lng: String(p.coords.longitude), accuracy: String(p.coords.accuracy), gps: "ok" }; },
      (e) => { fix.current = { gps: e.code === e.PERMISSION_DENIED ? "denied" : e.code === e.TIMEOUT ? "timeout" : "unavailable" }; },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 600000 },
    );
    get();
    const t = setInterval(get, 10 * 60 * 1000);
    return () => clearInterval(t);
  }, []);
  return fix;
}

export function KioskBoard({ people, tz, text }: { people: KioskPerson[]; tz: string; text: KioskText }) {
  const router = useRouter();
  const location = useTabletLocation();
  const [mode, setMode] = useState<"punch" | "exit">("punch");
  const [who, setWho] = useState<KioskPerson | null>(null);
  const [pin, setPin] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const [punched, punchAction, punchPending] = useActionState<KioskResult | null, FormData>(kioskPunch, null);
  const [exited, exitAction, exitPending] = useActionState<KioskResult | null, FormData>(kioskExit, null);
  const result = mode === "exit" ? exited : punched;
  const pending = punchPending || exitPending;
  const [shown, setShown] = useState<KioskResult | null>(null);

  const reset = () => { setWho(null); setPin(""); setMode("punch"); setShown(null); };

  // Show each new result once (switching modes would otherwise replay an old
  // one); success returns to the name list, a miss clears the PIN.
  const seen = useRef(0);
  useEffect(() => {
    if (!result || result.nonce <= seen.current) return;
    seen.current = result.nonce;
    setShown(result);
    setPin("");
    if (result.ok) {
      const t = setTimeout(() => { reset(); router.refresh(); }, DONE_MS);
      return () => clearTimeout(t);
    }
  }, [result, router]);

  // Walked away mid-PIN: go back to the list.
  useEffect(() => {
    if (!who) return;
    const t = setTimeout(reset, IDLE_MS);
    return () => clearTimeout(t);
  }, [who, pin]);

  // Submit as soon as the 4th digit is in.
  useEffect(() => {
    if (pin.length === 4 && formRef.current) formRef.current.requestSubmit();
  }, [pin]);

  const press = (d: string) => { setShown(null); setPin((p) => (p.length < 4 ? p + d : p)); };

  if (shown?.ok) {
    return (
      <div className="card py-16 text-center">
        <p className="text-6xl">{shown.action === "in" ? "👋" : "🎉"}</p>
        <p className="mt-4 text-3xl font-bold">{shown.message}</p>
      </div>
    );
  }

  if (who) {
    return (
      <div className="card mx-auto max-w-sm text-center">
        <p className="text-2xl font-bold">{fill(text.hi, { name: who.name })}</p>
        <p className="muted mt-1">
          {mode === "exit" ? text.enterPinExit : who.on_clock ? text.enterPinOut : text.enterPinIn}
        </p>
        <p className="muted text-xs">{text.pinHint}</p>
        <div className="my-5 flex justify-center gap-3" dir="ltr" aria-label={fill(text.digitsEntered, { count: pin.length })}>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="h-5 w-5 rounded-full border-2" style={{ borderColor: "var(--line)", background: i < pin.length ? "var(--line)" : "transparent" }} />
          ))}
        </div>
        {shown && !shown.ok && <p className="mb-3 font-medium text-red-600">{shown.message}</p>}
        <form ref={formRef} action={mode === "exit" ? exitAction : punchAction}>
          <input type="hidden" name="user_id" value={who.id} />
          <input type="hidden" name="name" value={who.name} />
          <input type="hidden" name="pin" value={pin} />
          <input type="hidden" name="tz" value={tz} />
          {mode === "punch" && Object.entries(location.current).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
        </form>
        {/* Keypads read left to right in every language. */}
        <div className="mx-auto grid max-w-64 grid-cols-3 gap-3" dir="ltr">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <button key={d} type="button" className="btn py-4 text-2xl" disabled={pending} onClick={() => press(d)}>{d}</button>
          ))}
          <button type="button" className="btn-ghost py-4" onClick={reset}>{text.cancel}</button>
          <button type="button" className="btn py-4 text-2xl" disabled={pending} onClick={() => press("0")}>0</button>
          <button type="button" className="btn-ghost py-4 text-xl" aria-label={text.deleteDigit} onClick={() => setPin((p) => p.slice(0, -1))}>⌫</button>
        </div>
        {pending && <p className="muted mt-3">{text.checking}</p>}
      </div>
    );
  }

  const list = mode === "exit" ? people.filter((p) => p.is_manager) : people;
  return (
    <>
      <h1 className="mb-4 text-center text-3xl font-bold">{mode === "exit" ? text.whichManager : text.tapName}</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {list.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => (p.has_pin ? setWho(p) : setShown({ ok: false, message: fill(text.needsPin, { name: p.name }), nonce: Date.now() }))}
            className="rounded-3xl border-[3px] p-5 text-start text-xl font-semibold transition-transform active:translate-y-1"
            style={{ background: COLORS[i % COLORS.length], borderColor: "var(--charcoal)", color: "var(--charcoal)", boxShadow: "0 5px 0 var(--charcoal)" }}
          >
            {p.name}
            <span className="mt-1 block text-sm font-medium">{p.on_clock ? text.onClock : text.offClock}</span>
          </button>
        ))}
        {!list.length && <p className="muted col-span-full text-center">{text.nobody}</p>}
      </div>
      {shown && !shown.ok && <p className="mt-4 text-center font-medium text-red-600">{shown.message}</p>}
      <p className="mt-8 text-center text-sm">
        {mode === "exit"
          ? <button type="button" className="underline" onClick={reset}>{text.back}</button>
          : <button type="button" className="muted underline" onClick={() => { setMode("exit"); setShown(null); }}>{text.turnOff}</button>}
      </p>
    </>
  );
}

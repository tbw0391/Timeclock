"use client";

import { useFormStatus } from "react-dom";

// Grabs the phone's location when Clock In / Clock Out is tapped and sends it
// with the punch. If there's no fix the punch still goes through, tagged with
// why (see 0006_punch_locations.sql).
function locate(): Promise<Record<string, string>> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve({ gps: "unsupported" });
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({
        lat: String(p.coords.latitude),
        lng: String(p.coords.longitude),
        accuracy: String(p.coords.accuracy),
        gps: "ok",
      }),
      (e) => resolve({
        gps: e.code === e.PERMISSION_DENIED ? "denied" : e.code === e.TIMEOUT ? "timeout" : "unavailable",
      }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  });
}

type Labels = { pending: string; note: string; locationNote: string };

function Submit({ label, pendingLabel, className }: { label: string; pendingLabel: string; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}

export function ClockForm({ action, label, labels, className }: {
  action: (form: FormData) => Promise<void>;
  label: string;
  labels: Labels;
  className: string;
}) {
  return (
    <form
      action={async (form) => {
        for (const [k, v] of Object.entries(await locate())) form.set(k, v);
        await action(form);
      }}
      className="mx-auto mt-4 max-w-sm space-y-3"
    >
      <input name="note" placeholder={labels.note} className="input" maxLength={500} />
      <Submit label={label} pendingLabel={labels.pending} className={className} />
      <p className="muted text-xs">{labels.locationNote}</p>
    </form>
  );
}

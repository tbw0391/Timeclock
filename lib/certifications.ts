import { addDays } from "./time";

// How soon before a certification runs out it starts showing as due.
export const DUE_SOON_DAYS = 60;

export type Cert = { id: number; user_id: string; kind: string; expires_on: string | null; note: string };
export type CertStatus = "expired" | "soon" | "ok" | "never";

// today is YYYY-MM-DD in the business time zone.
export function certStatus(expires: string | null, today: string): CertStatus {
  if (!expires) return "never";
  if (expires < today) return "expired";
  if (expires <= addDays(today, DUE_SOON_DAYS)) return "soon";
  return "ok";
}

// Badge colors for each status.
export const CERT_STYLE: Record<CertStatus, string> = {
  expired: "bg-red-100 text-red-800",
  soon: "bg-amber-100 text-amber-900",
  ok: "bg-green-100 text-green-800",
  never: "bg-gray-100 text-gray-700",
};

// Expired first, then soonest to run out, then the ones that don't expire.
export function byUrgency(a: Cert, b: Cert) {
  if (a.expires_on === b.expires_on) return a.kind.localeCompare(b.kind);
  if (!a.expires_on) return 1;
  if (!b.expires_on) return -1;
  return a.expires_on.localeCompare(b.expires_on);
}

// Common ones in Ohio child care, offered as suggestions when adding one.
export const CERT_SUGGESTIONS = [
  "CPR",
  "First Aid",
  "Communicable Disease",
  "Child Abuse Prevention",
  "Background check (BCI/FBI)",
  "Medication Administration",
  "Food Handler",
];

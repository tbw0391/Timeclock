// Sign-in is phone + PIN. Supabase Auth still keys accounts by email, so each
// number logs in as <10 digits>@phone.timeclock.app (see 0003_phone_pin_login.sql).

// 10 digits, or null. Drops formatting and a leading US country code.
export function normalizePhone(raw: string): string | null {
  let d = raw.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  return /^\d{10}$/.test(d) ? d : null;
}

export function phoneEmail(phone: string): string {
  return `${phone}@phone.timeclock.app`;
}

export function formatPhone(phone: string | null | undefined): string {
  if (!phone || !/^\d{10}$/.test(phone)) return phone ?? "";
  return `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`;
}

export function isPin(pin: string): boolean {
  return /^\d{6,}$/.test(pin);
}

export function displayName(p: { full_name: string; phone: string | null } | undefined): string {
  return p?.full_name || formatPhone(p?.phone) || "?";
}

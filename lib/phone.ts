// US phone numbers as 10 bare digits. Supabase Auth needs an email, so each
// number signs in under a stand-in address that never receives mail.

export function normalizePhone(input: string): string | null {
  let d = input.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  return /^\d{10}$/.test(d) ? d : null;
}

export function loginEmail(phone: string): string {
  return `${phone}@phone.timeclock.app`;
}

export function formatPhone(phone: string | null | undefined): string {
  return phone && /^\d{10}$/.test(phone) ? `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}` : phone ?? "";
}

export function isPin(pin: string): boolean {
  return /^\d{6,}$/.test(pin);
}

// US phone numbers as 10 bare digits. Sign-in is a code texted to the number
// through Supabase phone auth, which wants E.164 (+1XXXXXXXXXX).

export function normalizePhone(input: string): string | null {
  let d = input.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  return /^\d{10}$/.test(d) ? d : null;
}

export function e164(phone: string): string {
  return `+1${phone}`;
}

export function formatPhone(phone: string | null | undefined): string {
  return phone && /^\d{10}$/.test(phone) ? `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}` : phone ?? "";
}

// Supabase's SMS code length is configurable (6 by default).
export function isCode(code: string): boolean {
  return /^\d{6,10}$/.test(code);
}

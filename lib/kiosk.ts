// A kiosk tablet carries a random token in this httpOnly cookie instead of a
// Supabase session (see 0007_kiosk.sql).
export const KIOSK_COOKIE = "kiosk_token";
export const KIOSK_COOKIE_MAX_AGE = 60 * 60 * 24 * 400; // browsers cap cookies near 400 days

export type KioskPerson = { id: string; name: string; on_clock: boolean; has_pin: boolean; is_manager: boolean };

export type KioskResult = { ok: boolean; message: string; nonce: number; action?: "in" | "out" };

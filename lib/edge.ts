import "server-only";
import { createClient } from "@/lib/supabase/server";

// Calls one of the Supabase edge functions (quickbooks, gusto) as the
// signed-in manager. Errors come back as the function's error code or message.
export async function callFunction<T>(name: string, action: string, extra: Record<string, unknown> = {}): Promise<{ data?: T; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke(name, { body: { action, ...extra } });
  if (!error) return { data: data as T };
  const body = await (error as { context?: Response }).context?.json?.().catch(() => null);
  return { error: body?.error ?? error.message };
}

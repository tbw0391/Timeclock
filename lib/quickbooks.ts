import "server-only";
import { createClient } from "@/lib/supabase/server";

// QuickBooks is off unless QUICKBOOKS=on is set in Vercel (and the
// `quickbooks` edge function is deployed with its secrets; see README).
export const quickbooksOn = () => process.env.QUICKBOOKS === "on";

export type QboStatus = {
  configured: boolean;
  connected: boolean;
  sandbox: boolean;
  company: string;
  sync_from: string | null;
  last_sync_at: string | null;
  last_error: string;
  pending: number | null;
};

// Calls the edge function as the signed-in manager. Errors come back as the
// function's error code or message.
export async function callQuickbooks<T>(action: string, extra: Record<string, unknown> = {}): Promise<{ data?: T; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke("quickbooks", { body: { action, ...extra } });
  if (!error) return { data: data as T };
  const body = await (error as { context?: Response }).context?.json?.().catch(() => null);
  return { error: body?.error ?? error.message };
}

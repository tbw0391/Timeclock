import "server-only";
import { callFunction } from "@/lib/edge";

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

export const callQuickbooks = <T>(action: string, extra?: Record<string, unknown>) => callFunction<T>("quickbooks", action, extra);

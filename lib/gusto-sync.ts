import "server-only";
import { callFunction } from "@/lib/edge";

// The live Gusto connection is off unless GUSTO=on is set in Vercel (and the
// `gusto` edge function is deployed with its secrets; see README). The
// "Download for Gusto" file (lib/gusto.ts) works either way.
export const gustoOn = () => process.env.GUSTO === "on";

export type GustoStatus = {
  configured: boolean;
  connected: boolean;
  demo: boolean;
  company: string;
  sync_from: string | null;
  last_sync_at: string | null;
  last_error: string;
  pending: number | null;
  unmatched: number;
};
export type GustoEmployee = { uuid: string; name: string; job_uuid?: string };

export const callGusto = <T>(action: string, extra?: Record<string, unknown>) => callFunction<T>("gusto", action, extra);

import { dateLabel } from "./time";

export type TimeOffKind = "vacation" | "sick" | "personal" | "other";
export type TimeOffStatus = "pending" | "approved" | "declined" | "cancelled";
export type TimeOff = {
  id: number; user_id: string; starts_on: string; ends_on: string; kind: TimeOffKind; note: string;
  status: TimeOffStatus; decision_note: string; created_at: string;
};

export const TIME_OFF_KINDS: TimeOffKind[] = ["vacation", "sick", "personal", "other"];

export const STATUS_STYLE: Record<TimeOffStatus, string> = {
  pending: "bg-amber-100 text-amber-900",
  approved: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-700",
};

// Calendar days from the first day off to the last, counting both.
export function dayCount(start: string, end: string) {
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000) + 1;
}

export function rangeLabel(start: string, end: string, intl: string) {
  return start === end ? dateLabel(start, intl) : `${dateLabel(start, intl)} – ${dateLabel(end, intl)}`;
}

// Approved time off that covers any day from `from` to `to`.
export const overlaps = (r: TimeOff, from: string, to: string) => r.status === "approved" && r.starts_on <= to && r.ends_on >= from;

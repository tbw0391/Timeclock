"use client";

import { useFormStatus } from "react-dom";

// One child's tile. Disabled while the tap is saving so a double tap can't
// check a child in and straight back out.
export function ChildButton({ name, status, here, color }: { name: string; status: string; here: boolean; color: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="w-full rounded-3xl border-[3px] p-5 text-start transition-transform active:translate-y-1 disabled:opacity-60"
      style={{
        background: here ? "var(--go)" : color,
        borderColor: "var(--charcoal)",
        color: "var(--charcoal)",
        boxShadow: "0 5px 0 var(--charcoal)",
      }}
    >
      <span className="block text-2xl font-bold">{here ? "✅ " : ""}{name}</span>
      <span className="mt-1 block text-sm font-medium">{status}</span>
    </button>
  );
}

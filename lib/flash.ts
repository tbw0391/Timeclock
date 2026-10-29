import { redirect } from "next/navigation";

// Server actions report back through the query string so pages stay plain
// server components.
export function back(path: string, msg: { error?: string; ok?: string }): never {
  const q = new URLSearchParams();
  if (msg.error) q.set("error", msg.error);
  if (msg.ok) q.set("ok", msg.ok);
  const sep = path.includes("?") ? "&" : "?";
  redirect(q.size ? `${path}${sep}${q}` : path);
}

export function text(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

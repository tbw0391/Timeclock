import { appIcon } from "@/lib/app-icon";

// Served at /icon/32 (browser tab), /icon/192 and /icon/512 (Android home screen).
export function generateImageMetadata() {
  return [32, 192, 512].map((s) => ({ id: String(s), size: { width: s, height: s }, contentType: "image/png" }));
}

export default async function Icon({ id }: { id: Promise<string> | string }) {
  return appIcon(Number(await id));
}

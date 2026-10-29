import { ImageResponse } from "next/og";

// Home-screen icon: a white clock with grape hands on a pink-to-sunshine
// gradient, matching the crayon-box theme. Drawn at any size so the manifest,
// iOS and the browser tab all share one design.
export function appIcon(size: number) {
  const face = size * 0.62;
  const stroke = Math.max(2, size * 0.06);
  // Hands at 3 o'clock: straight up and straight right, both from the center
  // (the image renderer doesn't rotate around a custom origin reliably).
  const c = face / 2 - stroke / 2;
  const hand = (w: number, h: number, left: number, top: number, color: string) => (
    <div style={{ position: "absolute", left, top, width: w, height: h, background: color, borderRadius: stroke }} />
  );
  const dot = (d: number, left: number, top: number, color: string) => (
    <div style={{ position: "absolute", left, top, width: d, height: d, borderRadius: d, background: color }} />
  );
  return new ImageResponse(
    (
      <div
        style={{
          width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative", background: "linear-gradient(135deg, #ff6fb5 0%, #fb923c 50%, #ffc93c 100%)",
        }}
      >
        {dot(size * 0.09, size * 0.1, size * 0.12, "#38bdf8")}
        {dot(size * 0.07, size * 0.82, size * 0.2, "#4ade80")}
        {dot(size * 0.08, size * 0.14, size * 0.8, "#7c3aed")}
        <div
          style={{
            width: face, height: face, borderRadius: face, background: "#ffffff", position: "relative", display: "flex",
            border: `${stroke * 0.7}px solid #2d1b4e`,
          }}
        >
          {hand(stroke, face * 0.28 + stroke / 2, c - stroke * 0.7, face / 2 - face * 0.28 - stroke * 0.7, "#7c3aed")}
          {hand(face * 0.2 + stroke / 2, stroke, c - stroke * 0.7, c - stroke * 0.7, "#e11d48")}
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}

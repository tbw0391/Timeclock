import { ImageResponse } from "next/og";

// Home-screen icon: a white clock face on the app's accent blue. Drawn at any
// size so the manifest, iOS and the browser tab all share one design.
export function appIcon(size: number) {
  const face = size * 0.62;
  const stroke = Math.max(2, size * 0.055);
  // Hands at 3 o'clock: straight up and straight right, both from the center
  // (the image renderer doesn't rotate around a custom origin reliably).
  const c = face / 2 - stroke / 2;
  const hand = (w: number, h: number, left: number, top: number) => (
    <div style={{ position: "absolute", left, top, width: w, height: h, background: "#1d4ed8", borderRadius: stroke }} />
  );
  return new ImageResponse(
    (
      <div style={{ width: size, height: size, background: "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: face, height: face, borderRadius: face, background: "#ffffff", position: "relative", display: "flex" }}>
          {hand(stroke, face * 0.3 + stroke / 2, c, face / 2 - face * 0.3)}
          {hand(face * 0.22 + stroke / 2, stroke, c, c)}
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}

// Display helpers for the GPS tag on punches (see 0006_punch_locations.sql).

export type GpsStatus = "ok" | "denied" | "unavailable" | "timeout" | "unsupported";

export type GpsFix = {
  gps: GpsStatus | null;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
};

const PROBLEMS: Record<Exclude<GpsStatus, "ok">, string> = {
  denied: "Location blocked",
  unavailable: "No GPS fix",
  timeout: "GPS timed out",
  unsupported: "No location sent",
};

export function mapUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

// "39.96120, -82.99880 (±12 m)", a flagged reason, or "" for times a manager entered.
export function gpsText(f: GpsFix): string {
  if (f.gps === "ok" && f.lat != null && f.lng != null) {
    const acc = f.accuracy != null ? ` (±${Math.round(f.accuracy)} m)` : "";
    return `${f.lat.toFixed(5)}, ${f.lng.toFixed(5)}${acc}`;
  }
  return f.gps ? PROBLEMS[f.gps as Exclude<GpsStatus, "ok">] ?? "" : "";
}

export function gpsProblem(f: GpsFix): boolean {
  return !!f.gps && f.gps !== "ok";
}

export function inFix(p: { in_gps: GpsStatus | null; in_lat: number | null; in_lng: number | null; in_accuracy_m: number | null }): GpsFix {
  return { gps: p.in_gps, lat: p.in_lat, lng: p.in_lng, accuracy: p.in_accuracy_m };
}

export function outFix(p: { out_gps: GpsStatus | null; out_lat: number | null; out_lng: number | null; out_accuracy_m: number | null }): GpsFix {
  return { gps: p.out_gps, lat: p.out_lat, lng: p.out_lng, accuracy: p.out_accuracy_m };
}

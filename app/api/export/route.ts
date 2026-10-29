import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Punch, Settings } from "@/lib/session";
import { addDays, csvCell, hours, isDate, localInput, todayIn, weekStart, weekTotals, type DayRow } from "@/lib/time";

// Payroll CSV: one row per punch, then weekly totals per person.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return new NextResponse("Managers only", { status: 403 });

  const { data: settings } = await supabase.from("settings").select("*").single<Settings>();
  const tz = settings!.timezone;
  const sp = request.nextUrl.searchParams;
  const thisWeek = weekStart(todayIn(tz), settings!.week_starts_on);
  const from = isDate(sp.get("from")) ? sp.get("from")! : addDays(thisWeek, -7);
  const to = isDate(sp.get("to")) ? sp.get("to")! : addDays(thisWeek, 6);
  const user = sp.get("user");

  let q = supabase.from("punches").select("*")
    .gte("clock_in", `${addDays(from, -1)}T00:00:00Z`).lt("clock_in", `${addDays(to, 2)}T00:00:00Z`)
    .order("clock_in");
  if (user) q = q.eq("user_id", user);
  const [{ data: people }, { data: punches }, { data: days }] = await Promise.all([
    supabase.from("profiles").select("*").returns<Profile[]>(),
    q.returns<Punch[]>(),
    supabase.rpc("timesheet", { p_from: from, p_to: to }),
  ]);
  const byId = new Map((people ?? []).map((p) => [p.id, p]));

  const lines: (string | number)[][] = [["Employee", "Email", "Date", "Clock in", "Clock out", "Hours", "Note"]];
  for (const p of punches ?? []) {
    const inLocal = localInput(p.clock_in, tz);
    if (inLocal.slice(0, 10) < from || inLocal.slice(0, 10) > to) continue;
    const who = byId.get(p.user_id);
    lines.push([
      who?.full_name ?? "", who?.email ?? "", inLocal.slice(0, 10), inLocal.replace("T", " "),
      p.clock_out ? localInput(p.clock_out, tz).replace("T", " ") : "MISSING",
      p.clock_out ? hours((Date.parse(p.clock_out) - Date.parse(p.clock_in)) / 1000) : "",
      p.note,
    ]);
  }
  lines.push([], ["Week of", "Employee", "Total hours", "Regular hours", "Overtime hours"]);
  const weeks = weekTotals(((days ?? []) as DayRow[]).filter((d) => !user || d.user_id === user),
    settings!.week_starts_on, Number(settings!.overtime_hours));
  for (const w of weeks) {
    lines.push([w.week, w.name, hours(w.seconds), hours(w.seconds - w.overtime), hours(w.overtime)]);
  }

  const csv = lines.map((l) => l.map(csvCell).join(",")).join("\r\n") + "\r\n";
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="timesheet-${from}-to-${to}.csv"`,
    },
  });
}

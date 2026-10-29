import ExcelJS from "exceljs";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Punch, Settings } from "@/lib/session";
import { gpsText, inFix, mapUrl, outFix, type GpsFix } from "@/lib/gps";
import { formatPhone } from "@/lib/phone";
import { addDays, csvCell, hours, isDate, localInput, todayIn, weekStart, weekTotals, type DayRow } from "@/lib/time";

// Payroll export: one row per punch (with GPS tags), then weekly totals per
// person. ?format=xlsx gives an Excel workbook with a tab for each; otherwise CSV.
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

  const rows = (punches ?? []).flatMap((p) => {
    const inLocal = localInput(p.clock_in, tz);
    if (inLocal.slice(0, 10) < from || inLocal.slice(0, 10) > to) return [];
    const who = byId.get(p.user_id);
    return [{
      name: who?.full_name ?? "",
      phone: formatPhone(who?.phone),
      date: inLocal.slice(0, 10),
      inLocal,
      outLocal: p.clock_out ? localInput(p.clock_out, tz) : null,
      seconds: p.clock_out ? (Date.parse(p.clock_out) - Date.parse(p.clock_in)) / 1000 : null,
      in: inFix(p),
      out: p.clock_out ? outFix(p) : null,
      note: p.note,
    }];
  });
  const weeks = weekTotals(((days ?? []) as DayRow[]).filter((d) => !user || d.user_id === user),
    settings!.week_starts_on, Number(settings!.overtime_hours));
  const filename = `timesheet-${from}-to-${to}`;

  if (sp.get("format") === "xlsx") {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Punches", { views: [{ state: "frozen", ySplit: 1 }] });
    ws.columns = [
      { header: "Employee", width: 22 }, { header: "Phone", width: 16 }, { header: "Date", width: 12 },
      { header: "Clock in", width: 18 }, { header: "Clock out", width: 18 }, { header: "Hours", width: 8 },
      { header: "In location", width: 30 }, { header: "In map", width: 10 },
      { header: "Out location", width: 30 }, { header: "Out map", width: 10 }, { header: "Note", width: 40 },
    ];
    // Wall-clock times in the business zone, written as zone-less spreadsheet dates.
    const when = (local: string) => new Date(`${local}:00Z`);
    const link = (f: GpsFix | null) =>
      f?.gps === "ok" && f.lat != null && f.lng != null ? { text: "Map", hyperlink: mapUrl(f.lat, f.lng) } : "";
    for (const r of rows) {
      ws.addRow([
        r.name, r.phone, when(`${r.date}T00:00`), when(r.inLocal), r.outLocal ? when(r.outLocal) : "MISSING",
        r.seconds != null ? Number(hours(r.seconds)) : null,
        gpsText(r.in) || "Manual", link(r.in), r.out ? gpsText(r.out) || "Manual" : "", link(r.out), r.note,
      ]);
    }
    ws.getColumn(3).numFmt = "yyyy-mm-dd";
    ws.getColumn(4).numFmt = "yyyy-mm-dd h:mm AM/PM";
    ws.getColumn(5).numFmt = "yyyy-mm-dd h:mm AM/PM";
    ws.getColumn(6).numFmt = "0.00";
    for (const c of [8, 10]) ws.getColumn(c).font = { color: { argb: "FF0563C1" }, underline: true };
    ws.getRow(1).font = { bold: true };

    const wt = wb.addWorksheet("Weekly totals", { views: [{ state: "frozen", ySplit: 1 }] });
    wt.columns = [
      { header: "Week of", width: 12 }, { header: "Employee", width: 22 }, { header: "Total hours", width: 12 },
      { header: "Regular hours", width: 14 }, { header: "Overtime hours", width: 15 },
    ];
    for (const w of weeks) {
      wt.addRow([when(`${w.week}T00:00`), w.name, Number(hours(w.seconds)),
        Number(hours(w.seconds - w.overtime)), Number(hours(w.overtime))]);
    }
    wt.getColumn(1).numFmt = "yyyy-mm-dd";
    for (const c of [3, 4, 5]) wt.getColumn(c).numFmt = "0.00";
    wt.getRow(1).font = { bold: true };

    const buf = await wb.xlsx.writeBuffer();
    return new NextResponse(buf as ArrayBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
      },
    });
  }

  const mapCell = (f: GpsFix | null) => (f?.gps === "ok" && f.lat != null && f.lng != null ? mapUrl(f.lat, f.lng) : "");
  const lines: (string | number)[][] = [[
    "Employee", "Phone", "Date", "Clock in", "Clock out", "Hours",
    "In location", "In map", "Out location", "Out map", "Note",
  ]];
  for (const r of rows) {
    lines.push([
      r.name, r.phone, r.date, r.inLocal.replace("T", " "),
      r.outLocal ? r.outLocal.replace("T", " ") : "MISSING",
      r.seconds != null ? hours(r.seconds) : "",
      gpsText(r.in) || "Manual", mapCell(r.in), r.out ? gpsText(r.out) || "Manual" : "", mapCell(r.out), r.note,
    ]);
  }
  lines.push([], ["Week of", "Employee", "Total hours", "Regular hours", "Overtime hours"]);
  for (const w of weeks) {
    lines.push([w.week, w.name, hours(w.seconds), hours(w.seconds - w.overtime), hours(w.overtime)]);
  }

  const csv = lines.map((l) => l.map(csvCell).join(",")).join("\r\n") + "\r\n";
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.csv"`,
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { csvEscape, getMonthlySummary } from "@/lib/queries/reports";
import { currentMonth } from "@/lib/utils/date";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const me = await getSession();
  if (!me || me.role !== "HR") return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  const p = new URL(req.url).searchParams;
  const month = /^\d{4}-\d{2}$/.test(p.get("month") || "") ? p.get("month")! : currentMonth();
  const rows = await getMonthlySummary(month, p.get("department") || "");

  if (p.get("format") === "xlsx") {
    const data = rows.map((r) => ({
      "Employee ID": r.employee_id,
      "Name": r.name,
      "Department": r.department,
      "Present": r.present,
      "Absent": r.absent,
      "Leave": r.leave,
      "Weekly Off": r.weeklyOff,
      "Holiday": r.holiday,
      "Attendance %": r.pct,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Monthly Summary");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="monthly-summary-${month}.xlsx"`,
      },
    });
  }

  const body = ["Employee ID,Name,Department,Present,Absent,Leave,Weekly Off,Holiday,Attendance %",
    ...rows.map((r) => [r.employee_id, r.name, r.department, r.present, r.absent, r.leave, r.weeklyOff, r.holiday, r.pct].map(csvEscape).join(","))].join("\n");
  return new NextResponse("\uFEFF" + body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="monthly-summary-${month}.csv"` } });
}


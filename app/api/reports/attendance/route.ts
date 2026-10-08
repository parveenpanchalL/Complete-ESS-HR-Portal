import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { q } from "@/lib/db";
import { csvEscape } from "@/lib/queries/reports";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const me = await getSession();
  if (!me || me.role !== "HR") return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  const p = new URL(req.url).searchParams;
  const params: string[] = [p.get("from") || "1970-01-01", p.get("to") || "2100-01-01"];
  let text = `SELECT a.date, e.employee_id, e.name, e.department, a.in_time, a.out_time, a.working_hours, a.status
    FROM attendance a JOIN employees e ON e.id = a.employee_db_id WHERE a.date >= ? AND a.date <= ?`;
  if (p.get("employeeId")) { text += ` AND e.employee_id = ?`; params.push(p.get("employeeId")!.toUpperCase()); }
  if (p.get("department")) { text += ` AND e.department = ?`; params.push(p.get("department")!); }
  if (p.get("status")) { text += ` AND a.status = ?`; params.push(p.get("status")!); }
  text += ` ORDER BY a.date DESC, e.employee_id LIMIT 200000`;
  const rows = await q<Record<string, unknown>>(text, params);

  if (p.get("format") === "xlsx") {
    const data = rows.map((r) => ({
      "Date": r.date,
      "Employee ID": r.employee_id,
      "Name": r.name,
      "Department": r.department,
      "In Time": r.in_time || "—",
      "Out Time": r.out_time || "—",
      "Working Hours": r.working_hours ?? 0,
      "Status": r.status,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="attendance-report.xlsx"',
      },
    });
  }

  const body = ["Date,Employee ID,Name,Department,In Time,Out Time,Working Hours,Status",
    ...rows.map((r) => [r.date, r.employee_id, r.name, r.department, r.in_time, r.out_time, r.working_hours, r.status].map(csvEscape).join(","))].join("\n");
  return new NextResponse("\uFEFF" + body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="attendance-report.csv"` } });
}


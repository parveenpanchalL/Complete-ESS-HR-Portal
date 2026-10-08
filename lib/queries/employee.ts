import { q } from "@/lib/db";
import { computePct } from "./reports";

export type AttRow = { id: string; date: string; in_time: string | null; out_time: string | null; working_hours: number | null; status: string };

export function fmtHours(h: number | null) {
  if (h == null) return "—";
  const m = Math.round(h * 60);
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
}

export async function getMonthAttendance(dbId: string, month: string) {
  const rows = await q<AttRow>(
    `SELECT id, date, in_time, out_time, working_hours, status FROM attendance
     WHERE employee_db_id = ? AND date >= ? AND date <= ? ORDER BY date DESC`, [dbId, `${month}-01`, `${month}-31`]);
  const c = { present: 0, late: 0, half: 0, missing: 0, absent: 0, leave: 0, holiday: 0, weeklyOff: 0, hours: 0 };
  for (const r of rows) {
    if (r.status === "PRESENT") c.present++;
    else if (r.status === "LATE") c.late++;
    else if (r.status === "HALF_DAY") c.half++;
    else if (r.status === "MISSING_PUNCH") c.missing++;
    else if (r.status === "ABSENT") c.absent++;
    else if (r.status === "LEAVE") c.leave++;
    else if (r.status === "HOLIDAY") c.holiday++;
    else if (r.status === "WEEKLY_OFF") c.weeklyOff++;
    c.hours += r.working_hours || 0;
  }
  return { rows, counts: c, pct: computePct(c), presentDays: c.present + c.late + c.half * 0.5 };
}

export async function getAvailableMonths(dbId: string, current: string): Promise<string[]> {
  const r = await q<{ m: string }>(`SELECT DISTINCT substr(date,1,7) m FROM attendance WHERE employee_db_id = ? ORDER BY m DESC`, [dbId]);
  const list = r.map((x) => x.m);
  if (!list.includes(current)) list.unshift(current);
  return list;
}

export async function getLeaveBalances(dbId: string) {
  return q<{ code: string; name: string; remaining: number; allocated: number }>(
    `SELECT lt.code, lt.name, lb.remaining, lb.allocated FROM leave_balances lb
     JOIN leave_types lt ON lt.id = lb.leave_type_id WHERE lb.employee_db_id = ? ORDER BY lt.code`, [dbId]);
}

import { q } from "@/lib/db";

export type MonthlyRow = {
  employee_id: string; name: string; department: string;
  present: number; absent: number; leave: number; weeklyOff: number; holiday: number; pct: number;
};

export function computePct(c: { present: number; late: number; half: number; missing: number; absent: number; leave: number }) {
  const working = c.present + c.late + c.half + c.missing + c.absent + c.leave;
  if (working === 0) return 0;
  return Math.round(((c.present + c.late + c.missing + c.half * 0.5) / working) * 1000) / 10;
}

export function monthBounds(month: string) {
  return [`${month}-01`, `${month}-31`] as const;
}

export async function getMonthlySummary(month: string, department = ""): Promise<MonthlyRow[]> {
  const [from, to] = monthBounds(month);
  const params: string[] = [from, to];
  let sqlText = `SELECT e.employee_id, e.name, e.department, a.status, COUNT(*)::int c
    FROM attendance a JOIN employees e ON e.id = a.employee_db_id WHERE a.date >= ? AND a.date <= ?`;
  if (department) { sqlText += ` AND e.department = ?`; params.push(department); }
  sqlText += ` GROUP BY e.employee_id, e.name, e.department, a.status ORDER BY e.employee_id`;

  const rows = await q<{ employee_id: string; name: string; department: string; status: string; c: number }>(sqlText, params);
  const m = new Map<string, MonthlyRow & { late: number; half: number; missing: number; onlyPresent: number }>();
  for (const r of rows) {
    if (!m.has(r.employee_id))
      m.set(r.employee_id, { employee_id: r.employee_id, name: r.name, department: r.department, present: 0, absent: 0, leave: 0,
        weeklyOff: 0, holiday: 0, pct: 0, late: 0, half: 0, missing: 0, onlyPresent: 0 });
    const x = m.get(r.employee_id)!;
    if (r.status === "PRESENT") { x.present += r.c; x.onlyPresent += r.c; }
    else if (r.status === "LATE") { x.present += r.c; x.late += r.c; }
    else if (r.status === "HALF_DAY") x.half += r.c;
    else if (r.status === "MISSING_PUNCH") x.missing += r.c;
    else if (r.status === "ABSENT") x.absent += r.c;
    else if (r.status === "LEAVE") x.leave += r.c;
    else if (r.status === "WEEKLY_OFF") x.weeklyOff += r.c;
    else if (r.status === "HOLIDAY") x.holiday += r.c;
  }
  return Array.from(m.values()).map((x) => ({
    employee_id: x.employee_id, name: x.name, department: x.department, present: x.present, absent: x.absent,
    leave: x.leave, weeklyOff: x.weeklyOff, holiday: x.holiday,
    pct: computePct({ present: x.onlyPresent, late: x.late, half: x.half, missing: x.missing, absent: x.absent, leave: x.leave }),
  }));
}

export const csvEscape = (v: unknown) => {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // neutralise spreadsheet formula injection
  return `"${s.replace(/"/g, '""')}"`;
};

import { q1 } from "@/lib/db";
import { todayStr } from "@/lib/utils/date";

export async function getHrDashboardStats() {
  const today = todayStr();
  const dateRow = await q1<{ asOf: string }>(
    `SELECT COALESCE(
       (SELECT date FROM attendance WHERE date = $1 LIMIT 1),
       (SELECT max(date) FROM attendance WHERE date <= $1),
       $1
     ) as "asOf"`,
    [today]
  );
  const asOf = dateRow?.asOf || today;
  const r = await q1<Record<string, number>>(
    `SELECT
      (SELECT COUNT(*)::int FROM employees WHERE status='ACTIVE') total,
      (SELECT COUNT(*)::int FROM attendance WHERE date=$1 AND status IN ('PRESENT','LATE','HALF_DAY')) present,
      (SELECT COUNT(*)::int FROM attendance WHERE date=$1 AND status='ABSENT') absent,
      (SELECT COUNT(*)::int FROM attendance WHERE date=$1 AND status='LEAVE') onleave,
      (SELECT COUNT(*)::int FROM attendance WHERE date=$1 AND status='LATE') late,
      (SELECT COUNT(*)::int FROM attendance WHERE date=$1 AND status='MISSING_PUNCH') missing,
      (SELECT COUNT(*)::int FROM leave_requests WHERE status='PENDING') pl,
      (SELECT COUNT(*)::int FROM attendance_corrections WHERE status='PENDING') pc`, [asOf]);
  return {
    asOf, isToday: asOf === today, totalEmployees: r?.total ?? 0, presentToday: r?.present ?? 0, absentToday: r?.absent ?? 0,
    onLeaveToday: r?.onleave ?? 0, lateToday: r?.late ?? 0, missingPunchToday: r?.missing ?? 0,
    pendingLeaves: r?.pl ?? 0, pendingCorrections: r?.pc ?? 0,
  };
}

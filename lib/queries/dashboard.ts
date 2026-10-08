import { q1 } from "@/lib/db";
import { todayStr } from "@/lib/utils/date";

export async function getHrDashboardStats() {
  const today = todayStr();
  const has = await q1<{ c: number }>(`SELECT COUNT(*)::int c FROM attendance WHERE date = ?`, [today]);
  // Biometric files are usually uploaded after the fact: fall back to the latest imported day.
  let asOf = today;
  if (!has || has.c === 0) {
    const last = await q1<{ d: string | null }>(`SELECT max(date) d FROM attendance WHERE date <= ?`, [today]);
    if (last?.d) asOf = last.d;
  }
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
    asOf, isToday: asOf === today, totalEmployees: r!.total, presentToday: r!.present, absentToday: r!.absent,
    onLeaveToday: r!.onleave, lateToday: r!.late, missingPunchToday: r!.missing,
    pendingLeaves: r!.pl, pendingCorrections: r!.pc,
  };
}

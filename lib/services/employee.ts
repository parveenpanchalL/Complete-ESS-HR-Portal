import { q, q1, run, tx } from "@/lib/db";
import { newId } from "@/lib/utils/ids";
import { daysBetween, todayStr, currentTimeStr, hoursBetween } from "@/lib/utils/date";
import { audit } from "./hr";

type R = { error: string } | { ok: true; message: string };
const fail = (error: string): R => ({ error });
const validDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + "T00:00:00Z"));

export async function requestCorrection(
  userId: string, date: string, inTime: string, outTime: string, reason: string, attachment?: string | null
): Promise<R> {
  if (!validDate(date) || !/^\d{2}:\d{2}$/.test(inTime) || !/^\d{2}:\d{2}$/.test(outTime) || !reason.trim())
    return fail("Date, in/out times and a reason are required.");
  if (date > todayStr()) return fail("You cannot request a correction for a future date.");
  if (outTime <= inTime) return fail("Out time must be after in time.");
  if (reason.length > 500) return fail("Reason is too long (500 characters max).");

  if (await q1(`SELECT 1 FROM attendance_corrections WHERE employee_db_id = ? AND date = ? AND status = 'PENDING'`, [userId, date]))
    return fail("A pending correction already exists for this date.");

  const cur = await q1<{ id: string; in_time: string | null; out_time: string | null; status: string }>(
    `SELECT id, in_time, out_time, status FROM attendance WHERE employee_db_id = ? AND date = ?`, [userId, date]);
  const id = newId("corr");
  await tx(async (t) => {
    await t.run(
      `INSERT INTO attendance_corrections (id, employee_db_id, attendance_id, date, previous_in_time, previous_out_time, previous_status,
         requested_in_time, requested_out_time, reason, attachment) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [id, userId, cur?.id ?? null, date, cur?.in_time ?? null, cur?.out_time ?? null, cur?.status ?? "NO_RECORD", inTime, outTime, reason.trim(), attachment ?? null]
    );
    await audit(t, userId, "REQUEST_CORRECTION", "attendance_correction", id, undefined, { date, inTime, outTime, reason });
  });
  return { ok: true, message: "Correction request submitted." };
}

/** Working days in range = excluding Sundays and company holidays. */
export async function countLeaveDays(from: string, to: string): Promise<number> {
  const hols = new Set((await q<{ date: string }>(`SELECT date FROM holidays WHERE date >= ? AND date <= ?`, [from, to])).map((h) => h.date));
  return daysBetween(from, to).filter((d) => new Date(d + "T00:00:00Z").getUTCDay() !== 0 && !hols.has(d)).length;
}

export async function applyLeave(
  userId: string, leaveTypeId: string, from: string, to: string, reason: string, half: boolean, attachment?: string | null
): Promise<R> {
  if (!leaveTypeId || !validDate(from) || !validDate(to) || !reason.trim()) return fail("All fields are required.");
  if (to < from) return fail("To date cannot be before from date.");
  if (reason.length > 500) return fail("Reason is too long (500 characters max).");
  if (daysBetween(from, to).length > 90) return fail("Leave range is too long.");

  let days = await countLeaveDays(from, to);
  if (days === 0) return fail("The selected dates are all weekly offs or holidays.");
  if (half) {
    if (from !== to) return fail("Half-day leave must be for a single date.");
    days = 0.5;
  }

  return tx(async (t) => {
    const [bal] = await t.q<{ allocated: number; used: number }>(
      `SELECT allocated, used FROM leave_balances WHERE employee_db_id = ? AND leave_type_id = ? FOR UPDATE`, [userId, leaveTypeId]);
    if (!bal) return fail("You have no balance for this leave type.");

    const [pending] = await t.q<{ d: number }>(
      `SELECT COALESCE(SUM(days),0) d FROM leave_requests WHERE employee_db_id = ? AND leave_type_id = ? AND status = 'PENDING'`, [userId, leaveTypeId]);
    const available = bal.allocated - bal.used - Number(pending.d);
    if (available < days) return fail(`Insufficient balance: ${available.toFixed(1)} day(s) available (after pending requests).`);

    const [overlap] = await t.q(
      `SELECT 1 FROM leave_requests WHERE employee_db_id = ? AND status IN ('PENDING','APPROVED') AND from_date <= ? AND to_date >= ?`, [userId, to, from]);
    if (overlap) return fail("You already have a leave request overlapping these dates.");

    const id = newId("lv");
    await t.run(`INSERT INTO leave_requests (id, employee_db_id, leave_type_id, from_date, to_date, days, reason, attachment) VALUES (?,?,?,?,?,?,?,?)`,
      [id, userId, leaveTypeId, from, to, days, reason.trim(), attachment ?? null]);
    await audit(t, userId, "APPLY_LEAVE", "leave_request", id, undefined, { from, to, days });
    return { ok: true, message: `Leave request submitted (${days} working day${days === 1 ? "" : "s"}).` } as R;
  });
}

export async function cancelLeave(userId: string, id: string) {
  await run(
    `UPDATE leave_requests SET status = 'CANCELLED', updated_at = now_txt() WHERE id = ? AND employee_db_id = ? AND status = 'PENDING'`, [id, userId]);
}

export async function markAllRead(userId: string) {
  await run(`UPDATE notifications SET read_status = true WHERE employee_db_id = ?`, [userId]);
}

export async function punchIn(userId: string): Promise<R> {
  const today = todayStr();
  const nowTime = currentTimeStr();
  const emp = await q1<{ employee_id: string }>(`SELECT employee_id FROM employees WHERE id = ?`, [userId]);
  if (!emp) return fail("Employee not found.");

  const cur = await q1<{ id: string; in_time: string | null; out_time: string | null; status: string }>(
    `SELECT id, in_time, out_time, status FROM attendance WHERE employee_db_id = ? AND date = ?`, [userId, today]);

  if (cur?.in_time) {
    return fail(`Already clocked in today at ${cur.in_time}.`);
  }

  const status = nowTime > "09:30" ? "LATE" : "PRESENT";
  const id = cur?.id ?? newId("att");

  await tx(async (t) => {
    if (cur) {
      await t.run(
        `UPDATE attendance SET in_time = ?, status = ?, source = 'web', updated_at = now_txt() WHERE id = ?`,
        [nowTime, status, cur.id]
      );
    } else {
      await t.run(
        `INSERT INTO attendance (id, employee_db_id, employee_id, date, in_time, status, source) VALUES (?,?,?,?,?,'web')`,
        [id, userId, emp.employee_id, today, nowTime, status]
      );
    }
    await audit(t, userId, "PUNCH_IN", "attendance", id, undefined, { date: today, inTime: nowTime, status });
  });

  return { ok: true, message: `Clocked in at ${nowTime} (${status === "LATE" ? "Late" : "On time"}).` };
}

export async function punchOut(userId: string): Promise<R> {
  const today = todayStr();
  const nowTime = currentTimeStr();

  const cur = await q1<{ id: string; in_time: string | null; out_time: string | null; status: string }>(
    `SELECT id, in_time, out_time, status FROM attendance WHERE employee_db_id = ? AND date = ?`, [userId, today]);

  if (!cur || !cur.in_time) {
    return fail("You have not clocked in today yet.");
  }
  if (cur.out_time) {
    return fail(`Already clocked out today at ${cur.out_time}.`);
  }

  const hours = hoursBetween(cur.in_time, nowTime) || 0;
  const status = hours < 4.5 ? "HALF_DAY" : cur.status === "LATE" ? "LATE" : "PRESENT";

  await tx(async (t) => {
    await t.run(
      `UPDATE attendance SET out_time = ?, working_hours = ?, status = ?, source = 'web', updated_at = now_txt() WHERE id = ?`,
      [nowTime, hours, status, cur.id]
    );
    await audit(t, userId, "PUNCH_OUT", "attendance", cur.id, { inTime: cur.in_time, status: cur.status }, { outTime: nowTime, workingHours: hours, status });
  });

  return { ok: true, message: `Clocked out at ${nowTime} (${hours} hrs recorded).` };
}

export async function updateProfile(
  userId: string,
  phone?: string,
  location?: string
): Promise<R> {
  const p = (phone ?? "").trim();
  const loc = (location ?? "").trim();
  if (p.length > 25) return fail("Phone number is too long (25 characters max).");
  if (loc.length > 100) return fail("Location is too long (100 characters max).");

  const cur = await q1<{ phone: string | null; location: string | null }>(
    `SELECT phone, location FROM employees WHERE id = ?`, [userId]
  );
  if (!cur) return fail("Employee not found.");

  await tx(async (t) => {
    await t.run(
      `UPDATE employees SET phone = ?, location = ?, updated_at = now_txt() WHERE id = ?`,
      [p || null, loc || null, userId]
    );
    await audit(t, userId, "UPDATE_PROFILE", "employee", userId, cur, { phone: p, location: loc });
  });

  return { ok: true, message: "Profile updated successfully." };
}


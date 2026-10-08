import { randomBytes } from "crypto";
import { q, q1, run, tx, type Tx } from "@/lib/db";
import { hashPassword } from "@/lib/auth/session";
import { newId } from "@/lib/utils/ids";
import { daysBetween, hoursBetween } from "@/lib/utils/date";
import type { ValidatedRow } from "@/lib/attendance/validate";

type R = { error: string } | { ok: true; message?: string };
const fail = (error: string): R => ({ error });

export async function audit(
  t: Pick<Tx, "run"> | null, actorId: string, action: string, entityType: string, entityId: string,
  prev?: unknown, next?: unknown
) {
  const args = [newId("audit"), actorId, action, entityType, entityId,
    prev === undefined ? null : JSON.stringify(prev), next === undefined ? null : JSON.stringify(next)];
  const sqlText = `INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, previous_data, new_data) VALUES (?,?,?,?,?,?,?)`;
  if (t) await t.run(sqlText, args as never[]); else await run(sqlText, args as never[]);
}

export async function notify(t: Pick<Tx, "run"> | null, employeeDbId: string, title: string, message: string) {
  const s = `INSERT INTO notifications (id, employee_db_id, title, message) VALUES (?,?,?,?)`;
  const a = [newId("notif"), employeeDbId, title, message];
  if (t) await t.run(s, a); else await run(s, a);
}

export function randomPassword() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(12);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

// ---------------- Employees ----------------
export type EmployeeInput = {
  employeeId: string; name: string; email: string; department: string; designation: string;
  joiningDate: string; phone?: string; location?: string; password?: string;
};

export async function createEmployee(actorId: string, i: EmployeeInput): Promise<R & { tempPassword?: string }> {
  const employeeId = i.employeeId.trim().toUpperCase();
  const email = i.email.trim().toLowerCase();
  if (!employeeId || !i.name.trim() || !email || !i.department.trim() || !i.designation.trim() || !i.joiningDate)
    return fail("Please fill in all required fields.");
  if (!/^[A-Z0-9_-]{2,20}$/.test(employeeId)) return fail("Employee ID may contain letters, digits, - and _ only.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("Enter a valid email address.");
  if (i.password && i.password.length < 8) return fail("Initial password must be at least 8 characters.");

  if (await q1(`SELECT 1 FROM employees WHERE employee_id = ?`, [employeeId])) return fail(`Employee ID ${employeeId} already exists.`);
  if (await q1(`SELECT 1 FROM employees WHERE lower(email) = ?`, [email])) return fail(`Email ${email} is already in use.`);

  const tempPassword = i.password || randomPassword();
  const hash = await hashPassword(tempPassword);
  const id = newId("emp");
  await tx(async (t) => {
    await t.run(
      `INSERT INTO employees (id, employee_id, name, email, password_hash, must_change_password, role, department, designation, joining_date, phone, location)
       VALUES (?,?,?,?,?,true,'EMPLOYEE',?,?,?,?,?)`,
      [id, employeeId, i.name.trim(), email, hash, i.department.trim(), i.designation.trim(), i.joiningDate, i.phone?.trim() || null, i.location?.trim() || null]
    );
    await t.run(
      `INSERT INTO leave_balances (id, employee_db_id, leave_type_id, allocated, used, remaining)
       SELECT 'lb_' || md5(random()::text || lt.id), ?, lt.id, lt.default_allocation, 0, lt.default_allocation FROM leave_types lt`,
      [id]
    );
    await audit(t, actorId, "CREATE_EMPLOYEE", "employee", id, undefined, { employeeId, name: i.name, email, department: i.department });
  });
  return { ok: true, tempPassword };
}

export async function updateEmployee(
  actorId: string, dbId: string,
  f: { name: string; email: string; department: string; designation: string; phone?: string; location?: string; status: "ACTIVE" | "INACTIVE" }
): Promise<R> {
  const email = f.email.trim().toLowerCase();
  if (!f.name.trim() || !email || !f.department.trim() || !f.designation.trim()) return fail("Please fill in all required fields.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("Enter a valid email address.");
  if (f.status !== "ACTIVE" && f.status !== "INACTIVE") return fail("Invalid status.");
  if (dbId === actorId && f.status === "INACTIVE") return fail("You cannot deactivate your own account.");

  const cur = await q1<Record<string, unknown>>(`SELECT name, email, department, designation, phone, location, status FROM employees WHERE id = ?`, [dbId]);
  if (!cur) return fail("Employee not found.");
  if (await q1(`SELECT 1 FROM employees WHERE lower(email) = ? AND id <> ?`, [email, dbId])) return fail("That email is already in use.");

  await tx(async (t) => {
    await t.run(
      `UPDATE employees SET name=?, email=?, department=?, designation=?, phone=?, location=?, status=?, updated_at=now_txt() WHERE id=?`,
      [f.name.trim(), email, f.department.trim(), f.designation.trim(), f.phone?.trim() || null, f.location?.trim() || null, f.status, dbId]
    );
    await audit(t, actorId, "UPDATE_EMPLOYEE", "employee", dbId, cur, { ...f, email });
  });
  return { ok: true };
}

export async function setEmployeeStatus(actorId: string, dbId: string, status: "ACTIVE" | "INACTIVE"): Promise<R> {
  if (dbId === actorId && status === "INACTIVE") return fail("You cannot deactivate your own account.");
  const cur = await q1<{ status: string }>(`SELECT status FROM employees WHERE id = ?`, [dbId]);
  if (!cur) return fail("Employee not found.");
  await tx(async (t) => {
    await t.run(`UPDATE employees SET status = ?, updated_at = now_txt() WHERE id = ?`, [status, dbId]);
    await audit(t, actorId, status === "INACTIVE" ? "DEACTIVATE_EMPLOYEE" : "ACTIVATE_EMPLOYEE", "employee", dbId, { status: cur.status }, { status });
  });
  return { ok: true };
}

export async function resetEmployeePassword(actorId: string, dbId: string): Promise<R & { tempPassword?: string }> {
  const e = await q1(`SELECT 1 FROM employees WHERE id = ?`, [dbId]);
  if (!e) return fail("Employee not found.");
  const tempPassword = randomPassword();
  const hash = await hashPassword(tempPassword);
  await tx(async (t) => {
    await t.run(`UPDATE employees SET password_hash = ?, must_change_password = true, updated_at = now_txt() WHERE id = ?`, [hash, dbId]);
    await t.run(`DELETE FROM login_attempts WHERE identifier IN (SELECT lower(email) FROM employees WHERE id = ? UNION SELECT lower(employee_id) FROM employees WHERE id = ?)`, [dbId, dbId]);
    await audit(t, actorId, "RESET_PASSWORD", "employee", dbId);
  });
  return { ok: true, tempPassword };
}

// ---------------- Leave ----------------
export async function approveLeave(actorId: string, leaveId: string): Promise<R> {
  return tx(async (t) => {
    const [l] = await t.q<{
      id: string; employee_db_id: string; leave_type_id: string; from_date: string; to_date: string; days: number; status: string;
    }>(`SELECT * FROM leave_requests WHERE id = ? FOR UPDATE`, [leaveId]);
    if (!l) return fail("Leave request not found.");
    if (l.status !== "PENDING") return fail("This request has already been processed.");

    const [b] = await t.q<{ id: string; allocated: number; used: number }>(
      `SELECT id, allocated, used FROM leave_balances WHERE employee_db_id = ? AND leave_type_id = ? FOR UPDATE`,
      [l.employee_db_id, l.leave_type_id]
    );
    if (!b) return fail("No leave balance exists for this employee and leave type.");
    if (b.allocated - b.used < l.days) return fail(`Insufficient balance (${(b.allocated - b.used).toFixed(1)} days left). Adjust the balance first.`);

    await t.run(`UPDATE leave_requests SET status='APPROVED', approved_by_id=?, updated_at=now_txt() WHERE id=?`, [actorId, leaveId]);
    await t.run(`UPDATE leave_balances SET used = used + ?, remaining = allocated - (used + ?) WHERE id = ?`, [l.days, l.days, b.id]);

    const hols = new Set((await t.q<{ date: string }>(`SELECT date FROM holidays WHERE date >= ? AND date <= ?`, [l.from_date, l.to_date])).map((h) => h.date));
    const [emp] = await t.q<{ employee_id: string }>(`SELECT employee_id FROM employees WHERE id = ?`, [l.employee_db_id]);
    const status = l.days === 0.5 ? "HALF_DAY" : "LEAVE";
    for (const d of daysBetween(l.from_date, l.to_date)) {
      if (new Date(d + "T00:00:00Z").getUTCDay() === 0 || hols.has(d)) continue; // Sunday / holiday stays as is
      await t.run(
        `INSERT INTO attendance (id, employee_db_id, employee_id, date, status, source) VALUES (?,?,?,?,?,'leave')
         ON CONFLICT (employee_db_id, date) DO UPDATE SET status = EXCLUDED.status, in_time = NULL, out_time = NULL,
           working_hours = NULL, source = 'leave', updated_at = now_txt()`,
        [newId("att"), l.employee_db_id, emp.employee_id, d, status]
      );
    }
    await audit(t, actorId, "APPROVE_LEAVE", "leave_request", leaveId, { status: "PENDING" }, { status: "APPROVED", days: l.days });
    await notify(t, l.employee_db_id, "Leave Approved", `Your leave request from ${l.from_date} to ${l.to_date} has been approved.`);
    return { ok: true } as R;
  });
}

export async function rejectLeave(actorId: string, leaveId: string): Promise<R> {
  return tx(async (t) => {
    const [l] = await t.q<{ employee_db_id: string; from_date: string; to_date: string; status: string }>(
      `SELECT employee_db_id, from_date, to_date, status FROM leave_requests WHERE id = ? FOR UPDATE`, [leaveId]);
    if (!l) return fail("Leave request not found.");
    if (l.status !== "PENDING") return fail("This request has already been processed.");
    await t.run(`UPDATE leave_requests SET status='REJECTED', approved_by_id=?, updated_at=now_txt() WHERE id=?`, [actorId, leaveId]);
    await audit(t, actorId, "REJECT_LEAVE", "leave_request", leaveId, { status: "PENDING" }, { status: "REJECTED" });
    await notify(t, l.employee_db_id, "Leave Rejected", `Your leave request from ${l.from_date} to ${l.to_date} was rejected.`);
    return { ok: true } as R;
  });
}

export async function updateLeaveBalance(actorId: string, balanceId: string, allocated: number): Promise<R> {
  if (!Number.isFinite(allocated) || allocated < 0 || allocated > 365) return fail("Allocated days must be between 0 and 365.");
  const cur = await q1<{ allocated: number; used: number }>(`SELECT allocated, used FROM leave_balances WHERE id = ?`, [balanceId]);
  if (!cur) return fail("Balance not found.");
  await tx(async (t) => {
    await t.run(`UPDATE leave_balances SET allocated = ?, remaining = ? - used WHERE id = ?`, [allocated, allocated, balanceId]);
    await audit(t, actorId, "UPDATE_LEAVE_BALANCE", "leave_balance", balanceId, { allocated: cur.allocated }, { allocated });
  });
  return { ok: true };
}

// ---------------- Attendance corrections ----------------
export async function approveCorrection(actorId: string, id: string): Promise<R> {
  return tx(async (t) => {
    const [c] = await t.q<{
      employee_db_id: string; date: string; requested_in_time: string; requested_out_time: string; status: string;
    }>(`SELECT * FROM attendance_corrections WHERE id = ? FOR UPDATE`, [id]);
    if (!c) return fail("Correction not found.");
    if (c.status !== "PENDING") return fail("This request has already been processed.");

    const [cur] = await t.q<{ in_time: string | null; out_time: string | null; status: string }>(
      `SELECT in_time, out_time, status FROM attendance WHERE employee_db_id = ? AND date = ?`, [c.employee_db_id, c.date]);
    const [emp] = await t.q<{ employee_id: string }>(`SELECT employee_id FROM employees WHERE id = ?`, [c.employee_db_id]);
    const hours = hoursBetween(c.requested_in_time, c.requested_out_time);

    await t.run(
      `INSERT INTO attendance (id, employee_db_id, employee_id, date, in_time, out_time, working_hours, status, source)
       VALUES (?,?,?,?,?,?,?, 'PRESENT', 'correction')
       ON CONFLICT (employee_db_id, date) DO UPDATE SET in_time = EXCLUDED.in_time, out_time = EXCLUDED.out_time,
         working_hours = EXCLUDED.working_hours, status = 'PRESENT', source = 'correction', updated_at = now_txt()`,
      [newId("att"), c.employee_db_id, emp.employee_id, c.date, c.requested_in_time, c.requested_out_time, hours]
    );
    await t.run(`UPDATE attendance_corrections SET status='APPROVED', approved_by_id=?, updated_at=now_txt() WHERE id=?`, [actorId, id]);
    await audit(t, actorId, "APPROVE_CORRECTION", "attendance_correction", id,
      { in: cur?.in_time ?? null, out: cur?.out_time ?? null, status: cur?.status ?? "NO_RECORD" },
      { in: c.requested_in_time, out: c.requested_out_time, status: "PRESENT" });
    await notify(t, c.employee_db_id, "Attendance Correction Approved", `Your attendance correction for ${c.date} has been approved.`);
    return { ok: true } as R;
  });
}

export async function rejectCorrection(actorId: string, id: string): Promise<R> {
  return tx(async (t) => {
    const [c] = await t.q<{ employee_db_id: string; date: string; status: string }>(
      `SELECT employee_db_id, date, status FROM attendance_corrections WHERE id = ? FOR UPDATE`, [id]);
    if (!c) return fail("Correction not found.");
    if (c.status !== "PENDING") return fail("This request has already been processed.");
    await t.run(`UPDATE attendance_corrections SET status='REJECTED', approved_by_id=?, updated_at=now_txt() WHERE id=?`, [actorId, id]);
    await audit(t, actorId, "REJECT_CORRECTION", "attendance_correction", id, { status: "PENDING" }, { status: "REJECTED" });
    await notify(t, c.employee_db_id, "Attendance Correction Rejected", `Your attendance correction for ${c.date} was rejected.`);
    return { ok: true } as R;
  });
}

// ---------------- Holidays ----------------
export async function addHoliday(actorId: string, name: string, date: string, type: string, location?: string): Promise<R> {
  if (!name.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail("Holiday name and a valid date are required.");
  const id = newId("hol");
  await tx(async (t) => {
    await t.run(`INSERT INTO holidays (id, name, date, type, location) VALUES (?,?,?,?,?)`, [id, name.trim(), date, type || "National", location?.trim() || null]);
    // Pre-populate HOLIDAY rows into attendance for all active employees who don't already have a record
    await t.run(
      `INSERT INTO attendance (id, employee_db_id, employee_id, date, status, source)
       SELECT 'att_' || md5(random()::text || e.id), e.id, e.employee_id, ?, 'HOLIDAY', 'holiday'
       FROM employees e
       WHERE e.status = 'ACTIVE'
       ON CONFLICT (employee_db_id, date) DO NOTHING`,
      [date]
    );
    await audit(t, actorId, "ADD_HOLIDAY", "holiday", id, undefined, { name, date, type });
  });
  return { ok: true };
}
export async function deleteHoliday(actorId: string, id: string): Promise<R> {
  const h = await q1<{ date: string }>(`SELECT date FROM holidays WHERE id = ?`, [id]);
  await tx(async (t) => {
    await t.run(`DELETE FROM holidays WHERE id = ?`, [id]);
    if (h) {
      await t.run(`DELETE FROM attendance WHERE date = ? AND status = 'HOLIDAY' AND source = 'holiday'`, [h.date]);
    }
    await audit(t, actorId, "DELETE_HOLIDAY", "holiday", id);
  });
  return { ok: true };
}

// ---------------- Payslips ----------------
const PAYSLIP_EXT = /\.(pdf|png|jpe?g)$/i;
export const MAX_PAYSLIP_BYTES = 2 * 1024 * 1024;

export async function savePayslip(actorId: string, employeeDbId: string, month: number, year: number, fileName: string, data: Buffer): Promise<R> {
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 2000 || year > 2100) return fail("Invalid month or year.");
  if (!PAYSLIP_EXT.test(fileName)) return fail(`${fileName}: only PDF, PNG or JPG files are allowed.`);
  if (data.length === 0 || data.length > MAX_PAYSLIP_BYTES) return fail(`${fileName}: file must be between 1 byte and 2 MB.`);
  if (!(await q1(`SELECT 1 FROM employees WHERE id = ?`, [employeeDbId]))) return fail("Employee not found.");
  await tx(async (t) => {
    await t.run(
      `INSERT INTO payslips (id, employee_db_id, month, year, file_name, file_data) VALUES (?,?,?,?,?,?)
       ON CONFLICT (employee_db_id, month, year) DO UPDATE SET file_name = EXCLUDED.file_name, file_data = EXCLUDED.file_data, uploaded_at = now_txt()`,
      [newId("pay"), employeeDbId, month, year, fileName, data.toString("base64")]
    );
    await notify(t, employeeDbId, "Payslip Available", `Your payslip for ${month}/${year} is available.`);
    await audit(t, actorId, "UPLOAD_PAYSLIP", "payslip", employeeDbId, undefined, { month, year, fileName });
  });
  return { ok: true };
}

// ---------------- Notifications ----------------
export async function sendAnnouncement(actorId: string, title: string, message: string, target: string): Promise<R & { count?: number }> {
  if (!title.trim() || !message.trim()) return fail("Please enter a title and message.");
  const params = target === "all" ? [] : [target];
  const rows = await q<{ id: string }>(
    `SELECT id FROM employees WHERE status = 'ACTIVE'${target === "all" ? "" : " AND department = ?"}`, params);
  if (rows.length === 0) return fail("No active employees match this audience.");
  await tx(async (t) => {
    await t.run(
      `INSERT INTO notifications (id, employee_db_id, title, message)
       SELECT 'notif_' || md5(random()::text || e.id), e.id, ?, ? FROM employees e WHERE e.status = 'ACTIVE'${target === "all" ? "" : " AND e.department = ?"}`,
      [title.trim(), message.trim(), ...params]
    );
    await audit(t, actorId, "SEND_NOTIFICATION", "notification", target, undefined, { title, recipients: rows.length });
  });
  return { ok: true, count: rows.length };
}

// ---------------- Attendance import ----------------
export async function importAttendance(actorId: string, fileName: string, rows: ValidatedRow[]) {
  const valid = rows.filter((r) => r.errors.length === 0 && r.employeeDbId);
  const CHUNK = 400;
  let written = 0;
  const missingByEmp = new Map<string, string[]>();

  await tx(async (t) => {
    for (let i = 0; i < valid.length; i += CHUNK) {
      const chunk = valid.slice(i, i + CHUNK);
      const params: (string | number | null)[] = [];
      const tuples = chunk.map((r) => {
        params.push(newId("att"), r.employeeDbId!, r.employeeId, r.date, r.inTime || null, r.outTime || null, r.workingHours ?? null, r.status);
        return "(?,?,?,?,?,?,?,?,'upload')";
      });
      // Approved corrections/leave (source <> 'upload') are never overwritten by a biometric import.
      const res = await t.q<{ id: string }>(
        `INSERT INTO attendance (id, employee_db_id, employee_id, date, in_time, out_time, working_hours, status, source)
         VALUES ${tuples.join(",")}
         ON CONFLICT (employee_db_id, date) DO UPDATE SET in_time = EXCLUDED.in_time, out_time = EXCLUDED.out_time,
           working_hours = EXCLUDED.working_hours, status = EXCLUDED.status, updated_at = now_txt()
           WHERE attendance.source = 'upload'
         RETURNING id`, params);
      written += res.length;
    }
    for (const r of valid) {
      if (r.status === "MISSING_PUNCH") {
        const l = missingByEmp.get(r.employeeDbId!) ?? [];
        l.push(r.date);
        missingByEmp.set(r.employeeDbId!, l);
      }
    }
    for (const [emp, dates] of Array.from(missingByEmp.entries())) {
      await notify(t, emp, "Missing Punch", `Missing punch recorded on ${dates.slice(0, 5).join(", ")}${dates.length > 5 ? ` (+${dates.length - 5} more)` : ""}. You can request a correction from the Attendance page.`);
    }
    const protectedCount = valid.length - written;
    const failed = rows.length - valid.length;
    await t.run(
      `INSERT INTO attendance_imports (id, file_name, uploaded_by_id, total_records, success_records, failed_records) VALUES (?,?,?,?,?,?)`,
      [newId("imp"), fileName, actorId, rows.length, written, failed + protectedCount]
    );
    await audit(t, actorId, "IMPORT_ATTENDANCE", "attendance_import", fileName, undefined,
      { total: rows.length, written, failed, protectedCount });
  });
  const protectedCount = valid.length - written;
  return { total: rows.length, success: written, failed: rows.length - valid.length, protectedCount };
}

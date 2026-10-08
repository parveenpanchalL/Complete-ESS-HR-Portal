"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireHr } from "@/lib/auth/session";
import * as hr from "@/lib/services/hr";
import { q1 } from "@/lib/db";

export type FormState = { error?: string; success?: string } | null;
const s = (fd: FormData, k: string) => String(fd.get(k) ?? "");

export async function createEmployeeAction(_p: FormState, fd: FormData): Promise<FormState> {
  const me = await requireHr();
  const r = await hr.createEmployee(me.dbId, {
    employeeId: s(fd, "employeeId"), name: s(fd, "name"), email: s(fd, "email"), department: s(fd, "department"),
    designation: s(fd, "designation"), joiningDate: s(fd, "joiningDate"), phone: s(fd, "phone"), location: s(fd, "location"),
    password: s(fd, "password") || undefined,
  });
  if ("error" in r) return { error: r.error };
  revalidatePath("/admin/employees");
  return { success: `Employee created. Temporary password: ${r.tempPassword} (they must change it at first login). Copy it now — it is not shown again.` };
}
export async function updateEmployeeAction(_p: FormState, fd: FormData): Promise<FormState> {
  const me = await requireHr();
  const r = await hr.updateEmployee(me.dbId, s(fd, "dbId"), {
    name: s(fd, "name"), email: s(fd, "email"), department: s(fd, "department"), designation: s(fd, "designation"),
    phone: s(fd, "phone"), location: s(fd, "location"), status: s(fd, "status") as "ACTIVE" | "INACTIVE",
  });
  if ("error" in r) return { error: r.error };
  revalidatePath("/admin/employees");
  redirect("/admin/employees");
}
export async function toggleEmployeeStatusAction(dbId: string, current: string) {
  const me = await requireHr();
  await hr.setEmployeeStatus(me.dbId, dbId, current === "ACTIVE" ? "INACTIVE" : "ACTIVE");
  revalidatePath("/admin/employees");
}
export async function resetPasswordAction(dbId: string, _p: FormState, _fd: FormData): Promise<FormState> {
  const me = await requireHr();
  const r = await hr.resetEmployeePassword(me.dbId, dbId);
  if ("error" in r) return { error: r.error };
  return { success: `Temporary password: ${r.tempPassword} — copy it now. The employee must change it at next login.` };
}

export async function approveLeaveAction(id: string) { const me = await requireHr(); await hr.approveLeave(me.dbId, id); revalidatePath("/admin/leaves"); }
export async function rejectLeaveAction(id: string) { const me = await requireHr(); await hr.rejectLeave(me.dbId, id); revalidatePath("/admin/leaves"); }
export async function approveCorrectionAction(id: string) { const me = await requireHr(); await hr.approveCorrection(me.dbId, id); revalidatePath("/admin/corrections"); }
export async function rejectCorrectionAction(id: string) { const me = await requireHr(); await hr.rejectCorrection(me.dbId, id); revalidatePath("/admin/corrections"); }

export async function updateLeaveBalanceAction(fd: FormData) {
  const me = await requireHr();
  await hr.updateLeaveBalance(me.dbId, s(fd, "balanceId"), Number(fd.get("allocated")));
  revalidatePath("/admin/leave-balances");
}
export async function addHolidayAction(fd: FormData) {
  const me = await requireHr();
  await hr.addHoliday(me.dbId, s(fd, "name"), s(fd, "date"), s(fd, "type"), s(fd, "location"));
  revalidatePath("/admin/holidays");
}
export async function deleteHolidayAction(id: string) { const me = await requireHr(); await hr.deleteHoliday(me.dbId, id); revalidatePath("/admin/holidays"); }

export async function sendNotificationAction(_p: FormState, fd: FormData): Promise<FormState> {
  const me = await requireHr();
  const r = await hr.sendAnnouncement(me.dbId, s(fd, "title"), s(fd, "message"), s(fd, "target") || "all");
  if ("error" in r) return { error: r.error };
  revalidatePath("/admin/notifications");
  return { success: `Sent to ${r.count} employee(s).` };
}

export async function uploadSinglePayslipAction(_p: FormState, fd: FormData): Promise<FormState> {
  const me = await requireHr();
  const file = fd.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Please choose a file." };
  const r = await hr.savePayslip(me.dbId, s(fd, "employeeDbId"), Number(fd.get("month")), Number(fd.get("year")), file.name, Buffer.from(await file.arrayBuffer()));
  if ("error" in r) return { error: r.error };
  revalidatePath("/admin/payslips");
  return { success: "Payslip uploaded and employee notified." };
}
export async function bulkUploadPayslipsAction(_p: FormState, fd: FormData): Promise<FormState> {
  const me = await requireHr();
  const month = Number(fd.get("month")), year = Number(fd.get("year"));
  const files = (fd.getAll("files") as File[]).filter((f) => f.size > 0);
  if (files.length === 0) return { error: "Please choose at least one file." };
  let ok = 0; const problems: string[] = [];
  for (const f of files) {
    const code = f.name.match(/^([A-Za-z0-9_-]+?)(?:[ _.-]|$)/)?.[1]?.toUpperCase();
    const emp = code ? await q1<{ id: string }>(`SELECT id FROM employees WHERE employee_id = ?`, [code]) : undefined;
    if (!emp) { problems.push(`${f.name}: no employee matches this file name`); continue; }
    const r = await hr.savePayslip(me.dbId, emp.id, month, year, f.name, Buffer.from(await f.arrayBuffer()));
    if ("error" in r) problems.push(r.error); else ok++;
  }
  revalidatePath("/admin/payslips");
  if (problems.length) return { error: `${ok} uploaded. ${problems.length} problem(s): ${problems.slice(0, 5).join("; ")}${problems.length > 5 ? "…" : ""}` };
  return { success: `${ok} payslip(s) uploaded.` };
}

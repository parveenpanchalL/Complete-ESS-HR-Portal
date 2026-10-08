"use server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import * as emp from "@/lib/services/employee";

export type FormState = { error?: string; success?: string } | null;
const s = (fd: FormData, k: string) => String(fd.get(k) ?? "");

async function parseAttachment(file: File | null): Promise<string | null> {
  if (!file || file.size === 0) return null;
  if (file.size > 2 * 1024 * 1024) throw new Error("File must be 2MB or less.");
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (!["pdf", "png", "jpg", "jpeg"].includes(ext)) {
    throw new Error("Only PDF, PNG, or JPG files are allowed.");
  }
  const buf = Buffer.from(await file.arrayBuffer());
  return JSON.stringify({
    name: file.name,
    type: file.type || "application/octet-stream",
    data: buf.toString("base64"),
  });
}

export async function requestCorrectionAction(_p: FormState, fd: FormData): Promise<FormState> {
  const me = await getSession();
  if (!me) return { error: "Not signed in." };
  let attachment: string | null = null;
  try {
    attachment = await parseAttachment(fd.get("attachment") as File | null);
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "File upload error" };
  }
  const r = await emp.requestCorrection(me.dbId, s(fd, "date"), s(fd, "inTime"), s(fd, "outTime"), s(fd, "reason"), attachment);
  revalidatePath("/attendance");
  return "error" in r ? { error: r.error } : { success: r.message };
}

export async function applyLeaveAction(_p: FormState, fd: FormData): Promise<FormState> {
  const me = await getSession();
  if (!me) return { error: "Not signed in." };
  let attachment: string | null = null;
  try {
    attachment = await parseAttachment(fd.get("attachment") as File | null);
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "File upload error" };
  }
  const r = await emp.applyLeave(me.dbId, s(fd, "leaveTypeId"), s(fd, "fromDate"), s(fd, "toDate"), s(fd, "reason"), fd.get("halfDay") === "on", attachment);
  revalidatePath("/leave");
  return "error" in r ? { error: r.error } : { success: r.message };
}

export async function cancelLeaveAction(id: string) {
  const me = await getSession();
  if (!me) return;
  await emp.cancelLeave(me.dbId, id);
  revalidatePath("/leave");
}
export async function markNotificationsReadAction() {
  const me = await getSession();
  if (!me) return;
  await emp.markAllRead(me.dbId);
  revalidatePath("/notifications");
}

export async function punchInAction(): Promise<FormState> {
  const me = await getSession();
  if (!me) return { error: "Not signed in." };
  const r = await emp.punchIn(me.dbId);
  revalidatePath("/dashboard");
  revalidatePath("/attendance");
  return "error" in r ? { error: r.error } : { success: r.message };
}

export async function punchOutAction(): Promise<FormState> {
  const me = await getSession();
  if (!me) return { error: "Not signed in." };
  const r = await emp.punchOut(me.dbId);
  revalidatePath("/dashboard");
  revalidatePath("/attendance");
  return "error" in r ? { error: r.error } : { success: r.message };
}

export async function updateProfileAction(_p: FormState, fd: FormData): Promise<FormState> {
  const me = await getSession();
  if (!me) return { error: "Not signed in." };
  const r = await emp.updateProfile(me.dbId, s(fd, "phone"), s(fd, "location"));
  revalidatePath("/profile");
  return "error" in r ? { error: r.error } : { success: r.message };
}


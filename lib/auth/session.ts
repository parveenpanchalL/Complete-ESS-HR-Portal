import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { q1 } from "@/lib/db";
import { COOKIE_NAME, signToken, verifyToken } from "./token";

export type SessionUser = {
  dbId: string;
  employeeId: string;
  name: string;
  email: string;
  role: "EMPLOYEE" | "HR";
  mustChangePassword: boolean;
};

export const hashPassword = (pw: string) => bcrypt.hash(pw, 10);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

export async function setSessionCookie(userId: string, role: "EMPLOYEE" | "HR") {
  const token = await signToken({ sub: userId, role });
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export function clearSessionCookie() {
  cookies().delete(COOKIE_NAME);
}

/** Verifies the cookie AND re-checks the user in the DB (so deactivation/role changes apply immediately). */
export async function getSession(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  const t = await verifyToken(token);
  if (!t) return null;
  const u = await q1<{
    id: string; employee_id: string; name: string; email: string; role: "EMPLOYEE" | "HR";
    status: string; must_change_password: boolean;
  }>(`SELECT id, employee_id, name, email, role, status, must_change_password FROM employees WHERE id = ?`, [t.sub]);
  if (!u || u.status !== "ACTIVE") return null;
  return {
    dbId: u.id, employeeId: u.employee_id, name: u.name, email: u.email,
    role: u.role, mustChangePassword: u.must_change_password,
  };
}

export async function requireHr(): Promise<SessionUser> {
  const s = await getSession();
  if (!s || s.role !== "HR") throw new Error("Not authorized");
  return s;
}

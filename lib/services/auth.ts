import { q, q1, run } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/session";
import { newId } from "@/lib/utils/ids";

const MAX_FAILS = 5;
const WINDOW_MIN = 15;

export type AuthResult =
  | { ok: true; user: { id: string; role: "EMPLOYEE" | "HR"; mustChangePassword: boolean } }
  | { ok: false; error: string };

export async function authenticate(identifierRaw: string, password: string, needRole?: "HR"): Promise<AuthResult> {
  const identifier = identifierRaw.trim().toLowerCase();
  if (!identifier || !password) return { ok: false, error: "Please enter your ID/email and password." };

  const fails = await q1<{ c: number }>(
    `SELECT COUNT(*)::int c FROM login_attempts WHERE identifier = ? AND at > now() - interval '${WINDOW_MIN} minutes'`,
    [identifier]
  );
  if ((fails?.c ?? 0) >= MAX_FAILS) {
    return { ok: false, error: `Too many failed attempts. Try again in ${WINDOW_MIN} minutes or contact HR.` };
  }

  const u = await q1<{
    id: string; password_hash: string; role: "EMPLOYEE" | "HR"; status: string; must_change_password: boolean;
  }>(
    `SELECT id, password_hash, role, status, must_change_password FROM employees
     WHERE lower(email) = ? OR lower(employee_id) = ? OR (role = 'HR' AND lower(name) = ?)`,
    [identifier, identifier, identifier]
  );

  // Always run a bcrypt compare so timing doesn't reveal whether the account exists.
  const hash = u?.password_hash ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvali";
  const valid = await verifyPassword(password, hash);

  if (!u || !valid || (needRole === "HR" && u.role !== "HR")) {
    await run(`INSERT INTO login_attempts (identifier) VALUES (?)`, [identifier]);
    return { ok: false, error: "Invalid credentials." };
  }
  if (u.status !== "ACTIVE") return { ok: false, error: "This account has been deactivated. Contact HR." };

  await run(`DELETE FROM login_attempts WHERE identifier = ?`, [identifier]);
  return { ok: true, user: { id: u.id, role: u.role, mustChangePassword: u.must_change_password } };
}

export async function changePassword(userId: string, current: string, next: string): Promise<string | null> {
  if (next.length < 8) return "New password must be at least 8 characters.";
  if (next === current) return "New password must be different from the current one.";
  const u = await q1<{ password_hash: string }>(`SELECT password_hash FROM employees WHERE id = ?`, [userId]);
  if (!u || !(await verifyPassword(current, u.password_hash))) return "Current password is incorrect.";
  await run(
    `UPDATE employees SET password_hash = ?, must_change_password = false, updated_at = now_txt() WHERE id = ?`,
    [await hashPassword(next), userId]
  );
  await run(
    `INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id) VALUES (?,?,?,?,?)`,
    [newId("audit"), userId, "CHANGE_PASSWORD", "employee", userId]
  );
  return null;
}

export { q };

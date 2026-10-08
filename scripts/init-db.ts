/* Creates/updates the schema and bootstraps the first HR admin.
 * Usage: npm run db:init   (needs DATABASE_URL; ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME for the first admin) */
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { q1, run, sql } from "../lib/db";

async function main() {
  await sql.unsafe(fs.readFileSync(path.join(process.cwd(), "db", "schema.sql"), "utf8"));
  console.log("✓ Schema is up to date");

  for (const [code, name, alloc] of [["CL", "Casual Leave", 12], ["SL", "Sick Leave", 10], ["EL", "Earned Leave", 15]] as const) {
    await run(`INSERT INTO leave_types (id, code, name, default_allocation) VALUES (?,?,?,?) ON CONFLICT (code) DO NOTHING`,
      [`lt_${code.toLowerCase()}`, code, name, alloc]);
  }
  console.log("✓ Default leave types present (CL, SL, EL)");

  const hasHr = await q1<{ c: number }>(`SELECT COUNT(*)::int c FROM employees WHERE role = 'HR'`);
  if (hasHr && hasHr.c > 0) { console.log("✓ An HR admin already exists — nothing to bootstrap"); return; }

  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  if (!email || password.length < 10) {
    console.error("✗ No HR admin exists. Set ADMIN_EMAIL and ADMIN_PASSWORD (10+ chars) and run again.");
    process.exitCode = 1;
    return;
  }
  const id = "emp_" + randomBytes(12).toString("hex");
  await run(
    `INSERT INTO employees (id, employee_id, name, email, password_hash, must_change_password, role, department, designation, joining_date, status)
     VALUES (?,?,?,?,?,true,'HR','HR','HR Administrator', to_char(now(),'YYYY-MM-DD'),'ACTIVE')`,
    [id, (process.env.ADMIN_EMPLOYEE_ID || "HR001").toUpperCase(), process.env.ADMIN_NAME || "HR Admin", email, await bcrypt.hash(password, 10)]);
  console.log(`✓ Created HR admin ${email} (you will be asked to change the password at first login)`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => sql.end());

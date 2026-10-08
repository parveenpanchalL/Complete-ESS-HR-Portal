/* DEMO DATA ONLY. Wipes ALL data and inserts sample employees.
 * Run `npm run db:init` first (creates the schema). Usage: CONFIRM_DEMO_SEED=yes npm run db:seed-demo */
import bcrypt from "bcryptjs";
import { q, run, sql, tx } from "../lib/db";
import { newId } from "../lib/utils/ids";
import { todayStr } from "../lib/utils/date";

const DEPTS = ["Engineering", "Sales", "HR", "Finance", "Operations", "Marketing"];
const DESIG: Record<string, string[]> = {
  Engineering: ["Software Engineer", "Senior Software Engineer", "QA Engineer"], Sales: ["Sales Executive", "Account Manager"],
  HR: ["HR Executive", "Talent Acquisition Specialist"], Finance: ["Accountant", "Finance Analyst"],
  Operations: ["Operations Executive", "Operations Manager"], Marketing: ["Marketing Executive", "Content Strategist"],
};
const FIRST = ["Aarav", "Vivaan", "Aditi", "Priya", "Rohan", "Ishaan", "Ananya", "Diya", "Kabir", "Meera", "Arjun", "Sanya", "Karan", "Neha", "Vikram", "Pooja", "Rahul", "Simran", "Aman", "Tanvi"];
const LAST = ["Sharma", "Verma", "Gupta", "Iyer", "Nair", "Patel", "Reddy", "Singh", "Kapoor", "Mehta", "Joshi", "Rao"];
const pad = (n: number) => String(n).padStart(2, "0");
const fmt = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

async function main() {
  if (process.env.CONFIRM_DEMO_SEED !== "yes") { console.error("Refusing to run: this deletes ALL data. Set CONFIRM_DEMO_SEED=yes to proceed."); process.exitCode = 1; return; }
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED_IN_PROD !== "yes") { console.error("Refusing to seed demo data with NODE_ENV=production."); process.exitCode = 1; return; }

  // Schema must already exist (run `npm run db:init` first).
  for (const t of ["notifications", "attendance_corrections", "payslips", "leave_requests", "leave_balances",
                    "attendance", "attendance_imports", "audit_logs", "holidays", "leave_types", "login_attempts", "employees"]) {
    await run(`DELETE FROM ${t}`);
  }

  const hash = await bcrypt.hash("Demo@12345", 10);
  const hrId = newId("emp");
  await run(`INSERT INTO employees (id, employee_id, name, email, password_hash, role, department, designation, joining_date, phone, location)
             VALUES (?,?,?,?,?,'HR','HR','HR Manager','2021-03-01','+91 98765 43210','Bengaluru')`, [hrId, "HR001", "Anita Desai", "hr@company.com", hash]);

  const lt: Record<string, string> = {};
  for (const [code, name, alloc] of [["CL", "Casual Leave", 12], ["SL", "Sick Leave", 10], ["EL", "Earned Leave", 15]] as const) {
    lt[code] = newId("lt");
    await run(`INSERT INTO leave_types (id, code, name, default_allocation) VALUES (?,?,?,?)`, [lt[code], code, name, alloc]);
  }

  const emps: { id: string; code: string }[] = [];
  for (let i = 0; i < 24; i++) {
    const dept = DEPTS[i % DEPTS.length];
    const id = newId("emp"), code = `EMP${String(i + 1).padStart(3, "0")}`;
    emps.push({ id, code });
    await run(`INSERT INTO employees (id, employee_id, name, email, password_hash, role, department, designation, joining_date, phone, manager_id, location)
               VALUES (?,?,?,?,?,'EMPLOYEE',?,?,?,?,?,?)`,
      [id, code, `${FIRST[i % FIRST.length]} ${LAST[i % LAST.length]}`, `${FIRST[i % FIRST.length].toLowerCase()}.${LAST[i % LAST.length].toLowerCase()}${i}@company.com`, hash,
       dept, DESIG[dept][i % DESIG[dept].length], `202${1 + (i % 4)}-0${1 + (i % 9)}-10`, `+91 98${String(10000000 + i * 1373).slice(0, 8)}`, hrId, ["Mumbai", "Bengaluru", "Pune"][i % 3]]);
    for (const [c, a] of [["CL", 12], ["SL", 10], ["EL", 15]] as const) {
      const used = Math.min(a, (i * (c === "CL" ? 1 : c === "SL" ? 0.5 : 2)) % 6);
      await run(`INSERT INTO leave_balances (id, employee_db_id, leave_type_id, allocated, used, remaining) VALUES (?,?,?,?,?,?)`,
        [newId("lb"), id, lt[c], a, used, a - used]);
    }
  }

  const today = new Date(todayStr() + "T00:00:00Z");
  const holidays = [[-12, "Founders Day"], [9, "Gandhi Jayanti"]] as const;
  const holSet = new Map<string, string>();
  for (const [off, name] of holidays) {
    const d = new Date(today); d.setUTCDate(d.getUTCDate() + off);
    holSet.set(fmt(d), name);
    await run(`INSERT INTO holidays (id, name, date, type) VALUES (?,?,?,'National')`, [newId("hol"), name, fmt(d)]);
  }

  await tx(async (t) => {
    for (const e of emps) {
      for (let off = 45; off >= 1; off--) { // up to yesterday: today is left empty, like a not-yet-imported biometric file
        const d = new Date(today); d.setUTCDate(d.getUTCDate() - off);
        const ds = fmt(d);
        const r = (e.code.charCodeAt(4) * 31 + d.getUTCDate() * 7 + d.getUTCMonth() * 3) % 100;
        let status = "PRESENT", inT: string | null = null, outT: string | null = null, hrs: number | null = null;
        if (holSet.has(ds)) status = "HOLIDAY";
        else if (d.getUTCDay() === 0) status = "WEEKLY_OFF";
        else if (r < 4) status = "ABSENT";
        else if (r < 8) status = "LEAVE";
        else if (r < 14) { status = "LATE"; inT = "09:45"; outT = "18:10"; hrs = 8.42; }
        else if (r < 17) { status = "HALF_DAY"; inT = "09:10"; outT = "13:30"; hrs = 4.33; }
        else if (r < 19) { status = "MISSING_PUNCH"; inT = "09:08"; }
        else { inT = `09:${pad(r % 20)}`; outT = `18:${pad(r % 30)}`; hrs = Math.round(((18 * 60 + (r % 30)) - (9 * 60 + (r % 20))) / 60 * 100) / 100; }
        await t.run(`INSERT INTO attendance (id, employee_db_id, employee_id, date, in_time, out_time, working_hours, status) VALUES (?,?,?,?,?,?,?,?)`,
          [newId("att"), e.id, e.code, ds, inT, outT, hrs, status]);
      }
    }
  });

  const plus = (n: number) => { const d = new Date(today); d.setUTCDate(d.getUTCDate() + n); return fmt(d); };
  emps.slice(0, 5).forEach((e, i) => run(`INSERT INTO leave_requests (id, employee_db_id, leave_type_id, from_date, to_date, days, reason) VALUES (?,?,?,?,?,?,?)`,
    [newId("lv"), e.id, lt[["CL", "SL", "EL"][i % 3]], plus(3 + i), plus(3 + i), 1, i % 2 ? "Not feeling well" : "Personal work"]));
  await Promise.all([]);
  for (const [i, e] of emps.slice(5, 8).entries()) {
    await run(`INSERT INTO attendance_corrections (id, employee_db_id, date, previous_status, requested_in_time, requested_out_time, reason)
               VALUES (?,?,?,'MISSING_PUNCH','09:10','18:05','Biometric device was not working')`, [newId("corr"), e.id, plus(-(i + 2))]);
  }
  for (const e of emps) await run(`INSERT INTO notifications (id, employee_db_id, title, message) VALUES (?,?,?,?)`,
    [newId("notif"), e.id, "Welcome", "Welcome to the ESS HR portal."]);

  console.log("Demo data ready. Demo password for everyone: Demo@12345");
  console.log("HR: hr@company.com   Employee: EMP001");
  console.log(`(${(await q<{ c: number }>(`SELECT COUNT(*)::int c FROM attendance`))[0].c} attendance rows)`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => sql.end());

import { q } from "@/lib/db";
import { currentMonth } from "@/lib/utils/date";
import { getMonthlySummary } from "@/lib/queries/reports";

const STATUSES = ["PRESENT", "ABSENT", "LEAVE", "HOLIDAY", "WEEKLY_OFF", "HALF_DAY", "LATE", "MISSING_PUNCH"];
const REQ_STATUSES = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"];

const input = "border border-gray-300 rounded px-3 py-1.5 text-sm";
const label = "block text-xs font-medium text-gray-600 mb-1";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { month?: string; department?: string };
}) {
  const month = searchParams.month || currentMonth();
  const department = searchParams.department || "";
  const departments = (await q<{ d: string }>(`SELECT DISTINCT department d FROM employees ORDER BY d`)).map((r) => r.d);
  const leaveTypes = (await q<{ code: string }>(`SELECT code FROM leave_types ORDER BY code`)).map((r) => r.code);
  const summary = await getMonthlySummary(month, department);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Reports</h1>
        <p className="text-xs text-gray-500">Generate and export attendance and leave data</p>
      </div>

      {/* Attendance report */}
      <form action="/api/reports/attendance" method="get" className="border border-gray-200 rounded-md bg-white p-4">
        <p className="text-sm font-medium text-gray-900 mb-3">Attendance Report</p>
        <div className="flex flex-wrap gap-3 items-end">
          <div><label className={label}>Employee ID</label><input name="employeeId" placeholder="EMP001" className={input} /></div>
          <div><label className={label}>Department</label>
            <select name="department" className={input}><option value="">All</option>{departments.map((d) => <option key={d}>{d}</option>)}</select></div>
          <div><label className={label}>From</label><input type="date" name="from" className={input} /></div>
          <div><label className={label}>To</label><input type="date" name="to" className={input} /></div>
          <div><label className={label}>Status</label>
            <select name="status" className={input}><option value="">All</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div className="flex gap-2">
            <button type="submit" name="format" value="csv" className="bg-gray-900 text-white text-sm rounded px-3 py-1.5 hover:bg-gray-800">Export CSV</button>
            <button type="submit" name="format" value="xlsx" className="border border-gray-300 bg-white text-gray-800 text-sm rounded px-3 py-1.5 hover:bg-gray-50">Export Excel (.xlsx)</button>
          </div>
        </div>
      </form>

      {/* Leave report */}
      <form action="/api/reports/leave" method="get" className="border border-gray-200 rounded-md bg-white p-4">
        <p className="text-sm font-medium text-gray-900 mb-3">Leave Report</p>
        <div className="flex flex-wrap gap-3 items-end">
          <div><label className={label}>Employee ID</label><input name="employeeId" placeholder="EMP001" className={input} /></div>
          <div><label className={label}>Department</label>
            <select name="department" className={input}><option value="">All</option>{departments.map((d) => <option key={d}>{d}</option>)}</select></div>
          <div><label className={label}>Leave Type</label>
            <select name="leaveType" className={input}><option value="">All</option>{leaveTypes.map((t) => <option key={t}>{t}</option>)}</select></div>
          <div><label className={label}>From</label><input type="date" name="from" className={input} /></div>
          <div><label className={label}>To</label><input type="date" name="to" className={input} /></div>
          <div><label className={label}>Status</label>
            <select name="status" className={input}><option value="">All</option>{REQ_STATUSES.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div className="flex gap-2">
            <button type="submit" name="format" value="csv" className="bg-gray-900 text-white text-sm rounded px-3 py-1.5 hover:bg-gray-800">Export CSV</button>
            <button type="submit" name="format" value="xlsx" className="border border-gray-300 bg-white text-gray-800 text-sm rounded px-3 py-1.5 hover:bg-gray-50">Export Excel (.xlsx)</button>
          </div>
        </div>
      </form>

      {/* Monthly summary */}
      <div className="border border-gray-200 rounded-md bg-white p-4 space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className="text-sm font-medium text-gray-900">Monthly Summary</p>
          <form method="get" className="flex flex-wrap gap-2 items-end">
            <input type="month" name="month" defaultValue={month} className={input} />
            <select name="department" defaultValue={department} className={input}>
              <option value="">All departments</option>
              {departments.map((d) => <option key={d}>{d}</option>)}
            </select>
            <button className="border border-gray-300 rounded px-3 py-1.5 text-sm hover:bg-gray-50">View</button>
            <a
              href={`/api/reports/summary?month=${month}&department=${encodeURIComponent(department)}`}
              className="bg-gray-900 text-white text-sm rounded px-3 py-1.5 hover:bg-gray-800"
            >
              Export CSV
            </a>
            <a
              href={`/api/reports/summary?month=${month}&department=${encodeURIComponent(department)}&format=xlsx`}
              className="border border-gray-300 bg-white text-gray-800 text-sm rounded px-3 py-1.5 hover:bg-gray-50"
            >
              Export Excel (.xlsx)
            </a>
          </form>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                <th className="px-3 py-2 font-medium">Employee</th>
                <th className="px-3 py-2 font-medium">Dept</th>
                <th className="px-3 py-2 font-medium">Present</th>
                <th className="px-3 py-2 font-medium">Absent</th>
                <th className="px-3 py-2 font-medium">Leave</th>
                <th className="px-3 py-2 font-medium">Weekly Off</th>
                <th className="px-3 py-2 font-medium">Holiday</th>
                <th className="px-3 py-2 font-medium">Attendance %</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((r) => (
                <tr key={r.employee_id} className="border-b border-gray-100 last:border-0">
                  <td className="px-3 py-2 text-gray-900">{r.name} <span className="text-xs text-gray-400">{r.employee_id}</span></td>
                  <td className="px-3 py-2 text-gray-600">{r.department}</td>
                  <td className="px-3 py-2">{r.present}</td>
                  <td className="px-3 py-2">{r.absent}</td>
                  <td className="px-3 py-2">{r.leave}</td>
                  <td className="px-3 py-2">{r.weeklyOff}</td>
                  <td className="px-3 py-2">{r.holiday}</td>
                  <td className="px-3 py-2 font-medium">{r.pct}%</td>
                </tr>
              ))}
              {summary.length === 0 && (
                <tr><td colSpan={8} className="px-3 py-6 text-center text-gray-400">No attendance data for this month.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

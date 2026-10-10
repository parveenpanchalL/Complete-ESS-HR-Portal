import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { q } from "@/lib/db";
import { currentMonth, todayStr } from "@/lib/utils/date";
import { Badge } from "@/components/ui/badge";
import { CorrectionForm } from "@/components/employee/forms";
import { getMonthAttendance, getAvailableMonths, fmtHours } from "@/lib/queries/employee";
import {
  ATTENDANCE_STATUS_LABEL, ATTENDANCE_STATUS_COLOR, ATTENDANCE_DOT_COLOR, REQUEST_STATUS_COLOR,
} from "@/lib/status";

export const dynamic = "force-dynamic";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default async function AttendancePage({ searchParams }: { searchParams: { month?: string; day?: string } }) {
  const s = await getSession();
  if (!s) redirect("/login");
  const month = searchParams.month && /^\d{4}-\d{2}$/.test(searchParams.month) ? searchParams.month : currentMonth();

  const [available, monthData, corrections, holidayRows] = await Promise.all([
    getAvailableMonths(s.dbId, currentMonth()),
    getMonthAttendance(s.dbId, month),
    q<{ id: string; date: string; requested_in_time: string; requested_out_time: string; status: string; attachment: string | null }>(
      `SELECT id, date, requested_in_time, requested_out_time, status, attachment FROM attendance_corrections WHERE employee_db_id = ? ORDER BY created_at DESC LIMIT 10`, [s.dbId]),
    q<{ date: string; name: string }>(`SELECT date, name FROM holidays WHERE date >= ? AND date <= ?`, [`${month}-01`, `${month}-31`]),
  ]);

  const { rows, counts, pct } = monthData;
  const byDate = new Map(rows.map((r) => [r.date, r]));
  const hols = new Map(holidayRows.map((h) => [h.date, h.name]));

  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const firstDow = new Date(y, m - 1, 1).getDay();
  const selected = searchParams.day ? byDate.get(searchParams.day) : undefined;
  const today = todayStr();
  const selectedHoliday = searchParams.day ? hols.get(searchParams.day) : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-gray-900">Attendance — {MONTHS[m - 1]} {y}</h1>
        <form method="get">
          <select name="month" defaultValue={month} className="border border-gray-300 rounded px-3 py-1.5 text-sm">
            {available.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <button className="ml-2 border border-gray-300 rounded px-3 py-1.5 text-sm hover:bg-gray-50">View</button>
        </form>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
        {[
          ["Attendance", `${pct}%`], ["Present", counts.present + counts.late], ["Absent", counts.absent], ["Leave", counts.leave],
          ["Working Hours", fmtHours(counts.hours)], ["Late Days", counts.late], ["Missing Punches", counts.missing], ["Half Days", counts.half],
        ].map(([k, v]) => (
          <div key={String(k)} className="border border-gray-200 rounded bg-white p-3">
            <p className="text-xs text-gray-500">{k}</p><p className="font-semibold text-gray-900">{v}</p>
          </div>
        ))}
      </div>

      <div id="calendar" className="border border-gray-200 rounded-md bg-white p-4">
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-1">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
            const date = `${month}-${String(d).padStart(2, "0")}`;
            const stored = byDate.get(date);
            const derived = !stored && date <= today ? (hols.has(date) ? { status: "HOLIDAY" } : new Date(date + "T00:00:00Z").getUTCDay() === 0 ? { status: "WEEKLY_OFF" } : undefined) : undefined;
            const r = stored ?? derived;
            return (
              <Link key={d} href={`/attendance?month=${month}&day=${date}#calendar`}
                className={`border rounded p-1.5 min-h-[52px] text-xs hover:border-gray-400 ${searchParams.day === date ? "border-gray-900" : "border-gray-200"}`}>
                <span className="text-gray-700">{d}</span>
                {r && (
                  <span className="flex items-center gap-1 mt-1">
                    <span className={`status-dot ${ATTENDANCE_DOT_COLOR[r.status]}`} />
                    <span className="hidden sm:inline text-[10px] text-gray-500">{ATTENDANCE_STATUS_LABEL[r.status]}</span>
                  </span>
                )}
              </Link>
            );
          })}
        </div>
        {searchParams.day && (
          <div className="mt-3 border-t border-gray-200 pt-3 text-sm text-gray-800">
            <p className="font-medium">{searchParams.day}</p>
            {selected ? (
              <p className="text-xs text-gray-600 mt-1">
                Status: {ATTENDANCE_STATUS_LABEL[selected.status]} · In: {selected.in_time || "—"} · Out: {selected.out_time || "—"} · Hours: {fmtHours(selected.working_hours)}
              </p>
            ) : selectedHoliday ? <p className="text-xs text-gray-600 mt-1">Holiday: {selectedHoliday}</p>
              : <p className="text-xs text-gray-500 mt-1">No record for this date.</p>}
          </div>
        )}
      </div>

      <div className="border border-gray-200 rounded-md bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-200 text-left text-xs text-gray-500">
            <th className="px-3 py-2 font-medium">Date</th><th className="px-3 py-2 font-medium">In</th>
            <th className="px-3 py-2 font-medium">Out</th><th className="px-3 py-2 font-medium">Hours</th><th className="px-3 py-2 font-medium">Status</th>
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-gray-100 last:border-0">
                <td className="px-3 py-2">{r.date}</td><td className="px-3 py-2">{r.in_time || "—"}</td>
                <td className="px-3 py-2">{r.out_time || "—"}</td><td className="px-3 py-2">{fmtHours(r.working_hours)}</td>
                <td className="px-3 py-2"><Badge className={ATTENDANCE_STATUS_COLOR[r.status]}>{ATTENDANCE_STATUS_LABEL[r.status]}</Badge></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400">No records for this month.</td></tr>}
          </tbody>
        </table>
      </div>

      <CorrectionForm />

      {corrections.length > 0 && (
        <div className="border border-gray-200 rounded-md bg-white divide-y divide-gray-100">
          {corrections.map((c) => (
            <div key={c.id} className="p-3 flex items-center justify-between text-sm">
              <span className="text-gray-700">{c.date} · {c.requested_in_time}–{c.requested_out_time}</span>
              <div className="flex items-center gap-3">
                {c.attachment && (
                  <a href={`/api/attachments/download?type=correction&id=${c.id}`} target="_blank" className="text-xs text-blue-600 underline">
                    Doc
                  </a>
                )}
                <Badge className={REQUEST_STATUS_COLOR[c.status]}>{c.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

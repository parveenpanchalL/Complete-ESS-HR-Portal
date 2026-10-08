import { getSession } from "@/lib/auth/session";
import { q } from "@/lib/db";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default async function PayslipsPage() {
  const s = (await getSession())!;
  const rows = await q<{ id: string; month: number; year: number }>(
    `SELECT id, month, year FROM payslips WHERE employee_db_id = ? ORDER BY year DESC, month DESC`, [s.dbId]);
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-gray-900">Payslips</h1>
      <div className="border border-gray-200 rounded-md bg-white divide-y divide-gray-100">
        {rows.map((r) => (
          <div key={r.id} className="p-3 flex items-center justify-between">
            <span className="text-sm text-gray-900">{MONTHS[r.month - 1]} {r.year}</span>
            <a href={`/api/payslips/download?id=${r.id}`} className="text-xs border border-gray-300 rounded px-3 py-1.5 hover:bg-gray-50">Download</a>
          </div>
        ))}
        {rows.length === 0 && <p className="p-6 text-center text-sm text-gray-400">No payslips available.</p>}
      </div>
    </div>
  );
}

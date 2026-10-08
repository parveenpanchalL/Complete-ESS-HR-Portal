import { q } from "@/lib/db";
import { SinglePayslipForm, BulkPayslipForm } from "./payslip-forms";

export default async function PayslipsPage() {
  const emps = (await q<{ id: string; name: string; employee_id: string }>(
    `SELECT id, name, employee_id FROM employees WHERE status = 'ACTIVE' ORDER BY employee_id`
  )).map((e) => ({ id: e.id, label: `${e.employee_id} — ${e.name}` }));

  const recent = await q<any>(`SELECT p.id, p.month, p.year, p.file_name, p.uploaded_at, e.name as employee_name, e.employee_id as employee_code
       FROM payslips p
       JOIN employees e ON e.id = p.employee_db_id
       ORDER BY p.uploaded_at DESC
       LIMIT 30`, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Payslips</h1>
        <p className="text-xs text-gray-500">Upload payslips for individual or multiple employees</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SinglePayslipForm employees={emps} />
        <BulkPayslipForm />
      </div>

      <div>
        <h2 className="text-sm font-medium text-gray-900 mb-2">Recent Uploads</h2>
        <div className="border border-gray-200 rounded-md bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                <th className="px-3 py-2 font-medium">Employee</th>
                <th className="px-3 py-2 font-medium">Month/Year</th>
                <th className="px-3 py-2 font-medium">File</th>
                <th className="px-3 py-2 font-medium">Uploaded At</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-3 py-2 text-gray-900">
                    {r.employee_name} <span className="text-xs text-gray-400">({r.employee_code})</span>
                  </td>
                  <td className="px-3 py-2 text-gray-600">{r.month}/{r.year}</td>
                  <td className="px-3 py-2 text-gray-600">{r.file_name}</td>
                  <td className="px-3 py-2 text-gray-500 text-xs">{r.uploaded_at}</td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-gray-400 text-sm">
                    No payslips uploaded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

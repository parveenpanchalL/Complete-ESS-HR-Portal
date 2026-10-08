import { q } from "@/lib/db";

export default async function ImportHistoryPage() {
  const rows = await q<any>(`SELECT ai.id, ai.file_name, ai.total_records, ai.success_records, ai.failed_records, ai.created_at, e.name as uploaded_by
       FROM attendance_imports ai
       JOIN employees e ON e.id = ai.uploaded_by_id
       ORDER BY ai.created_at DESC`, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Import History</h1>
        <p className="text-xs text-gray-500">Record of all attendance file uploads</p>
      </div>

      <div className="border border-gray-200 rounded-md bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
              <th className="px-3 py-2 font-medium">File Name</th>
              <th className="px-3 py-2 font-medium">Uploaded By</th>
              <th className="px-3 py-2 font-medium">Date/Time</th>
              <th className="px-3 py-2 font-medium">Total</th>
              <th className="px-3 py-2 font-medium">Success</th>
              <th className="px-3 py-2 font-medium">Failed</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-gray-100 last:border-0">
                <td className="px-3 py-2 text-gray-900">{r.file_name}</td>
                <td className="px-3 py-2 text-gray-600">{r.uploaded_by}</td>
                <td className="px-3 py-2 text-gray-600">{r.created_at}</td>
                <td className="px-3 py-2 text-gray-600">{r.total_records}</td>
                <td className="px-3 py-2 text-green-700">{r.success_records}</td>
                <td className="px-3 py-2 text-red-700">{r.failed_records}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-gray-400 text-sm">
                  No imports yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

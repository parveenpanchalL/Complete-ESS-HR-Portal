import { q } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { REQUEST_STATUS_COLOR } from "@/lib/status";
import { approveLeaveAction, rejectLeaveAction } from "@/lib/actions/hr";

export default async function LeaveRequestsPage() {
  const rows = await q<any>(`SELECT lr.*, e.name as employee_name, e.employee_id as employee_code, lt.name as leave_type_name, lt.code as leave_type_code
       FROM leave_requests lr
       JOIN employees e ON e.id = lr.employee_db_id
       JOIN leave_types lt ON lt.id = lr.leave_type_id
       ORDER BY lr.status = 'PENDING' DESC, lr.created_at DESC`, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Leave Requests</h1>
        <p className="text-xs text-gray-500">Review and approve or reject employee leave applications</p>
      </div>

      <div className="border border-gray-200 rounded-md bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
              <th className="px-3 py-2 font-medium">Employee</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">From</th>
              <th className="px-3 py-2 font-medium">To</th>
              <th className="px-3 py-2 font-medium">Days</th>
              <th className="px-3 py-2 font-medium">Reason</th>
              <th className="px-3 py-2 font-medium">Doc</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-gray-100 last:border-0 align-top">
                <td className="px-3 py-2">
                  <p className="text-gray-900 font-medium">{r.employee_name}</p>
                  <p className="text-xs text-gray-500">{r.employee_code}</p>
                </td>
                <td className="px-3 py-2 text-gray-600">{r.leave_type_code}</td>
                <td className="px-3 py-2 text-gray-600">{r.from_date}</td>
                <td className="px-3 py-2 text-gray-600">{r.to_date}</td>
                <td className="px-3 py-2 text-gray-600">{r.days}</td>
                <td className="px-3 py-2 text-gray-600 text-xs max-w-[220px]">{r.reason}</td>
                <td className="px-3 py-2">
                  {r.attachment ? (
                    <a
                      href={`/api/attachments/download?type=leave&id=${r.id}`}
                      target="_blank"
                      className="text-xs text-blue-600 underline hover:text-blue-800"
                    >
                      View Doc
                    </a>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <Badge className={REQUEST_STATUS_COLOR[r.status]}>{r.status}</Badge>
                </td>
                <td className="px-3 py-2">
                  {r.status === "PENDING" ? (
                    <div className="flex gap-2">
                      <form action={approveLeaveAction.bind(null, r.id)}>
                        <button className="text-xs border border-green-300 text-green-700 rounded px-2 py-1 hover:bg-green-50">
                          Approve
                        </button>
                      </form>
                      <form action={rejectLeaveAction.bind(null, r.id)}>
                        <button className="text-xs border border-red-300 text-red-700 rounded px-2 py-1 hover:bg-red-50">
                          Reject
                        </button>
                      </form>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-gray-400 text-sm">
                  No leave requests.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

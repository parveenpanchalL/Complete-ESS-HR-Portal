import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { q } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { LeaveForm } from "@/components/employee/forms";
import { REQUEST_STATUS_COLOR } from "@/lib/status";
import { cancelLeaveAction } from "@/lib/actions/employee";
import { getLeaveBalances } from "@/lib/queries/employee";

export const dynamic = "force-dynamic";

export default async function LeavePage() {
  const s = await getSession();
  if (!s) redirect("/login");
  const types = await q<{ id: string; code: string; name: string }>(`SELECT id, code, name FROM leave_types ORDER BY code`);
  const balances = await getLeaveBalances(s.dbId);
  const reqs = await q<{ id: string; from_date: string; to_date: string; days: number; reason: string; status: string; attachment: string | null; code: string }>(
    `SELECT lr.id, lr.from_date, lr.to_date, lr.days, lr.reason, lr.status, lr.attachment, lt.code FROM leave_requests lr
     JOIN leave_types lt ON lt.id = lr.leave_type_id WHERE lr.employee_db_id = ? ORDER BY lr.created_at DESC`, [s.dbId]);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-gray-900">Leave</h1>
      <div className="grid grid-cols-3 gap-3">
        {balances.map((b) => (
          <div key={b.code} className="border border-gray-200 rounded-md bg-white p-3">
            <p className="text-xs text-gray-500">{b.code} — {b.name}</p>
            <p className="text-xl font-semibold text-gray-900">{b.remaining.toFixed(1)} <span className="text-xs text-gray-400 font-normal">of {b.allocated}</span></p>
          </div>
        ))}
      </div>
      <LeaveForm types={types.map((t) => ({ id: t.id, label: `${t.code} — ${t.name}` }))} />
      <div className="border border-gray-200 rounded-md bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-200 text-left text-xs text-gray-500">
            <th className="px-3 py-2 font-medium">Type</th><th className="px-3 py-2 font-medium">From</th><th className="px-3 py-2 font-medium">To</th>
            <th className="px-3 py-2 font-medium">Days</th><th className="px-3 py-2 font-medium">Doc</th><th className="px-3 py-2 font-medium">Status</th><th className="px-3 py-2 font-medium"></th>
          </tr></thead>
          <tbody>
            {reqs.map((r) => (
              <tr key={r.id} className="border-b border-gray-100 last:border-0">
                <td className="px-3 py-2">{r.code}</td><td className="px-3 py-2">{r.from_date}</td><td className="px-3 py-2">{r.to_date}</td>
                <td className="px-3 py-2">{r.days}</td>
                <td className="px-3 py-2">
                  {r.attachment ? (
                    <a href={`/api/attachments/download?type=leave&id=${r.id}`} target="_blank" className="text-xs text-blue-600 underline">Doc</a>
                  ) : <span className="text-xs text-gray-400">—</span>}
                </td>
                <td className="px-3 py-2"><Badge className={REQUEST_STATUS_COLOR[r.status]}>{r.status}</Badge></td>
                <td className="px-3 py-2">
                  {r.status === "PENDING" && (
                    <form action={cancelLeaveAction.bind(null, r.id)}><button className="text-xs underline text-gray-600">Cancel</button></form>
                  )}
                </td>
              </tr>
            ))}
            {reqs.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-400">No leave requests yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

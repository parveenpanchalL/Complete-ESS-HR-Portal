import { q } from "@/lib/db";

export default async function AuditPage({ searchParams }: { searchParams: { action?: string } }) {
  const action = searchParams.action || "";
  const rows = await q<{ id: string; action: string; entity_type: string; entity_id: string; previous_data: string | null; new_data: string | null; created_at: string; actor: string }>(
    `SELECT a.id, a.action, a.entity_type, a.entity_id, a.previous_data, a.new_data, a.created_at, e.name AS actor
     FROM audit_logs a JOIN employees e ON e.id = a.actor_id ${action ? "WHERE a.action = ?" : ""}
     ORDER BY a.created_at DESC LIMIT 200`, action ? [action] : []);
  const actions = (await q<{ action: string }>(`SELECT DISTINCT action FROM audit_logs ORDER BY action`)).map((r) => r.action);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Audit Log</h1>
        <p className="text-xs text-gray-500">Most recent 200 events (UTC)</p>
      </div>
      <form className="flex gap-2" method="get">
        <select name="action" defaultValue={action} className="border border-gray-300 rounded px-3 py-1.5 text-sm">
          <option value="">All actions</option>
          {actions.map((a) => <option key={a}>{a}</option>)}
        </select>
        <button className="border border-gray-300 rounded px-3 py-1.5 text-sm hover:bg-gray-50">Filter</button>
      </form>
      <div className="border border-gray-200 rounded-md bg-white overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="px-3 py-2 font-medium">When</th><th className="px-3 py-2 font-medium">Who</th><th className="px-3 py-2 font-medium">Action</th>
            <th className="px-3 py-2 font-medium">Entity</th><th className="px-3 py-2 font-medium">Before</th><th className="px-3 py-2 font-medium">After</th>
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-gray-100 last:border-0 align-top">
                <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{r.created_at}</td>
                <td className="px-3 py-2">{r.actor}</td>
                <td className="px-3 py-2 font-medium text-gray-900">{r.action}</td>
                <td className="px-3 py-2 text-gray-500">{r.entity_type}</td>
                <td className="px-3 py-2 text-gray-500 max-w-[220px] break-words">{r.previous_data || "—"}</td>
                <td className="px-3 py-2 text-gray-500 max-w-[220px] break-words">{r.new_data || "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-400">No events.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { q } from "@/lib/db";
import { markNotificationsReadAction } from "@/lib/actions/employee";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const s = await getSession();
  if (!s) redirect("/login");
  const rows = await q<{ id: string; title: string; message: string; read_status: boolean; created_at: string }>(
    `SELECT id, title, message, read_status, created_at FROM notifications WHERE employee_db_id = ? ORDER BY created_at DESC LIMIT 50`, [s.dbId]);
  const unread = rows.filter((r) => !r.read_status).length;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Notifications {unread > 0 && <span className="text-xs text-gray-500">({unread} unread)</span>}</h1>
        {unread > 0 && <form action={markNotificationsReadAction}><button className="text-xs border border-gray-300 rounded px-3 py-1.5 hover:bg-gray-50">Mark all read</button></form>}
      </div>
      <div className="border border-gray-200 rounded-md bg-white divide-y divide-gray-100">
        {rows.map((n) => (
          <div key={n.id} className={`p-3 ${n.read_status ? "" : "bg-gray-50"}`}>
            <div className="flex justify-between"><p className="text-sm font-medium text-gray-900">{n.title}</p><p className="text-xs text-gray-400">{n.created_at}</p></div>
            <p className="text-xs text-gray-600 mt-1">{n.message}</p>
          </div>
        ))}
        {rows.length === 0 && <p className="p-6 text-center text-sm text-gray-400">No notifications.</p>}
      </div>
    </div>
  );
}

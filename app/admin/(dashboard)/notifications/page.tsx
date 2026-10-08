import { q } from "@/lib/db";
import { SendNotificationForm } from "./notification-form";

export default async function NotificationsPage() {
  const departments = Array.from(
    new Set((await q<{ d: string }>(`SELECT DISTINCT department d FROM employees WHERE status = 'ACTIVE'`)).map((e) => e.d))
  ).sort();

  const recent = await q<any>(`SELECT title, message, created_at, COUNT(*)::int as recipient_count
       FROM notifications
       GROUP BY title, message, created_at
       ORDER BY created_at DESC
       LIMIT 20`, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Notifications</h1>
        <p className="text-xs text-gray-500">Send announcements to employees</p>
      </div>

      <SendNotificationForm departments={departments} />

      <div>
        <h2 className="text-sm font-medium text-gray-900 mb-2">Recent Announcements</h2>
        <div className="border border-gray-200 rounded-md bg-white divide-y divide-gray-100">
          {recent.map((n, i) => (
            <div key={i} className="p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900">{n.title}</p>
                <p className="text-xs text-gray-400">{n.created_at}</p>
              </div>
              <p className="text-xs text-gray-600 mt-1">{n.message}</p>
              <p className="text-xs text-gray-400 mt-1">{n.recipient_count} recipient(s)</p>
            </div>
          ))}
          {recent.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">No notifications sent yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

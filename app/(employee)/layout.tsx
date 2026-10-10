import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { q1 } from "@/lib/db";
import { logoutAction } from "@/lib/actions/auth";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/attendance", label: "Attendance" },
  { href: "/leave", label: "Leave" },
  { href: "/payslips", label: "Payslips" },
  { href: "/profile", label: "Profile" },
  { href: "/notifications", label: "Notifications" },
];

export const dynamic = "force-dynamic";

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.mustChangePassword) redirect("/change-password");

  const unread = (await q1<{ c: number }>(`SELECT COUNT(*)::int c FROM notifications WHERE employee_db_id = ? AND read_status = false`, [session.dbId]))?.c ?? 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900">ESS HR Portal</span>
          <div className="flex items-center gap-3">
            {session.role === "HR" && (
              <Link href="/admin/dashboard" className="text-xs text-gray-600 underline">Admin</Link>
            )}
            {true && (
              <Link href="/change-password" className="text-xs text-gray-600 underline hidden sm:inline">Password</Link>
            )}
            <span className="text-xs text-gray-500 hidden sm:inline">{session.name}</span>
            <form action={logoutAction}>
              <button className="text-xs border border-gray-300 rounded px-3 py-1.5 text-gray-600 hover:bg-gray-50">Log out</button>
            </form>
          </div>
        </div>
        <nav className="max-w-5xl mx-auto px-4 flex gap-4 overflow-x-auto">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} prefetch={false} className="py-2 text-sm text-gray-600 hover:text-gray-900 whitespace-nowrap">
              {n.label}
              {n.href === "/notifications" && unread > 0 && (
                <span className="ml-1 text-[10px] bg-gray-900 text-white rounded px-1.5 py-0.5">{unread}</span>
              )}
            </Link>
          ))}
        </nav>
      </header>
      <main className="max-w-5xl mx-auto p-4 md:p-6">{children}</main>
    </div>
  );
}

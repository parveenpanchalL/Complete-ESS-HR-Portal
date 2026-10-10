"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/employees", label: "Employees" },
  { href: "/admin/attendance/upload", label: "Upload Attendance" },
  { href: "/admin/attendance/history", label: "Import History" },
  { href: "/admin/corrections", label: "Attendance Corrections" },
  { href: "/admin/leaves", label: "Leave Requests" },
  { href: "/admin/leave-balances", label: "Leave Balances" },
  { href: "/admin/holidays", label: "Holidays" },
  { href: "/admin/payslips", label: "Payslips" },
  { href: "/admin/notifications", label: "Notifications" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/audit", label: "Audit Log" },
  { href: "/change-password", label: "Change Password" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 border-r border-gray-200 bg-white min-h-screen hidden md:block">
      <div className="px-4 py-4 border-b border-gray-200">
        <p className="text-sm font-semibold text-gray-900">HR Admin</p>
        <p className="text-xs text-gray-500">ESS HR Portal</p>
      </div>
      <nav className="py-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={`block px-4 py-2 text-sm border-l-2 ${
                active
                  ? "border-gray-900 bg-gray-50 text-gray-900 font-medium"
                  : "border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

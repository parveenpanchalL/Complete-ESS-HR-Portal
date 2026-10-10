"use client";

import Link from "next/link";
import { useState } from "react";

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

export function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="border border-gray-300 rounded px-2 py-1 text-sm"
        aria-label="Toggle navigation"
      >
        ☰
      </button>
      {open && (
        <div className="fixed inset-0 z-20 bg-black/30" onClick={() => setOpen(false)}>
          <div
            className="w-64 h-full bg-white border-r border-gray-200 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">HR Admin</p>
                <p className="text-xs text-gray-500">ESS HR Portal</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-500">✕</button>
            </div>
            <nav className="py-2">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  onClick={() => setOpen(false)}
                  className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}

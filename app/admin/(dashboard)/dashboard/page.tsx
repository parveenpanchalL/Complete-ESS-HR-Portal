import { StatCard } from "@/components/ui/stat-card";
import { getHrDashboardStats } from "@/lib/queries/dashboard";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const stats = await getHrDashboardStats();

  const quickActions = [
    { href: "/admin/attendance/upload", label: "Upload Attendance" },
    { href: "/admin/employees", label: "Manage Employees" },
    { href: "/admin/leaves", label: "Leave Requests" },
    { href: "/admin/corrections", label: "Attendance Corrections" },
    { href: "/admin/payslips", label: "Upload Payslips" },
    { href: "/admin/reports", label: "Reports" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">HR Dashboard</h1>
        <p className="text-xs text-gray-500">{stats.isToday ? `Overview for ${stats.asOf}` : `Latest attendance imported: ${stats.asOf} (nothing imported for today yet)`}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Employees" value={stats.totalEmployees} />
        <StatCard label="Present Today" value={stats.presentToday} />
        <StatCard label="Absent Today" value={stats.absentToday} />
        <StatCard label="On Leave Today" value={stats.onLeaveToday} />
        <StatCard label="Late Employees" value={stats.lateToday} />
        <StatCard label="Missing Punches" value={stats.missingPunchToday} />
        <StatCard label="Pending Leave Requests" value={stats.pendingLeaves} />
        <StatCard label="Pending Corrections" value={stats.pendingCorrections} />
      </div>

      <div>
        <h2 className="text-sm font-medium text-gray-900 mb-2">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {quickActions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="border border-gray-200 rounded-md p-3 text-sm text-gray-700 bg-white hover:border-gray-400 hover:text-gray-900"
            >
              {a.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

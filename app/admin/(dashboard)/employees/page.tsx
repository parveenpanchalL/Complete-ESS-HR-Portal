import { q } from "@/lib/db";
import { ResetPasswordButton } from "./reset-password";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { toggleEmployeeStatusAction } from "@/lib/actions/hr";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: { q?: string; dept?: string };
}) {
  const all = await q<{ id: string; employeeId: string; name: string; department: string; designation: string; email: string; status: string }>(
    `SELECT id, employee_id AS "employeeId", name, department, designation, email, status FROM employees ORDER BY employee_id`);

  const search = (searchParams.q || "").toLowerCase();
  const dept = searchParams.dept || "";

  const filtered = all.filter((e) => {
    const matchesQ =
      !search ||
      e.name.toLowerCase().includes(search) ||
      e.employeeId.toLowerCase().includes(search) ||
      e.email.toLowerCase().includes(search);
    const matchesDept = !dept || e.department === dept;
    return matchesQ && matchesDept;
  });

  const departments = Array.from(new Set(all.map((e) => e.department))).sort();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Employees</h1>
          <p className="text-xs text-gray-500">{all.length} total employees</p>
        </div>
        <Link
          href="/admin/employees/new"
          className="text-sm bg-gray-900 text-white rounded px-3 py-1.5 hover:bg-gray-800"
        >
          + Add Employee
        </Link>
      </div>

      <form className="flex flex-wrap gap-2" method="get">
        <input
          name="q"
          defaultValue={searchParams.q}
          placeholder="Search by name, ID or email"
          className="border border-gray-300 rounded px-3 py-1.5 text-sm w-64"
        />
        <select
          name="dept"
          defaultValue={searchParams.dept}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <button className="border border-gray-300 rounded px-3 py-1.5 text-sm hover:bg-gray-50">
          Filter
        </button>
      </form>

      <div className="border border-gray-200 rounded-md bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
              <th className="px-3 py-2 font-medium">Employee ID</th>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Department</th>
              <th className="px-3 py-2 font-medium">Designation</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.id} className="border-b border-gray-100 last:border-0">
                <td className="px-3 py-2 text-gray-700">{e.employeeId}</td>
                <td className="px-3 py-2 text-gray-900 font-medium">{e.name}</td>
                <td className="px-3 py-2 text-gray-600">{e.department}</td>
                <td className="px-3 py-2 text-gray-600">{e.designation}</td>
                <td className="px-3 py-2 text-gray-600">{e.email}</td>
                <td className="px-3 py-2">
                  <Badge
                    className={
                      e.status === "ACTIVE"
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-gray-100 text-gray-500 border-gray-300"
                    }
                  >
                    {e.status}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-3">
                    <Link
                      href={`/admin/employees/${e.id}/edit`}
                      className="text-xs text-gray-600 hover:text-gray-900 underline"
                    >
                      Edit
                    </Link>
                    <form
                      action={toggleEmployeeStatusAction.bind(null, e.id, e.status)}
                    >
                      <button className="text-xs text-gray-600 hover:text-gray-900 underline">
                        {e.status === "ACTIVE" ? "Deactivate" : "Activate"}
                      </button>
                    </form>
                    <ResetPasswordButton dbId={e.id} />
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-gray-400 text-sm">
                  No employees found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

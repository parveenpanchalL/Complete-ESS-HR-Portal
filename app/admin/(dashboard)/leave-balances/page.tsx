import { q } from "@/lib/db";
import { updateLeaveBalanceAction } from "@/lib/actions/hr";

export default async function LeaveBalancesPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const search = (searchParams.q || "").toLowerCase();

  const rows = await q<any>(`SELECT lb.id, lb.allocated, lb.used, lb.remaining, lt.code as leave_code, lt.name as leave_name,
              e.id as emp_db_id, e.name as employee_name, e.employee_id as employee_code, e.department
       FROM leave_balances lb
       JOIN leave_types lt ON lt.id = lb.leave_type_id
       JOIN employees e ON e.id = lb.employee_db_id
       WHERE e.status = 'ACTIVE'
       ORDER BY e.name, lt.code`, []);

  const grouped = new Map<string, any>();
  for (const r of rows) {
    if (search && !r.employee_name.toLowerCase().includes(search) && !r.employee_code.toLowerCase().includes(search)) {
      continue;
    }
    if (!grouped.has(r.emp_db_id)) {
      grouped.set(r.emp_db_id, {
        name: r.employee_name,
        code: r.employee_code,
        department: r.department,
        balances: [],
      });
    }
    grouped.get(r.emp_db_id).balances.push(r);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Leave Balances</h1>
        <p className="text-xs text-gray-500">Manage allocated leave per employee</p>
      </div>

      <form className="flex gap-2" method="get">
        <input
          name="q"
          defaultValue={searchParams.q}
          placeholder="Search employee"
          className="border border-gray-300 rounded px-3 py-1.5 text-sm w-64"
        />
        <button className="border border-gray-300 rounded px-3 py-1.5 text-sm hover:bg-gray-50">
          Search
        </button>
      </form>

      <div className="space-y-3">
        {Array.from(grouped.values()).map((emp) => (
          <div key={emp.code} className="border border-gray-200 rounded-md bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{emp.name}</p>
                <p className="text-xs text-gray-500">
                  {emp.code} · {emp.department}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {emp.balances.map((b: any) => (
                <form
                  key={b.id}
                  action={updateLeaveBalanceAction}
                  className="border border-gray-200 rounded p-3 flex items-center justify-between gap-2"
                >
                  <input type="hidden" name="balanceId" value={b.id} />
                  <div>
                    <p className="text-xs text-gray-500">{b.leave_name}</p>
                    <p className="text-xs text-gray-400">
                      Used {b.used} · Remaining {b.remaining}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      name="allocated"
                      type="number"
                      step="0.5"
                      defaultValue={b.allocated}
                      className="w-16 border border-gray-300 rounded px-2 py-1 text-xs"
                    />
                    <button className="text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50">
                      Save
                    </button>
                  </div>
                </form>
              ))}
            </div>
          </div>
        ))}
        {grouped.size === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">No employees found.</p>
        )}
      </div>
    </div>
  );
}

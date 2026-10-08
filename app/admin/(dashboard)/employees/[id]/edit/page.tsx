import { q1 } from "@/lib/db";
import { notFound } from "next/navigation";
import { EditEmployeeForm } from "./edit-employee-form";

export default async function EditEmployeePage({ params }: { params: { id: string } }) {
  const employee = await q1<{ id: string; employeeId: string; name: string; email: string; department: string; designation: string; phone: string | null; location: string | null; status: string }>(
    `SELECT id, employee_id AS "employeeId", name, email, department, designation, phone, location, status FROM employees WHERE id = ?`, [params.id]);
  if (!employee) notFound();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Edit Employee</h1>
        <p className="text-xs text-gray-500">{employee.employeeId} — {employee.name}</p>
      </div>
      <div className="border border-gray-200 rounded-md bg-white p-5">
        <EditEmployeeForm employee={employee} />
      </div>
    </div>
  );
}

import { NewEmployeeForm } from "./new-employee-form";

export default function NewEmployeePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Add Employee</h1>
        <p className="text-xs text-gray-500">Create a new employee record and login access.</p>
      </div>
      <div className="border border-gray-200 rounded-md bg-white p-5">
        <NewEmployeeForm />
      </div>
    </div>
  );
}

"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateEmployeeAction } from "@/lib/actions/hr";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-gray-900 text-white text-sm rounded px-4 py-2 hover:bg-gray-800 disabled:opacity-60"
    >
      {pending ? "Saving..." : "Save Changes"}
    </button>
  );
}

export function EditEmployeeForm({ employee }: { employee: any }) {
  const [state, formAction] = useFormState(updateEmployeeAction, null);

  const inputClass =
    "w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900";
  const labelClass = "block text-xs font-medium text-gray-600 mb-1";

  return (
    <form action={formAction} className="space-y-4 max-w-lg">
      <input type="hidden" name="dbId" value={employee.id} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Employee ID</label>
          <input value={employee.employeeId} disabled className={`${inputClass} bg-gray-50 text-gray-500`} />
        </div>
        <div>
          <label className={labelClass}>Full Name *</label>
          <input name="name" required defaultValue={employee.name} className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Email *</label>
        <input name="email" type="email" required defaultValue={employee.email} className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Department *</label>
          <input name="department" required defaultValue={employee.department} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Designation *</label>
          <input name="designation" required defaultValue={employee.designation} className={inputClass} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Phone</label>
          <input name="phone" defaultValue={employee.phone || ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Location</label>
          <input name="location" defaultValue={employee.location || ""} className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Status</label>
        <select name="status" defaultValue={employee.status} className={inputClass}>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {state?.error && (
        <p className="text-xs text-red-600 border border-red-200 bg-red-50 rounded px-3 py-2">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}

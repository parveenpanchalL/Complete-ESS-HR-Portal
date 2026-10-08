"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createEmployeeAction } from "@/lib/actions/hr";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-gray-900 text-white text-sm rounded px-4 py-2 hover:bg-gray-800 disabled:opacity-60"
    >
      {pending ? "Saving..." : "Add Employee"}
    </button>
  );
}

export function NewEmployeeForm() {
  const [state, formAction] = useFormState(createEmployeeAction, null);

  const inputClass =
    "w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900";
  const labelClass = "block text-xs font-medium text-gray-600 mb-1";

  return (
    <form action={formAction} className="space-y-4 max-w-lg">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Employee ID *</label>
          <input name="employeeId" required placeholder="EMP026" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Full Name *</label>
          <input name="name" required className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Email *</label>
        <input name="email" type="email" required className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Department *</label>
          <input name="department" required className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Designation *</label>
          <input name="designation" required className={inputClass} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Joining Date *</label>
          <input name="joiningDate" type="date" required className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Phone</label>
          <input name="phone" className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Location</label>
        <input name="location" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Initial Password</label>
        <input name="password" placeholder="Leave blank to auto-generate" className={inputClass} />
        <p className="text-[11px] text-gray-400 mt-1">
          The employee must change it at first login.
        </p>
      </div>

      {state?.error && (
        <p className="text-xs text-red-600 border border-red-200 bg-red-50 rounded px-3 py-2">
          {state.error}
        </p>
      )}

      {state?.success && (
        <p className="text-xs text-green-700 border border-green-200 bg-green-50 rounded px-3 py-2 select-all">{state.success}</p>
      )}
      <SubmitButton />
    </form>
  );
}

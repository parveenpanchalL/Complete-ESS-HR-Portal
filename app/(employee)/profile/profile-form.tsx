"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateProfileAction } from "@/lib/actions/employee";
import { Badge } from "@/components/ui/badge";

type EmployeeData = {
  employee_id: string;
  name: string;
  department: string;
  designation: string;
  joining_date: string;
  email: string;
  phone: string | null;
  location: string | null;
  status: string;
  manager: string | null;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-gray-900 text-white text-sm rounded px-4 py-2 hover:bg-gray-800 disabled:opacity-60 transition-colors"
    >
      {pending ? "Saving..." : "Save Changes"}
    </button>
  );
}

export function ProfileForm({ employee }: { employee: EmployeeData }) {
  const [state, formAction] = useFormState(updateProfileAction, null);

  const inputClass =
    "w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900";
  const labelClass = "block text-xs font-medium text-gray-600 mb-1";

  const hrFields: [string, string | null][] = [
    ["Employee ID", employee.employee_id],
    ["Full Name", employee.name],
    ["Official Email", employee.email],
    ["Department", employee.department],
    ["Designation", employee.designation],
    ["Joining Date", employee.joining_date],
    ["Reporting Manager", employee.manager],
    ["Employment Status", employee.status],
  ];

  return (
    <div className="space-y-6">
      {/* Read-Only HR Information */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Employment Details</h2>
          <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Managed by HR
          </span>
        </div>
        <dl className="border border-gray-200 rounded-md bg-white divide-y divide-gray-100">
          {hrFields.map(([k, v]) => (
            <div key={k} className="px-4 py-2.5 flex justify-between items-center text-sm">
              <dt className="text-gray-500">{k}</dt>
              <dd className="text-gray-900 font-medium">
                {k === "Employment Status" ? (
                  <Badge className={v === "ACTIVE" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-700"}>
                    {v || "ACTIVE"}
                  </Badge>
                ) : (
                  v || "—"
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Editable Contact Details */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-900">Personal & Contact Details</h2>
        <div className="border border-gray-200 rounded-md bg-white p-5">
          <form action={formAction} className="space-y-4 max-w-lg">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Phone Number</label>
                <input
                  name="phone"
                  defaultValue={employee.phone || ""}
                  placeholder="+91 98765 43210"
                  className={inputClass}
                />
                <span className="text-[11px] text-gray-400">Used for official communications & alerts</span>
              </div>
              <div>
                <label className={labelClass}>Work Location / City</label>
                <input
                  name="location"
                  defaultValue={employee.location || ""}
                  placeholder="e.g. Mumbai, Bengaluru, Remote"
                  className={inputClass}
                />
                <span className="text-[11px] text-gray-400">Your primary work base or city</span>
              </div>
            </div>

            {state?.error && (
              <p className="text-xs text-red-600 border border-red-200 bg-red-50 rounded px-3 py-2">
                {state.error}
              </p>
            )}

            {state?.success && (
              <p className="text-xs text-green-700 border border-green-200 bg-green-50 rounded px-3 py-2">
                {state.success}
              </p>
            )}

            <div className="pt-2">
              <SubmitButton />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

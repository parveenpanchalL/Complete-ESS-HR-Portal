"use client";

import { useFormState, useFormStatus } from "react-dom";
import { uploadSinglePayslipAction, bulkUploadPayslipsAction } from "@/lib/actions/hr";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-gray-900 text-white text-sm rounded px-4 py-1.5 hover:bg-gray-800 disabled:opacity-60"
    >
      {pending ? "Uploading..." : label}
    </button>
  );
}

export function SinglePayslipForm({ employees }: { employees: { id: string; label: string }[] }) {
  const [state, formAction] = useFormState(uploadSinglePayslipAction, null);
  return (
    <form action={formAction} className="border border-gray-200 rounded-md bg-white p-4 space-y-3">
      <p className="text-sm font-medium text-gray-900">Upload for One Employee</p>
      <div className="grid grid-cols-2 gap-3">
        <select
          name="employeeDbId"
          required
          className="border border-gray-300 rounded px-3 py-1.5 text-sm col-span-2"
        >
          <option value="">Select employee</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </select>
        <select name="month" required className="border border-gray-300 rounded px-3 py-1.5 text-sm">
          <option value="">Month</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <input
          name="year"
          type="number"
          placeholder="Year"
          defaultValue={2026}
          required
          className="border border-gray-300 rounded px-3 py-1.5 text-sm"
        />
      </div>
      <input name="file" type="file" required className="text-sm" />
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state?.success && <p className="text-xs text-green-700">{state.success}</p>}
      <SubmitButton label="Upload Payslip" />
    </form>
  );
}

export function BulkPayslipForm() {
  const [state, formAction] = useFormState(bulkUploadPayslipsAction, null);
  return (
    <form action={formAction} className="border border-gray-200 rounded-md bg-white p-4 space-y-3">
      <p className="text-sm font-medium text-gray-900">Bulk Upload</p>
      <p className="text-xs text-gray-500">
        Name each file with the Employee ID (e.g. EMP001.pdf) so it can be matched automatically.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <select name="month" required className="border border-gray-300 rounded px-3 py-1.5 text-sm">
          <option value="">Month</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <input
          name="year"
          type="number"
          placeholder="Year"
          defaultValue={2026}
          required
          className="border border-gray-300 rounded px-3 py-1.5 text-sm"
        />
      </div>
      <input name="files" type="file" multiple required className="text-sm" />
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state?.success && <p className="text-xs text-green-700">{state.success}</p>}
      <SubmitButton label="Bulk Upload" />
    </form>
  );
}

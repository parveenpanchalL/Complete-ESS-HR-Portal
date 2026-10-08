"use client";

import { useFormState, useFormStatus } from "react-dom";
import { sendNotificationAction } from "@/lib/actions/hr";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-gray-900 text-white text-sm rounded px-4 py-1.5 hover:bg-gray-800 disabled:opacity-60"
    >
      {pending ? "Sending..." : "Send Notification"}
    </button>
  );
}

export function SendNotificationForm({ departments }: { departments: string[] }) {
  const [state, formAction] = useFormState(sendNotificationAction, null);
  return (
    <form action={formAction} className="border border-gray-200 rounded-md bg-white p-4 space-y-3 max-w-lg">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
        <input name="title" required className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Message</label>
        <textarea
          name="message"
          required
          rows={3}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Send To</label>
        <select name="target" className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
          <option value="all">All Employees</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d} Department
            </option>
          ))}
        </select>
      </div>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state?.success && <p className="text-xs text-green-700">{state.success}</p>}
      <SubmitButton />
    </form>
  );
}

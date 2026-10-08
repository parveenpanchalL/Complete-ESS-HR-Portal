"use client";
import { useFormState } from "react-dom";
import { resetPasswordAction } from "@/lib/actions/hr";

export function ResetPasswordButton({ dbId }: { dbId: string }) {
  const [state, action] = useFormState(resetPasswordAction.bind(null, dbId), null);
  return (
    <form action={action} className="inline">
      <button
        className="text-xs text-gray-600 hover:text-gray-900 underline"
        onClick={(e) => { if (!confirm("Generate a new temporary password for this employee?")) e.preventDefault(); }}
      >
        Reset password
      </button>
      {state?.success && (
        <span className="ml-2 text-xs text-green-700 border border-green-200 bg-green-50 rounded px-2 py-1 select-all">{state.success}</span>
      )}
      {state?.error && <span className="ml-2 text-xs text-red-600">{state.error}</span>}
    </form>
  );
}

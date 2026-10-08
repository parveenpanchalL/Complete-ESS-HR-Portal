"use client";
import { useFormState, useFormStatus } from "react-dom";
import { changePasswordAction } from "@/lib/actions/auth";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="w-full bg-gray-900 text-white text-sm font-medium rounded py-2 hover:bg-gray-800 disabled:opacity-60">
      {pending ? "Saving..." : "Update password"}
    </button>
  );
}
const input = "w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900";
const label = "block text-xs font-medium text-gray-600 mb-1";

export function ChangePasswordForm() {
  const [state, action] = useFormState(changePasswordAction, null);
  return (
    <form action={action} className="space-y-3">
      <div><label className={label}>Current password</label><input name="current" type="password" required autoComplete="current-password" className={input} /></div>
      <div><label className={label}>New password (min 8 characters)</label><input name="next" type="password" required minLength={8} autoComplete="new-password" className={input} /></div>
      <div><label className={label}>Confirm new password</label><input name="confirm" type="password" required minLength={8} autoComplete="new-password" className={input} /></div>
      {state?.error && <p className="text-xs text-red-600 border border-red-200 bg-red-50 rounded px-3 py-2">{state.error}</p>}
      <Submit />
    </form>
  );
}

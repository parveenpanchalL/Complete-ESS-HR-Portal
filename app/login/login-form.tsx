"use client";

import { useFormState, useFormStatus } from "react-dom";
import { employeeLoginAction } from "@/lib/actions/auth";
import Link from "next/link";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-gray-900 text-white text-sm font-medium rounded py-2 hover:bg-gray-800 disabled:opacity-60"
    >
      {pending ? "Signing in..." : "Sign in"}
    </button>
  );
}

export function EmployeeLoginForm() {
  const [state, formAction] = useFormState(employeeLoginAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Employee ID or Email
        </label>
        <input
          name="identifier"
          type="text"
          required
          placeholder="EMP001 or you@company.com"
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
        <input
          name="password"
          type="password"
          required
          placeholder="••••••••"
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
        />
      </div>
      {state?.error && (
        <p className="text-xs text-red-600 border border-red-200 bg-red-50 rounded px-3 py-2">
          {state.error}
        </p>
      )}
      <SubmitButton />
      <p className="text-xs text-gray-400 text-center">
        Forgot your password? Contact HR to have it reset.
      </p>
      <p className="text-xs text-center">
        <Link href="/admin/login" className="text-gray-500 hover:text-gray-900 underline">
          HR / Admin login
        </Link>
      </p>
    </form>
  );
}

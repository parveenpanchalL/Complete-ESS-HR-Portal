"use client";

import { useFormState, useFormStatus } from "react-dom";
import { hrLoginAction } from "@/lib/actions/auth";
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

export function HrLoginForm() {
  const [state, formAction] = useFormState(hrLoginAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">HR Email</label>
        <input
          name="identifier"
          type="text"
          required
          placeholder="hr@company.com"
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
        <Link href="/login" className="text-gray-500 hover:text-gray-900 underline">
          Employee login
        </Link>
      </p>
    </form>
  );
}

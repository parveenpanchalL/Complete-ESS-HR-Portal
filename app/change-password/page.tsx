import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { ChangePasswordForm } from "./form";

export default async function ChangePasswordPage() {
  const s = await getSession();
  if (!s) redirect("/login");
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-md p-6">
        <p className="text-lg font-semibold text-gray-900 text-center">Change Password</p>
        {s.mustChangePassword && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 mt-3">
            You must set a new password before continuing.
          </p>
        )}
        <div className="mt-4"><ChangePasswordForm /></div>
        {!s.mustChangePassword && (
          <p className="text-xs text-center mt-4">
            <a href={s.role === "HR" ? "/admin/dashboard" : "/dashboard"} className="text-gray-500 underline">Back</a>
          </p>
        )}
      </div>
    </div>
  );
}

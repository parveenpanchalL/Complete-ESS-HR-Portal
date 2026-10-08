import { HrLoginForm } from "./login-form";

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-md p-6">
        <div className="mb-6 text-center">
          <p className="text-lg font-semibold text-gray-900">HR / Admin Portal</p>
          <p className="text-xs text-gray-500 mt-1">Sign in to manage the organization</p>
        </div>
        <HrLoginForm />
      </div>
    </div>
  );
}

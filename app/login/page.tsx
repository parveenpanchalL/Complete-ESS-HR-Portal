import { EmployeeLoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-md p-6">
        <div className="mb-6 text-center">
          <p className="text-lg font-semibold text-gray-900">Employee Self-Service</p>
          <p className="text-xs text-gray-500 mt-1">Sign in to your account</p>
        </div>
        <EmployeeLoginForm />
      </div>
    </div>
  );
}

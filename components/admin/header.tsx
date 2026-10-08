import { logoutAction } from "@/lib/actions/auth";
import { MobileNav } from "./mobile-nav";

export function AdminHeader({ name }: { name: string }) {
  return (
    <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <MobileNav />
          <span className="text-sm font-medium text-gray-900">Welcome, {name}</span>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="text-xs border border-gray-300 rounded px-3 py-1.5 text-gray-600 hover:bg-gray-50"
          >
            Log out
          </button>
        </form>
      </div>
    </header>
  );
}

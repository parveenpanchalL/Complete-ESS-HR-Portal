import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { q1 } from "@/lib/db";
import { ProfileForm } from "./profile-form";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const s = await getSession();
  if (!s) redirect("/login");
  const e = (await q1<{
    employee_id: string;
    name: string;
    department: string;
    designation: string;
    joining_date: string;
    email: string;
    phone: string | null;
    location: string | null;
    status: string;
    manager: string | null;
  }>(
    `SELECT e.employee_id, e.name, e.department, e.designation, e.joining_date, e.email, e.phone, e.location, e.status, m.name AS manager
     FROM employees e LEFT JOIN employees m ON m.id = e.manager_id WHERE e.id = ?`,
    [s.dbId]
  ))!;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">My Profile</h1>
        <p className="text-xs text-gray-500">View employment details and manage personal contact information.</p>
      </div>
      <ProfileForm employee={e} />
    </div>
  );
}


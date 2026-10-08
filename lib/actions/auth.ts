"use server";
import { redirect } from "next/navigation";
import { authenticate, changePassword } from "@/lib/services/auth";
import { clearSessionCookie, getSession, setSessionCookie } from "@/lib/auth/session";

export type FormState = { error?: string; success?: string; info?: string } | null;

async function login(formData: FormData, needRole?: "HR"): Promise<FormState> {
  try {
    const r = await authenticate(String(formData.get("identifier") || ""), String(formData.get("password") || ""), needRole);
    if (!r.ok) return { error: r.error };
    await setSessionCookie(r.user.id, r.user.role);
    if (r.user.mustChangePassword) redirect("/change-password");
    redirect(r.user.role === "HR" && needRole ? "/admin/dashboard" : "/dashboard");
  } catch (err: any) {
    if (err?.digest?.startsWith("NEXT_REDIRECT")) {
      throw err;
    }
    console.error("Login action error:", err);
    return {
      error:
        "Database connection error. Please verify your Supabase DATABASE_URL in Vercel settings and ensure 'npm run db:init' has been executed.",
    };
  }
}
export async function employeeLoginAction(_p: FormState, fd: FormData) { return login(fd); }
export async function hrLoginAction(_p: FormState, fd: FormData) { return login(fd, "HR"); }

export async function logoutAction() {
  clearSessionCookie();
  redirect("/login");
}

export async function changePasswordAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const s = await getSession();
    if (!s) redirect("/login");
    const next = String(fd.get("next") || "");
    if (next !== String(fd.get("confirm") || "")) return { error: "New password and confirmation do not match." };
    const err = await changePassword(s.dbId, String(fd.get("current") || ""), next);
    if (err) return { error: err };
    redirect(s.role === "HR" ? "/admin/dashboard" : "/dashboard");
  } catch (err: any) {
    if (err?.digest?.startsWith("NEXT_REDIRECT")) {
      throw err;
    }
    console.error("Change password action error:", err);
    return { error: err?.message || "An unexpected database error occurred. Please try again." };
  }
}

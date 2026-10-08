import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifyToken } from "@/lib/auth/token";

// Coarse gate at the edge (signature + role). Every page/action/API ALSO re-checks the user in the DB.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const t = token ? await verifyToken(token) : null;

  if (pathname === "/admin/login" || pathname === "/login") {
    return NextResponse.next(); // public pages: never redirect away from here
  }
  if (pathname.startsWith("/admin")) {
    if (!t || t.role !== "HR") return NextResponse.redirect(new URL("/admin/login", req.url));
    return NextResponse.next();
  }
  if (!t) return NextResponse.redirect(new URL("/login", req.url));
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*", "/dashboard/:path*", "/attendance/:path*", "/leave/:path*", "/payslips/:path*",
    "/profile/:path*", "/notifications/:path*", "/change-password",
  ],
};

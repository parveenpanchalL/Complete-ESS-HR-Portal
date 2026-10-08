// Edge-runtime safe (used by middleware). Only depends on `jose`.
import { SignJWT, jwtVerify } from "jose";

export const COOKIE_NAME = "ess_hr_session";
const DEV_SECRET = "dev-only-secret-do-not-use-in-production-000000";

function secretKey() {
  const s = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production") {
    if (!s || s.length < 32) throw new Error("JWT_SECRET must be set (32+ characters) in production");
  }
  return new TextEncoder().encode(s || DEV_SECRET);
}

export type TokenPayload = { sub: string; role: "EMPLOYEE" | "HR" };

export async function signToken(p: TokenPayload) {
  return new SignJWT({ role: p.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(p.sub)
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secretKey());
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (!payload.sub || (payload.role !== "EMPLOYEE" && payload.role !== "HR")) return null;
    return { sub: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}

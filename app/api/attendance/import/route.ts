import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { revalidatePosted } from "@/lib/attendance/validate";
import { importAttendance } from "@/lib/services/hr";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const me = await getSession();
  if (!me || me.role !== "HR") return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.rows)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  try {
    const rows = await revalidatePosted(body.rows);
    const result = await importAttendance(me.dbId, String(body.fileName || "attendance.csv").slice(0, 200), rows);
    return NextResponse.json(result);
  } catch (e) {
    console.error("attendance import failed", e);
    return NextResponse.json({ error: "Import failed while writing to the database. Nothing was imported." }, { status: 500 });
  }
}

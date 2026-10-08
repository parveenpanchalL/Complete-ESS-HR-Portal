import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { q1 } from "@/lib/db";

export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = { pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg" };

export async function GET(req: NextRequest) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id") || "";
  const p = await q1<{ employee_db_id: string; file_name: string; file_data: string }>(
    `SELECT employee_db_id, file_name, file_data FROM payslips WHERE id = ?`, [id]);
  // Same 404 for "missing" and "someone else's" so ids can't be probed.
  if (!p || (me.role !== "HR" && p.employee_db_id !== me.dbId)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const ext = p.file_name.split(".").pop()?.toLowerCase() || "";
  return new NextResponse(Buffer.from(p.file_data, "base64"), {
    headers: {
      "Content-Type": TYPES[ext] || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${p.file_name.replace(/[^\w.\-]/g, "_")}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}

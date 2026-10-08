import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { q1 } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const type = sp.get("type");
  const id = sp.get("id");

  if (!id || (type !== "leave" && type !== "correction")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let row: { employee_db_id: string; attachment: string | null } | undefined;
  if (type === "leave") {
    row = await q1<{ employee_db_id: string; attachment: string | null }>(
      `SELECT employee_db_id, attachment FROM leave_requests WHERE id = ?`,
      [id]
    );
  } else {
    row = await q1<{ employee_db_id: string; attachment: string | null }>(
      `SELECT employee_db_id, attachment FROM attendance_corrections WHERE id = ?`,
      [id]
    );
  }

  // Consistent 404 if record doesn't exist, has no attachment, or caller does not have permission
  if (!row || !row.attachment || (me.role !== "HR" && row.employee_db_id !== me.dbId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const parsed = JSON.parse(row.attachment) as { name: string; type: string; data: string };
    const safeName = (parsed.name || "attachment").replace(/[^\w.\-]/g, "_");
    return new NextResponse(Buffer.from(parsed.data, "base64"), {
      headers: {
        "Content-Type": parsed.type || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid attachment" }, { status: 500 });
  }
}

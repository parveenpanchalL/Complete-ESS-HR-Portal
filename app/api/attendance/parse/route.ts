import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { MAX_UPLOAD_BYTES, parseAttendanceBuffer, validateRows } from "@/lib/attendance/validate";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const me = await getSession();
  if (!me || me.role !== "HR") return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const file = (await req.formData()).get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  if (!/\.(xlsx|xls|csv)$/i.test(file.name)) return NextResponse.json({ error: "Only .xlsx, .xls or .csv files are accepted." }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "File is larger than 4 MB. Split it into smaller files." }, { status: 413 });

  try {
    const isCsv = /\.csv$/i.test(file.name);
    const rows = parseAttendanceBuffer(await file.arrayBuffer(), isCsv);
    if (rows.length === 0) return NextResponse.json({ error: "The file contains no data rows." }, { status: 400 });
    const { validated, summary } = await validateRows(rows);
    return NextResponse.json({ fileName: file.name, summary, rows: validated });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error && e.message.includes("rows") ? e.message : "Could not read the file. Upload a valid .xlsx, .xls or .csv." }, { status: 400 });
  }
}

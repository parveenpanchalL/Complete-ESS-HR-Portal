import { NextResponse } from "next/server";
import { q1 } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const hasDbUrl = Boolean(process.env.DATABASE_URL);
  const dbUrlPreview = process.env.DATABASE_URL
    ? process.env.DATABASE_URL.replace(/:[^:@]+@/, ":***@")
    : "NOT_SET";

  try {
    await q1(`SELECT 1`);
    return NextResponse.json({
      status: "healthy",
      database: "connected",
      dbUrlConfigured: hasDbUrl,
      dbHost: dbUrlPreview,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "unhealthy",
        database: "disconnected",
        dbUrlConfigured: hasDbUrl,
        dbHost: dbUrlPreview,
        error: err?.message || String(err),
      },
      { status: 503 }
    );
  }
}

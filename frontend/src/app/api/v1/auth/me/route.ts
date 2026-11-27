import { NextRequest, NextResponse } from "next/server";
import { pool, ensureTables } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  await ensureTables();
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const result = await pool.query(
    "SELECT id, email, full_name, is_active, created_at FROM users WHERE id = $1",
    [userId]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ detail: "User not found" }, { status: 404 });
  }

  return NextResponse.json(result.rows[0]);
}

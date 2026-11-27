import { NextRequest, NextResponse } from "next/server";
import { pool, ensureTables } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  await ensureTables();
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const result = await pool.query(
    "SELECT * FROM pairing_codes WHERE code = $1 AND user_id = $2",
    [params.code, userId]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ detail: "Pairing code not found" }, { status: 404 });
  }

  const row = result.rows[0];
  const isExpired = new Date() > new Date(row.expires_at);

  return NextResponse.json({
    code: row.code,
    is_claimed: row.is_claimed,
    claimed_node_id: row.claimed_node_id,
    is_expired: isExpired,
  });
}

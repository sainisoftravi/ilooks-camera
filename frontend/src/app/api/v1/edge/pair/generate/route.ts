import { NextRequest, NextResponse } from "next/server";
import { pool, ensureTables } from "@/lib/db";
import { getUserIdFromRequest, generatePairingCode } from "@/lib/auth";

export async function POST(req: NextRequest) {
  await ensureTables();
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const { node_name } = await req.json().catch(() => ({ node_name: "Local Edge Node" }));
  const code = generatePairingCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

  await pool.query(
    `INSERT INTO pairing_codes (code, user_id, node_name, expires_at, is_claimed)
     VALUES ($1, $2, $3, $4, FALSE)`,
    [code, userId, node_name || "Local Edge Node", expiresAt]
  );

  return NextResponse.json({ code, expires_at: expiresAt.toISOString() });
}

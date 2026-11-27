import { NextRequest, NextResponse } from "next/server";
import { pool, ensureTables } from "@/lib/db";

export async function POST(req: NextRequest) {
  await ensureTables();
  const token = req.headers.get("x-node-token");
  if (!token) {
    return NextResponse.json({ detail: "Missing token" }, { status: 401 });
  }

  const result = await pool.query(
    "UPDATE edge_nodes SET is_online = TRUE, last_heartbeat = CURRENT_TIMESTAMP WHERE node_token = $1 RETURNING id",
    [token]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ detail: "Invalid node token" }, { status: 401 });
  }

  return NextResponse.json({ status: "ok", server_time: new Date().toISOString() });
}

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { pool, ensureTables } from "@/lib/db";
import { generateSecret } from "@/lib/auth";

export async function POST(req: NextRequest) {
  await ensureTables();
  try {
    const { code, node_name, version } = await req.json();
    if (!code) {
      return NextResponse.json({ detail: "Code required" }, { status: 400 });
    }

    const result = await pool.query(
      "SELECT * FROM pairing_codes WHERE code = $1 AND is_claimed = FALSE",
      [code]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ detail: "Invalid or already claimed code" }, { status: 400 });
    }

    const pairing = result.rows[0];
    if (new Date() > new Date(pairing.expires_at)) {
      return NextResponse.json({ detail: "Pairing code expired" }, { status: 400 });
    }

    const nodeId = crypto.randomUUID();
    const nodeToken = generateSecret(48);
    const finalName = node_name || pairing.node_name;

    await pool.query(
      `INSERT INTO edge_nodes (id, owner_id, node_name, node_token, version, is_online, last_heartbeat)
       VALUES ($1, $2, $3, $4, $5, TRUE, CURRENT_TIMESTAMP)`,
      [nodeId, pairing.user_id, finalName, nodeToken, version || "1.0.0"]
    );

    await pool.query(
      "UPDATE pairing_codes SET is_claimed = TRUE, claimed_node_id = $1 WHERE code = $2",
      [nodeId, code]
    );

    return NextResponse.json({
      edge_node_id: nodeId,
      node_token: nodeToken,
      owner_id: pairing.user_id,
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || "Claim failed" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { pool, ensureTables } from "@/lib/db";
import { generateCamUid, generateSecret } from "@/lib/auth";

const INGEST_HOST = process.env.MEDIAMTX_INGEST_HOST || "stream.labstackops.top";
const RTSP_PORT = process.env.MEDIAMTX_INGEST_RTSP_PORT || "8554";

export async function POST(req: NextRequest) {
  await ensureTables();
  const token = req.headers.get("x-node-token");
  if (!token) {
    return NextResponse.json({ detail: "Missing token" }, { status: 401 });
  }

  const nodeRes = await pool.query(
    "SELECT id, owner_id FROM edge_nodes WHERE node_token = $1",
    [token]
  );

  if (nodeRes.rows.length === 0) {
    return NextResponse.json({ detail: "Invalid node token" }, { status: 401 });
  }

  const node = nodeRes.rows[0];
  const { name, onvif_ip, onvif_port, rtsp_source_url } = await req.json();

  const camId = crypto.randomUUID();
  const camUid = generateCamUid();
  const camSecret = generateSecret(32);

  await pool.query(
    `INSERT INTO cameras (id, owner_id, edge_node_id, cam_uid, cam_secret, name, onvif_ip, onvif_port, rtsp_source_url, is_online)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, FALSE)`,
    [camId, node.owner_id, node.id, camUid, camSecret, name, onvif_ip || null, onvif_port || 80, rtsp_source_url]
  );

  const rtspPushUrl = `rtsp://${camUid}:${camSecret}@${INGEST_HOST}:${RTSP_PORT}/${camUid}`;

  return NextResponse.json({
    camera_id: camId,
    cam_uid: camUid,
    cam_secret: camSecret,
    rtsp_push_url: rtspPushUrl,
  });
}

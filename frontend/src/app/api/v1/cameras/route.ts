import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { pool, ensureTables } from "@/lib/db";
import { getUserIdFromRequest, generateCamUid, generateSecret } from "@/lib/auth";

const INGEST_HOST = process.env.MEDIAMTX_INGEST_HOST || "stream.labstackops.top";
const RTSP_PORT = process.env.MEDIAMTX_INGEST_RTSP_PORT || "8554";
const WHEP_BASE = process.env.MEDIAMTX_WHEP_URL || "https://stream.labstackops.top";

function formatCamera(cam: any) {
  return {
    id: cam.id,
    cam_uid: cam.cam_uid,
    name: cam.name,
    is_online: cam.is_online,
    edge_node_id: cam.edge_node_id,
    rtsp_source_url: cam.rtsp_source_url,
    last_seen: cam.last_seen,
    created_at: cam.created_at,
    whep_url: `${WHEP_BASE}/${cam.cam_uid}/whep`,
    rtsp_push_url: `rtsp://${cam.cam_uid}:${cam.cam_secret}@${INGEST_HOST}:${RTSP_PORT}/${cam.cam_uid}`,
  };
}

export async function GET(req: NextRequest) {
  await ensureTables();
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const result = await pool.query(
    "SELECT * FROM cameras WHERE owner_id = $1 ORDER BY created_at DESC",
    [userId]
  );

  return NextResponse.json(result.rows.map(formatCamera));
}

export async function POST(req: NextRequest) {
  await ensureTables();
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const { name, rtsp_source_url } = await req.json();
  if (!name) {
    return NextResponse.json({ detail: "Camera name required" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const camUid = generateCamUid();
  const camSecret = generateSecret(32);

  const result = await pool.query(
    `INSERT INTO cameras (id, owner_id, cam_uid, cam_secret, name, rtsp_source_url, is_online)
     VALUES ($1, $2, $3, $4, $5, $6, FALSE)
     RETURNING *`,
    [id, userId, camUid, camSecret, name, rtsp_source_url || null]
  );

  return NextResponse.json(formatCamera(result.rows[0]));
}

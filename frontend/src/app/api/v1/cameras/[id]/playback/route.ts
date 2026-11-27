import { NextRequest, NextResponse } from "next/server";
import { pool, ensureTables } from "@/lib/db";
import { getUserIdFromRequest, createStreamPlaybackToken } from "@/lib/auth";

const WHEP_BASE = process.env.MEDIAMTX_WHEP_URL || "https://stream.labstackops.top";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await ensureTables();
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const result = await pool.query(
    "SELECT cam_uid FROM cameras WHERE id = $1 AND owner_id = $2",
    [params.id, userId]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ detail: "Camera not found or unauthorized" }, { status: 404 });
  }

  const cam = result.rows[0];
  const streamToken = createStreamPlaybackToken(userId, cam.cam_uid);
  const whepUrl = `${WHEP_BASE}/${cam.cam_uid}/whep?token=${streamToken}`;

  return NextResponse.json({
    cam_uid: cam.cam_uid,
    stream_token: streamToken,
    whep_url: whepUrl,
  });
}

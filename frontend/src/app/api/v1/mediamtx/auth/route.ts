import { NextRequest, NextResponse } from "next/server";
import { pool, ensureTables } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

function cleanPath(path: string): string {
  let p = path.replace(/^\/+|\/+$/g, "");
  if (p.includes("/")) {
    p = p.split("/")[0];
  }
  return p;
}

export async function POST(req: NextRequest) {
  await ensureTables();
  try {
    const body = await req.json();
    const { action, path, password, query } = body;
    const cleanUid = cleanPath(path || "");

    if (["health", "metrics", "ready"].includes(cleanUid)) {
      return new NextResponse(null, { status: 200 });
    }

    const camRes = await pool.query("SELECT * FROM cameras WHERE cam_uid = $1", [cleanUid]);
    if (camRes.rows.length === 0) {
      return NextResponse.json({ detail: "Camera not found" }, { status: 401 });
    }
    const camera = camRes.rows[0];

    // 1. PUBLISH (Edge agent pushing RTSP feed)
    if (action === "publish") {
      if (password !== camera.cam_secret) {
        return NextResponse.json({ detail: "Invalid camera credentials" }, { status: 401 });
      }
      await pool.query(
        "UPDATE cameras SET is_online = TRUE, last_seen = CURRENT_TIMESTAMP WHERE id = $1",
        [camera.id]
      );
      return new NextResponse(null, { status: 200 });
    }

    // 2. READ (WHEP WebRTC player or RTSP playback client)
    if (action === "read") {
      let token = "";
      if (query) {
        const params = new URLSearchParams(query);
        token = params.get("token") || "";
      }
      if (!token && password) {
        token = password;
      }

      if (!token) {
        return NextResponse.json({ detail: "Missing token" }, { status: 401 });
      }

      const payload = verifyToken(token);
      if (!payload || !payload.sub) {
        return NextResponse.json({ detail: "Invalid token" }, { status: 401 });
      }

      // Strict Multi-Tenant Check: user must own this camera
      if (camera.owner_id !== payload.sub) {
        return NextResponse.json({ detail: "Forbidden: cross-tenant access denied" }, { status: 403 });
      }

      // If token is camera-specific, verify UID
      if (payload.cam_uid && payload.cam_uid !== camera.cam_uid) {
        return NextResponse.json({ detail: "Token invalid for this camera" }, { status: 403 });
      }

      return new NextResponse(null, { status: 200 });
    }

    return NextResponse.json({ detail: `Unsupported action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error("[MediaMTX Auth Error]:", err);
    return NextResponse.json({ detail: "Auth server error" }, { status: 500 });
  }
}

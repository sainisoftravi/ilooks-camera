import { NextRequest, NextResponse } from "next/server";

const MEDIAMTX_INTERNAL = process.env.MEDIAMTX_INTERNAL_URL || "http://ilook-media-gateway.ilook-system.svc.cluster.local:1984";

export async function POST(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const rawPath = params.path || [];
    const camUid = rawPath[0] || "";
    const url = new URL(req.url);

    // Support go2rtc WebRTC (/api/webrtc?src=CAM_UID) with fallback to raw subpath
    const targetUrl = camUid
      ? `${MEDIAMTX_INTERNAL}/api/webrtc?src=${camUid}`
      : `${MEDIAMTX_INTERNAL}/${rawPath.join("/")}${url.search}`;

    const sdpOffer = await req.text();

    const mtxRes = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/sdp",
      },
      body: sdpOffer,
      cache: "no-store",
    });

    if (!mtxRes.ok) {
      const errText = await mtxRes.text();
      return new NextResponse(errText, {
        status: mtxRes.status,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "text/plain",
        },
      });
    }

    const sdpAnswer = await mtxRes.text();

    return new NextResponse(sdpAnswer, {
      status: 201,
      headers: {
        "Content-Type": "application/sdp",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Expose-Headers": "Location",
        "Location": mtxRes.headers.get("Location") || `${url.pathname}`,
      },
    });
  } catch (err: any) {
    console.error("[WHEP Proxy Error]", err);
    return NextResponse.json({ detail: err.message || "Media gateway unreachable" }, { status: 502 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const subpath = (params.path || []).join("/");
    const url = new URL(req.url);
    const targetUrl = `${MEDIAMTX_INTERNAL}/${subpath}${url.search}`;
    const body = await req.text();

    const mtxRes = await fetch(targetUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": req.headers.get("Content-Type") || "application/sdp",
      },
      body: body,
      cache: "no-store",
    });

    return new NextResponse(null, {
      status: mtxRes.status,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 502 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

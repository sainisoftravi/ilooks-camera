import { NextRequest, NextResponse } from "next/server";

const MEDIAMTX_HLS_INTERNAL = process.env.MEDIAMTX_HLS_INTERNAL_URL || "http://ilook-media-gateway.ilook-system.svc.cluster.local:8888";

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const subpath = (params.path || []).join("/");
    const url = new URL(req.url);
    const targetUrl = `${MEDIAMTX_HLS_INTERNAL}/${subpath}${url.search}`;

    const mtxRes = await fetch(targetUrl, {
      method: "GET",
      cache: "no-store",
    });

    if (!mtxRes.ok) {
      return new NextResponse("Stream not ready", { status: mtxRes.status });
    }

    const contentType = mtxRes.headers.get("content-type") || 
      (subpath.endsWith(".m3u8") ? "application/vnd.apple.mpegurl" : "video/mp4");

    const body = await mtxRes.arrayBuffer();

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": subpath.endsWith(".m3u8") ? "no-cache, no-store" : "max-age=3600",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ detail: "HLS gateway unreachable" }, { status: 502 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  });
}

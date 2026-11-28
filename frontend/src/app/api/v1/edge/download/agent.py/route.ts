import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req: NextRequest) {
  const host = req.headers.get("host") || "ilooks.labstackops.top";
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const cloudUrl = `${proto}://${host}`;

  try {
    const agentPath = path.join(process.cwd(), "public", "agent.py");
    let script = fs.readFileSync(agentPath, "utf-8");
    script = script.replace(/https:\/\/ilooks\.labstackops\.top/g, cloudUrl);

    return new NextResponse(script, {
      status: 200,
      headers: {
        "Content-Type": "text/x-python; charset=utf-8",
        "Content-Disposition": 'attachment; filename="agent.py"',
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ detail: "Agent script not found" }, { status: 404 });
  }
}

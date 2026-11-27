import { NextRequest, NextResponse } from "next/server";
import { pool, ensureTables } from "@/lib/db";

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
    const { type, path } = await req.json();
    const cleanUid = cleanPath(path || "");

    if (type === "ready") {
      await pool.query(
        "UPDATE cameras SET is_online = TRUE, last_seen = CURRENT_TIMESTAMP WHERE cam_uid = $1",
        [cleanUid]
      );
    } else if (type === "notReady") {
      await pool.query("UPDATE cameras SET is_online = FALSE WHERE cam_uid = $1", [cleanUid]);
    }

    return NextResponse.json({ status: "received" });
  } catch (err: any) {
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}

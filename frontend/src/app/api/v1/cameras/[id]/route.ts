import { NextRequest, NextResponse } from "next/server";
import { pool, ensureTables } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await ensureTables();
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const result = await pool.query(
    "DELETE FROM cameras WHERE id = $1 AND owner_id = $2 RETURNING id",
    [params.id, userId]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ detail: "Camera not found or unauthorized" }, { status: 404 });
  }

  return NextResponse.json({ status: "success", message: `Camera ${params.id} deleted` });
}

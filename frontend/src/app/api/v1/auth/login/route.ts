import { NextRequest, NextResponse } from "next/server";
import { pool, ensureTables } from "@/lib/db";
import { comparePassword, createAccessToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  await ensureTables();
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ detail: "Email and password required" }, { status: 400 });
    }

    const result = await pool.query(
      "SELECT id, email, hashed_password, full_name, is_active, created_at FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ detail: "Incorrect email or password" }, { status: 401 });
    }

    const user = result.rows[0];
    if (!comparePassword(password, user.hashed_password)) {
      return NextResponse.json({ detail: "Incorrect email or password" }, { status: 401 });
    }

    if (!user.is_active) {
      return NextResponse.json({ detail: "Inactive account" }, { status: 400 });
    }

    const access_token = createAccessToken(user.id);
    delete user.hashed_password;

    return NextResponse.json({
      access_token,
      token_type: "bearer",
      user,
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || "Login failed" }, { status: 500 });
  }
}

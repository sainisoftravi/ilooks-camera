import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { pool, ensureTables } from "@/lib/db";
import { hashPassword, createAccessToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  await ensureTables();
  try {
    const { email, password, full_name } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ detail: "Email and password required" }, { status: 400 });
    }

    const check = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (check.rows.length > 0) {
      return NextResponse.json({ detail: "A user with this email already exists." }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const hashedPassword = hashPassword(password);

    const result = await pool.query(
      `INSERT INTO users (id, email, hashed_password, full_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, full_name, is_active, created_at`,
      [id, email, hashedPassword, full_name || null]
    );

    const user = result.rows[0];
    const access_token = createAccessToken(user.id);

    return NextResponse.json({
      access_token,
      token_type: "bearer",
      user,
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || "Signup failed" }, { status: 500 });
  }
}

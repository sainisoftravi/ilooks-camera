import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { NextRequest } from "next/server";

const SECRET_KEY =
  process.env.SECRET_KEY || "ilook_super_secure_production_jwt_signing_key_384729104857";

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function createAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, SECRET_KEY, { expiresIn: "7d" });
}

export function createStreamPlaybackToken(userId: string, camUid: string): string {
  return jwt.sign(
    { sub: userId, cam_uid: camUid, type: "playback" },
    SECRET_KEY,
    { expiresIn: "24h" }
  );
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, SECRET_KEY);
  } catch (err) {
    return null;
  }
}

export function generateCamUid(): string {
  return `CAM_${crypto.randomBytes(8).toString("hex")}`;
}

export function generateSecret(length: number = 32): string {
  return crypto.randomBytes(length).toString("hex").slice(0, length);
}

export function generatePairingCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function getUserIdFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.split(" ")[1];
  const payload = verifyToken(token);
  return payload?.sub || null;
}

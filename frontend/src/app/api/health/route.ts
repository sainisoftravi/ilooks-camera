import { NextResponse } from "next/server";
import { ensureTables } from "@/lib/db";

export async function GET() {
  ensureTables(); // Run check in background without blocking
  return NextResponse.json({
    status: "healthy",
    service: "ilook-app",
    platform: "Next.js 14 App Router (ARM64)",
    timestamp: new Date().toISOString(),
  });
}

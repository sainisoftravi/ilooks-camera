import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const host = req.headers.get("host") || "ilooks.labstackops.top";
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const cloudUrl = `${proto}://${host}`;

  const content = `version: '3.8'

services:
  ilook-edge:
    image: ilook/edge-agent:latest
    build:
      context: .
      dockerfile: Dockerfile
    container_name: ilook-edge
    restart: always
    network_mode: host
    environment:
      - CLOUD_URL=${cloudUrl}
      - PAIRING_CODE=\${PAIRING_CODE}
      - CAMERA_NAME=\${CAMERA_NAME:-Office Camera}
      - CAMERA_RTSP=\${CAMERA_RTSP}
    volumes:
      - ./data:/app/data
`;

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/yaml; charset=utf-8",
      "Content-Disposition": 'attachment; filename="docker-compose.yml"',
    },
  });
}

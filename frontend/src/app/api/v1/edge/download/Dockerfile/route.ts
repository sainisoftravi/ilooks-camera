import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const content = `# Lightweight iLook Edge Agent Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install runtime dependencies for RTSP relay
RUN apt-get update && apt-get install -y --no-install-recommends \\
    ffmpeg \\
    curl \\
    ca-certificates \\
    iproute2 \\
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir requests

COPY agent.py /app/agent.py

ENV CLOUD_URL="https://ilooks.labstackops.top"
ENV PAIRING_CODE=""
ENV CAMERA_NAME="Office Camera"
ENV CAMERA_RTSP=""

CMD ["python", "agent.py"]
`;

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'attachment; filename="Dockerfile"',
    },
  });
}

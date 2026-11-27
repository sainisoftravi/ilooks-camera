import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const host = req.headers.get("host") || "ilooks.labstackops.top";
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const cloudUrl = `${proto}://${host}`;

  const script = `#!/bin/bash
set -e

PAIRING_CODE="$1"
CAMERA_RTSP="$2"
CAMERA_NAME="\${3:-Office Camera}"
CLOUD_URL="${cloudUrl}"
INSTALL_DIR="$HOME/.ilook-edge"

echo "=========================================================="
echo "      iLook Cloud Platform - Local Edge Agent Setup      "
echo "=========================================================="

if [ -z "$PAIRING_CODE" ]; then
    read -p "Enter 6-digit Pairing Code shown on your portal: " PAIRING_CODE
fi

if [ -z "$CAMERA_RTSP" ]; then
    echo ""
    echo "Tip: You can attach your local camera RTSP feed right now."
    echo "Example: rtsp://admin:pass@192.168.1.100:554/Streaming/Channels/101"
    read -p "Enter Local Camera RTSP URL (or press Enter to skip): " CAMERA_RTSP
    if [ -n "$CAMERA_RTSP" ]; then
        read -p "Enter Camera Name [Office Camera]: " INPUT_NAME
        CAMERA_NAME="\${INPUT_NAME:-Office Camera}"
    fi
fi

echo ""
echo "--> Initializing iLook Edge directory: $INSTALL_DIR"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# Download standalone agent directly from your authenticated portal
echo "--> Downloading edge agent core from portal ($CLOUD_URL)..."
curl -sSL "$CLOUD_URL/api/v1/edge/download/agent.py" -o agent.py

# Check if Docker is available on the client machine
if command -v docker &> /dev/null; then
    echo "--> Docker detected. Building lightweight local container..."
    cat << 'EOF' > Dockerfile
FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg curl ca-certificates iproute2 && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir requests
COPY agent.py .
CMD ["python", "agent.py"]
EOF

    echo "--> Compiling local Docker image (no public repo or docker login needed)..."
    docker build -t ilook/edge-agent:latest . >/dev/null

    echo "--> Launching iLook Edge Agent container..."
    docker rm -f ilook-edge 2>/dev/null || true
    
    DOCKER_ARGS=(
      -d
      --name ilook-edge
      --restart=always
      --network=host
      -e PAIRING_CODE="$PAIRING_CODE"
      -e CLOUD_URL="$CLOUD_URL"
      -v "$INSTALL_DIR/data:/app/data"
    )

    if [ -n "$CAMERA_RTSP" ]; then
      DOCKER_ARGS+=(-e CAMERA_RTSP="$CAMERA_RTSP" -e CAMERA_NAME="$CAMERA_NAME")
    fi

    docker run "\${DOCKER_ARGS[@]}" ilook/edge-agent:latest

    echo ""
    echo "=========================================================="
    echo "  [SUCCESS] iLook Edge Agent is Running in Docker!"
    echo "  • Cloud Server : $CLOUD_URL"
    echo "  • Pairing Code : $PAIRING_CODE"
    if [ -n "$CAMERA_RTSP" ]; then
        echo "  • Camera Feed  : $CAMERA_NAME ($CAMERA_RTSP)"
    fi
    echo "  • Container    : ilook-edge (docker logs -f ilook-edge)"
    echo "=========================================================="
else
    echo "--> Docker not detected. Checking Python3 & FFmpeg..."
    if ! command -v ffmpeg &> /dev/null; then
        echo "--> Installing FFmpeg and Python tools..."
        sudo apt-get update && sudo apt-get install -y ffmpeg python3-pip || true
    fi
    pip3 install requests --quiet || pip install requests --quiet
    
    export CAMERA_RTSP="$CAMERA_RTSP"
    export CAMERA_NAME="$CAMERA_NAME"
    
    echo "--> Starting standalone background agent..."
    nohup python3 agent.py --code "$PAIRING_CODE" --cloud "$CLOUD_URL" > agent.log 2>&1 &
    
    echo ""
    echo "=========================================================="
    echo "  [SUCCESS] iLook Edge Agent is running in background!"
    echo "  • Cloud Server : $CLOUD_URL"
    echo "  • Pairing Code : $PAIRING_CODE"
    echo "  • Logs         : $INSTALL_DIR/agent.log"
    echo "=========================================================="
fi
`;

  return new NextResponse(script, {
    headers: {
      "Content-Type": "text/x-shellscript; charset=utf-8",
      "Content-Disposition": 'inline; filename="agent.sh"',
    },
  });
}

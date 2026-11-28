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
echo "    iLooks-Connect - Enterprise Client Agent Installer   "
echo "=========================================================="

if [ -z "$PAIRING_CODE" ]; then
    if [ -c /dev/tty ]; then
        read -p "Enter 6-digit Pairing Code shown on your portal: " PAIRING_CODE < /dev/tty
    fi
fi

if [ -z "$CAMERA_RTSP" ]; then
    if [ -c /dev/tty ]; then
        echo ""
        echo "Tip: You can attach your local camera RTSP feed right now."
        echo "Example: rtsp://admin:pass@192.168.1.100:554/Streaming/Channels/101"
        read -p "Enter Local Camera RTSP URL (or press Enter to scan via wizard): " CAMERA_RTSP < /dev/tty
        if [ -n "$CAMERA_RTSP" ]; then
            read -p "Enter Camera Name [Office Camera]: " INPUT_NAME < /dev/tty
            CAMERA_NAME="\${INPUT_NAME:-Office Camera}"
        fi
    fi
fi

echo ""
echo "--> Initializing iLooks-Connect directory: $INSTALL_DIR"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# Download latest agent engine
echo "--> Downloading core agent engine from $CLOUD_URL..."
curl -sSLk "$CLOUD_URL/agent.py" -o agent.py || true

# If portal returned HTML or 404, fallback to GitHub raw repository
if [ ! -s agent.py ] || grep -q "<!DOCTYPE" agent.py 2>/dev/null; then
    echo "--> Fetching agent core from repository mirror..."
    curl -sSLk "https://raw.githubusercontent.com/sainisoftravi/ilooks-camera/main/frontend/public/agent.py" -o agent.py
fi

# Check if Docker is available
if command -v docker &> /dev/null; then
    echo "--> Docker detected. Building local client container..."
    cat << 'EOF' > Dockerfile
FROM python:3.11-slim
ENV PYTHONUNBUFFERED=1
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg curl ca-certificates iproute2 && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir requests
# Install go2rtc (ultra-low-latency 5MB Go camera gateway with WebRTC & MSE)
RUN ARCH=$(dpkg --print-architecture 2>/dev/null || uname -m) && \
    if [ "$ARCH" = "amd64" ] || [ "$ARCH" = "x86_64" ]; then G2R_ARCH="linux_amd64"; else G2R_ARCH="linux_arm64"; fi && \
    curl -sSL -k "https://github.com/AlexxIT/go2rtc/releases/download/v1.9.4/go2rtc_${G2R_ARCH}" -o /usr/local/bin/go2rtc && \
    chmod +x /usr/local/bin/go2rtc
COPY agent.py .
EXPOSE 8090 1984 8556 8555
CMD ["python", "agent.py", "--port", "8090"]
EOF

    echo "--> Compiling local image with go2rtc, ONVIF & FFmpeg..."
    docker build -t ilook/edge-agent:latest . >/dev/null

    echo "--> Starting iLooks Agent with host networking (required for ONVIF UDP scan)..."
    docker rm -f ilook-edge 2>/dev/null || true
    
    DOCKER_ARGS=(
      -d
      --name ilook-edge
      --restart=always
      --network=host
      -e PAIRING_CODE="$PAIRING_CODE"
      -e CLOUD_URL="$CLOUD_URL"
      -e LOCAL_PORT="8090"
      -v "$INSTALL_DIR/data:/app/data"
      -v "$INSTALL_DIR/recordings:/app/recordings"
    )

    if [ -n "$CAMERA_RTSP" ]; then
      DOCKER_ARGS+=(-e CAMERA_RTSP="$CAMERA_RTSP" -e CAMERA_NAME="$CAMERA_NAME")
    fi

    docker run "\${DOCKER_ARGS[@]}" ilook/edge-agent:latest

    echo ""
    echo "=========================================================="
    echo "  [SUCCESS] iLooks-Connect Agent is Running in Background!"
    echo "  • Local Setup Wizard : http://localhost:8090"
    echo "  • Cloud Video Wall   : $CLOUD_URL/dashboard"
    echo "  • Pairing Code       : $PAIRING_CODE"
    echo "  • Local Recordings   : $INSTALL_DIR/recordings"
    echo "  • Container Name     : ilook-edge (docker logs -f ilook-edge)"
    echo "=========================================================="
else
    echo "--> Native Linux environment. Checking Python3, FFmpeg & go2rtc..."
    if ! command -v ffmpeg &> /dev/null; then
        echo "--> Installing FFmpeg and Python tools (requires sudo)..."
        sudo apt-get update && sudo apt-get install -y ffmpeg python3-pip python3-requests curl || true
    fi
    if ! command -v go2rtc &> /dev/null; then
        echo "--> Installing local go2rtc engine..."
        ARCH=$(dpkg --print-architecture 2>/dev/null || uname -m)
        if [ "$ARCH" = "amd64" ] || [ "$ARCH" = "x86_64" ]; then G2R_ARCH="linux_amd64"; else G2R_ARCH="linux_arm64"; fi
        sudo curl -sSL -k "https://github.com/AlexxIT/go2rtc/releases/download/v1.9.4/go2rtc_${G2R_ARCH}" -o /usr/local/bin/go2rtc && \
        sudo chmod +x /usr/local/bin/go2rtc || true
    fi
    pip3 install requests --quiet 2>/dev/null || pip install requests --quiet 2>/dev/null || true

    # Check if systemd is available and user has sudo to install background service
    if [ "$EUID" -eq 0 ] && command -v systemctl &> /dev/null; then
        echo "--> Installing systemd service (auto-start on boot)..."
        cat << EOF > /etc/systemd/system/ilooks-agent.service
[Unit]
Description=iLooks-Connect Client Agent & Local VMS
After=network.target

[Service]
Type=simple
User=$SUDO_USER
WorkingDirectory=$INSTALL_DIR
Environment="PAIRING_CODE=$PAIRING_CODE"
Environment="CLOUD_URL=$CLOUD_URL"
Environment="LOCAL_PORT=8090"
ExecStart=/usr/bin/python3 $INSTALL_DIR/agent.py --code "$PAIRING_CODE" --cloud "$CLOUD_URL" --port 8090
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
        systemctl daemon-reload
        systemctl enable --now ilooks-agent
        echo "--> Service registered: systemctl status ilooks-agent"
    else
        export CAMERA_RTSP="$CAMERA_RTSP"
        export CAMERA_NAME="$CAMERA_NAME"
        nohup python3 agent.py --code "$PAIRING_CODE" --cloud "$CLOUD_URL" --port 8090 > agent.log 2>&1 &
    fi

    echo ""
    echo "=========================================================="
    echo "  [SUCCESS] iLooks-Connect Agent is Running in Background!"
    echo "  • Local Setup Wizard : http://localhost:8090"
    echo "  • Cloud Video Wall   : $CLOUD_URL/dashboard"
    echo "  • Pairing Code       : $PAIRING_CODE"
    echo "  • Local Recordings   : $INSTALL_DIR/recordings"
    echo "  • Logs               : $INSTALL_DIR/agent.log"
    echo "=========================================================="
fi

# Try to open the setup wizard in local browser if display is present
if [ -n "$DISPLAY" ] && command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:8090" 2>/dev/null || true
fi
`;

  return new NextResponse(script, {
    headers: {
      "Content-Type": "text/x-shellscript; charset=utf-8",
      "Content-Disposition": 'inline; filename="install.sh"',
    },
  });
}

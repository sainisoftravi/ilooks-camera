import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const host = req.headers.get("host") || "ilooks.labstackops.top";
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const cloudUrl = `${proto}://${host}`;

  const psScript = `# iLook Edge Agent - Native Windows Installer (No Docker Required)
param (
    [string]$PairingCode = "",
    [string]$CameraRtsp = "",
    [string]$CameraName = "Office Camera"
)

$CloudUrl = "${cloudUrl}"
$InstallDir = Join-Path $HOME ".ilook-edge"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "    iLook Cloud Platform - Windows Edge Agent Setup      " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

if (-not $PairingCode) {
    $PairingCode = Read-Host "Enter 6-digit Pairing Code from your iLook dashboard"
}

if (-not $CameraRtsp) {
    Write-Host ""
    Write-Host "Tip: You can attach your local camera RTSP URL right now." -ForegroundColor Yellow
    Write-Host "Example: rtsp://admin:pass@192.168.1.100:554/Streaming/Channels/101" -ForegroundColor Gray
    $CameraRtsp = Read-Host "Enter Local Camera RTSP URL (press Enter to skip)"
    if ($CameraRtsp) {
        $inpName = Read-Host "Enter Camera Name [Office Camera]"
        if ($inpName) { $CameraName = $inpName }
    }
}

if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

$agentPyPath = Join-Path $InstallDir "agent.py"
Write-Host "--> Downloading edge agent engine from $CloudUrl..." -ForegroundColor Green
Invoke-WebRequest -Uri "$CloudUrl/api/v1/edge/download/agent.py" -OutFile $agentPyPath -UseBasicParsing

# Check if Docker is available on Windows
$hasDocker = $false
try {
    $dockerCheck = docker --version 2>$null
    if ($dockerCheck) { $hasDocker = $true }
} catch {}

if ($hasDocker) {
    Write-Host "--> Docker detected on Windows. Building local container..." -ForegroundColor Green
    $dockerfilePath = Join-Path $InstallDir "Dockerfile"
    @"
FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg curl ca-certificates iproute2 && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir requests
COPY agent.py .
CMD ["python", "agent.py"]
"@ | Set-Content -Path $dockerfilePath -Encoding UTF8

    Set-Location $InstallDir
    docker build -t ilook/edge-agent:latest .
    docker rm -f ilook-edge 2>$null

    $dockerArgs = @(
        "run", "-d",
        "--name", "ilook-edge",
        "--restart=always",
        "--network=host",
        "-e", "PAIRING_CODE=$PairingCode",
        "-e", "CLOUD_URL=$CloudUrl",
        "-v", "$InstallDir/data:/app/data"
    )
    if ($CameraRtsp) {
        $dockerArgs += @("-e", "CAMERA_RTSP=$CameraRtsp", "-e", "CAMERA_NAME=$CameraName")
    }
    $dockerArgs += "ilook/edge-agent:latest"

    & docker $dockerArgs
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "  [SUCCESS] iLook Edge Agent is Running in Windows Docker!" -ForegroundColor Green
    Write-Host "  • Server: $CloudUrl" -ForegroundColor Gray
    Write-Host "==========================================================" -ForegroundColor Green
} else {
    Write-Host "--> No Docker found. Running in Native Windows Mode (Python)..." -ForegroundColor Yellow
    $pythonCmd = $null
    if (Get-Command "python" -ErrorAction SilentlyContinue) { $pythonCmd = "python" }
    elseif (Get-Command "python3" -ErrorAction SilentlyContinue) { $pythonCmd = "python3" }
    elseif (Get-Command "py" -ErrorAction SilentlyContinue) { $pythonCmd = "py" }

    if (-not $pythonCmd) {
        Write-Host "[!] Python is not installed on this Windows PC." -ForegroundColor Red
        Write-Host "    Please install Python 3 (with 'Add python.exe to PATH' checked) from:" -ForegroundColor Yellow
        Write-Host "    https://www.python.org/downloads/windows/" -ForegroundColor Cyan
        Write-Host "    Or run in PowerShell: winget install Python.Python.3.11" -ForegroundColor Cyan
        exit 1
    }

    Write-Host "--> Installing required requests library..." -ForegroundColor Green
    & $pythonCmd -m pip install requests --quiet

    if ($CameraRtsp) {
        $env:CAMERA_RTSP = $CameraRtsp
        $env:CAMERA_NAME = $CameraName
    }

    Write-Host "--> Starting iLook Edge Agent..." -ForegroundColor Green
    $startArgs = @($agentPyPath, "--code", $PairingCode, "--cloud", $CloudUrl)
    if ($CameraRtsp) {
        $startArgs += @("--rtsp", $CameraRtsp, "--name", $CameraName)
    }

    Start-Process -FilePath $pythonCmd -ArgumentList $startArgs -WindowStyle Minimized

    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "  [SUCCESS] iLook Edge Agent is Running on Windows!" -ForegroundColor Green
    Write-Host "  • Local Web UI: http://localhost:8555" -ForegroundColor Cyan
    Write-Host "  • Cloud Portal: $CloudUrl/dashboard" -ForegroundColor Gray
    Write-Host "  • Pairing Code: $PairingCode" -ForegroundColor Gray
    if ($CameraRtsp) {
        Write-Host "  • Camera Feed: $CameraName ($CameraRtsp)" -ForegroundColor Gray
    }
    Write-Host "==========================================================" -ForegroundColor Green
}
`;

  return new NextResponse(psScript, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'inline; filename="install.ps1"',
    },
  });
}

# iLooks-Connect - Windows Client Agent Setup (Port 8090)
param (
    [string]$PairingCode = "",
    [string]$CameraRtsp = "",
    [string]$CameraName = "Office Camera"
)

$CloudUrl = "https://ilooks.labstackops.top"
$InstallDir = Join-Path $HOME ".ilook-edge"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   iLooks-Connect - Windows Client Agent & Local VMS     " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

if (-not $PairingCode) {
    $PairingCode = Read-Host "Enter 6-digit Pairing Code from your iLooks dashboard"
}

if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

$agentPyPath = Join-Path $InstallDir "agent.py"
Write-Host "--> Downloading iLooks-Connect engine from $CloudUrl..." -ForegroundColor Green
try {
    Invoke-WebRequest -Uri "$CloudUrl/agent.py" -OutFile $agentPyPath -UseBasicParsing
} catch {
    Invoke-WebRequest -Uri "$CloudUrl/api/v1/edge/download/agent.py" -OutFile $agentPyPath -UseBasicParsing
}

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
EXPOSE 8090
CMD ["python", "agent.py", "--port", "8090"]
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
        "-e", "LOCAL_PORT=8090",
        "-v", "$InstallDir/data:/app/data",
        "-v", "$InstallDir/recordings:/app/recordings"
    )
    if ($CameraRtsp) {
        $dockerArgs += @("-e", "CAMERA_RTSP=$CameraRtsp", "-e", "CAMERA_NAME=$CameraName")
    }
    $dockerArgs += "ilook/edge-agent:latest"

    & docker $dockerArgs
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "  [SUCCESS] iLooks-Connect is Running in Windows Docker!" -ForegroundColor Green
    Write-Host "  • Local Setup Wizard : http://localhost:8090" -ForegroundColor Cyan
    Write-Host "  • Cloud Video Wall   : $CloudUrl/dashboard" -ForegroundColor Gray
    Write-Host "==========================================================" -ForegroundColor Green
} else {
    Write-Host "--> Native Windows mode (Python). Checking runtime..." -ForegroundColor Yellow
    $pythonCmd = $null
    if (Get-Command "python" -ErrorAction SilentlyContinue) { $pythonCmd = "python" }
    elseif (Get-Command "python3" -ErrorAction SilentlyContinue) { $pythonCmd = "python3" }
    elseif (Get-Command "py" -ErrorAction SilentlyContinue) { $pythonCmd = "py" }

    if (-not $pythonCmd) {
        Write-Host "[!] Python 3 is not installed on this PC." -ForegroundColor Red
        Write-Host "    Installing Python via winget (takes ~30s)..." -ForegroundColor Yellow
        try {
            winget install Python.Python.3.11 --silent --accept-package-agreements --accept-source-agreements
            $pythonCmd = "python"
        } catch {
            Write-Host "Please download Python from: https://www.python.org/downloads/windows/" -ForegroundColor Cyan
            exit 1
        }
    }

    Write-Host "--> Installing requests library..." -ForegroundColor Green
    & $pythonCmd -m pip install requests --quiet 2>$null

    # Create Windows Startup shortcut so agent auto-starts on boot
    try {
        $wscriptShell = New-Object -ComObject WScript.Shell
        $startupFolder = [Environment]::GetFolderPath("Startup")
        $shortcut = $wscriptShell.CreateShortcut("$startupFolder\\iLooks-Agent.lnk")
        $shortcut.TargetPath = $pythonCmd
        $shortcut.Arguments = "$agentPyPath --code $PairingCode --cloud $CloudUrl --port 8090"
        $shortcut.WorkingDirectory = $InstallDir
        $shortcut.WindowStyle = 7 # Minimized
        $shortcut.Save()
        Write-Host "--> Windows Auto-Start registered (runs silently on PC boot)" -ForegroundColor Green
    } catch {}

    $startArgs = @($agentPyPath, "--code", $PairingCode, "--cloud", $CloudUrl, "--port", "8090")
    if ($CameraRtsp) {
        $startArgs += @("--rtsp", $CameraRtsp, "--name", $CameraName)
    }

    Start-Process -FilePath $pythonCmd -ArgumentList $startArgs -WindowStyle Minimized

    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "  [SUCCESS] iLooks-Connect is Running on Windows!" -ForegroundColor Green
    Write-Host "  • Local Setup Wizard : http://localhost:8090" -ForegroundColor Cyan
    Write-Host "  • Cloud Video Wall   : $CloudUrl/dashboard" -ForegroundColor Gray
    Write-Host "  • Auto-Start on Boot : Enabled" -ForegroundColor Gray
    Write-Host "==========================================================" -ForegroundColor Green
}

# Open the local setup wizard
Start-Process "http://localhost:8090"

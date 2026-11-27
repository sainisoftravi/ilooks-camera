# Multi-arch ARM64 (Raspberry Pi 4/5) & AMD64 Dockerfile for iLook Edge Agent
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    iproute2 \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONUNBUFFERED=1
ENV CLOUD_URL="https://ilook.labstackops.top"

# Host networking is required for ONVIF WS-Discovery UDP multicast packets
CMD ["python", "agent.py"]

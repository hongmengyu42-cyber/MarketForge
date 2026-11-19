#!/usr/bin/env bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════════
# MarketForge — Production Automated Deployment Script
# ═══════════════════════════════════════════════════════════════════

echo "🚀 [$(date +'%T')] Initializing MarketForge Production Deployment..."

# 1. Check for .env file
if [ ! -f .env ]; then
  echo "⚠️  .env file not found. Copying from .env.example..."
  cp .env.example .env
  echo "❗ Please review .env with actual production secrets before public launch."
fi

# 2. Check Docker availability
if ! command -v docker &> /dev/null; then
  echo "❌ Error: Docker is not installed or not in PATH."
  exit 1
fi

# 3. Build & start containers
echo "🔨 Building production images (backend & frontend)..."
docker compose build --pull

echo "📦 Starting MarketForge services in detached mode..."
docker compose up -d

echo "⏳ Waiting for services to reach healthy status..."
sleep 10

# 4. Healthcheck Verification
echo "🩺 Verifying container health..."
docker compose ps

echo "✨ MarketForge is now running!"
echo "   🌐 Frontend SPA & Reverse Proxy: http://localhost"
echo "   ⚙️  Backend API & Actuator:      http://localhost:8080/actuator/health"

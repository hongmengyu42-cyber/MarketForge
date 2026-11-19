#!/usr/bin/env bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════════
# MarketForge — Automated Database Backup Script
# Usage: ./scripts/backup-db.sh [BACKUP_DIR]
# ═══════════════════════════════════════════════════════════════════

BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/marketforge_${TIMESTAMP}.sql.gz"
CONTAINER_NAME="marketforge-mysql"
DB_NAME="${DB_NAME:-marketforge}"
DB_USER="${DB_USERNAME:-marketforge}"
DB_PASS="${DB_PASSWORD:-marketforge_secure_pw_2026}"

mkdir -p "${BACKUP_DIR}"

echo "📦 [$(date +'%T')] Starting automated MySQL backup for '${DB_NAME}'..."

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "❌ Error: Container '${CONTAINER_NAME}' is not running."
  exit 1
fi

docker exec "${CONTAINER_NAME}" mysqldump \
  -u"${DB_USER}" \
  -p"${DB_PASS}" \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  --default-character-set=utf8mb4 \
  "${DB_NAME}" | gzip -9 > "${BACKUP_FILE}"

FILESIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "✅ Backup successfully created at: ${BACKUP_FILE} (${FILESIZE})"

# Auto-prune backups older than 14 days
echo "🧹 Purging backups older than 14 days..."
find "${BACKUP_DIR}" -name "marketforge_*.sql.gz" -type f -mtime +14 -delete
echo "✨ Backup job completed successfully."

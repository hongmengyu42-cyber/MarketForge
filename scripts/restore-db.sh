#!/usr/bin/env bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════════
# MarketForge — Database Restore Script
# Usage: ./scripts/restore-db.sh <PATH_TO_BACKUP_FILE.sql.gz>
# ═══════════════════════════════════════════════════════════════════

if [ $# -lt 1 ]; then
  echo "Usage: $0 <path_to_backup.sql.gz>"
  exit 1
fi

BACKUP_FILE="$1"
CONTAINER_NAME="marketforge-mysql"
DB_NAME="${DB_NAME:-marketforge}"
DB_USER="${DB_USERNAME:-marketforge}"
DB_PASS="${DB_PASSWORD:-marketforge_secure_pw_2026}"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "❌ Error: File '${BACKUP_FILE}' not found."
  exit 1
fi

echo "⚠️  WARNING: This will overwrite the existing database '${DB_NAME}'."
read -p "Type 'yes' to proceed: " CONFIRM
if [ "${CONFIRM}" != "yes" ]; then
  echo "Restoration aborted."
  exit 0
fi

echo "📥 Restoring '${BACKUP_FILE}' into '${CONTAINER_NAME}'..."

if [[ "${BACKUP_FILE}" == *.gz ]]; then
  gunzip -c "${BACKUP_FILE}" | docker exec -i "${CONTAINER_NAME}" mysql -u"${DB_USER}" -p"${DB_PASS}" "${DB_NAME}"
else
  cat "${BACKUP_FILE}" | docker exec -i "${CONTAINER_NAME}" mysql -u"${DB_USER}" -p"${DB_PASS}" "${DB_NAME}"
fi

echo "✅ Database successfully restored from ${BACKUP_FILE}."

#!/bin/bash
# PrimePOS deployment script with backup
# Usage: ./deploy.sh [--no-deploy]  (--no-deploy = backup only, skip git/build/restart)

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Backup directory (create if missing)
BACKUP_DIR="${BACKUP_DIR:-$SCRIPT_DIR/backups}"
mkdir -p "$BACKUP_DIR"

# Timestamp: MM-DD-YYYY-HH-MM (e.g. 08-15-2026-23-30)
TIMESTAMP=$(date +%m-%d-%Y-%H-%M)
PREFIX="${TIMESTAMP}-primepos"
TAR_FILE="$BACKUP_DIR/${PREFIX}.tar.gz"
SQL_FILE="$BACKUP_DIR/${PREFIX}.sql"

echo "=== PrimePOS Backup & Deploy ==="
echo "Timestamp: $TIMESTAMP"
echo "Backup dir: $BACKUP_DIR"
echo ""

# Load .env for DATABASE_URL
if [ -f .env ]; then
  set -a
  source .env 2>/dev/null || true
  set +a
fi

# --- 1. Backup code ---
echo "[1/7] Backing up code to $TAR_FILE"
tar --exclude='node_modules' --exclude='dist' --exclude='.git' --exclude='backups' \
  --exclude='*.zip' --exclude='*.tar.gz' --exclude='*.sql' --exclude='.env' \
  --exclude='*.log' -czf "$TAR_FILE" .
echo "  Code backup: $TAR_FILE"

# --- 2. Backup database ---
if [ -n "$DATABASE_URL" ]; then
  echo "[2/7] Backing up database to $SQL_FILE"
  if pg_dump "$DATABASE_URL" -F p -f "$SQL_FILE" 2>/dev/null; then
    echo "  Database backup: $SQL_FILE"
  else
    echo "  WARNING: pg_dump failed (is PostgreSQL client installed?). Skipping DB backup."
    rm -f "$SQL_FILE"
  fi
else
  echo "[2/7] Skipping DB backup (DATABASE_URL not set)"
fi

# --- Check if deploy requested ---
if [ "$1" = "--no-deploy" ]; then
  echo ""
  echo "Backup complete. (--no-deploy: skipping deployment)"
  exit 0
fi

# --- 3. Git pull ---
echo ""
echo "[3/7] git pull"
git pull

# --- 4. npm install ---
echo "[4/7] npm install"
npm install

# --- 5. Build ---
echo "[5/7] npm run build"
npm run build

# --- 6. DB push ---
echo "[6/7] npm run db:push (--force for non-interactive)"
npx drizzle-kit push --force

# --- 7. PM2 restart ---
echo "[7/7] pm2 restart"
npm run pm2:restart

echo ""
echo "=== Deploy complete ==="
echo "Backups: $TAR_FILE, $SQL_FILE"

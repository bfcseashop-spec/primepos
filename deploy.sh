#!/bin/bash
# PrimePOS deployment script with backup
# Usage: ./deploy.sh [--no-deploy]  (--no-deploy = backup only, skip git/build/restart)

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Backup directory (create if missing, use fallback if not writable)
BACKUP_DIR="${BACKUP_DIR:-$SCRIPT_DIR/backups}"
mkdir -p "$BACKUP_DIR"
if ! touch "$BACKUP_DIR/.write-test" 2>/dev/null; then
  BACKUP_DIR="${HOME:-/tmp}/primepos-backups"
  mkdir -p "$BACKUP_DIR"
  echo "Note: Using $BACKUP_DIR (default backups dir not writable by current user)"
fi
rm -f "$BACKUP_DIR/.write-test" 2>/dev/null || true

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
echo "[1/8] Backing up code to $TAR_FILE"
tar --exclude='node_modules' --exclude='dist' --exclude='.git' --exclude='backups' \
  --exclude='*.zip' --exclude='*.tar.gz' --exclude='*.sql' --exclude='.env' \
  --exclude='*.log' -czf "$TAR_FILE" .
echo "  Code backup: $TAR_FILE"

# --- 2. Backup database ---
if [ -n "$DATABASE_URL" ]; then
  echo "[2/8] Backing up database to $SQL_FILE"
  if command -v pg_dump >/dev/null 2>&1; then
    if pg_dump "$DATABASE_URL" -F p -f "$SQL_FILE" 2>"$BACKUP_DIR/.pg_dump_err"; then
      echo "  Database backup: $SQL_FILE"
      rm -f "$BACKUP_DIR/.pg_dump_err"
    else
      echo "  WARNING: pg_dump failed. Skipping DB backup."
      [ -s "$BACKUP_DIR/.pg_dump_err" ] && echo "  Error: $(cat "$BACKUP_DIR/.pg_dump_err")"
      if grep -q "1234@localhost\|could not translate host" "$BACKUP_DIR/.pg_dump_err" 2>/dev/null; then
        echo ""
        echo "  Hint: Password contains @ which breaks the URL. Edit .env and encode @ as %40:"
        echo "    Primepos@1234  ->  Primepos%401234"
        echo "  Example: DATABASE_URL=postgresql://primepos_user:Primepos%401234@localhost:5432/primepos_db"
        echo ""
      fi
      rm -f "$SQL_FILE" "$BACKUP_DIR/.pg_dump_err"
    fi
  else
    echo "  WARNING: pg_dump not found. Install with: apt install postgresql-client"
    echo "  Skipping DB backup."
  fi
else
  echo "[2/8] Skipping DB backup (DATABASE_URL not set)"
fi

# --- Check if deploy requested ---
if [ "$1" = "--no-deploy" ]; then
  echo ""
  echo "Backup complete. (--no-deploy: skipping deployment)"
  exit 0
fi

# --- 3. Git pull ---
echo ""
echo "[3/8] git pull"
git pull

# --- 4. Clean caches and old build ---
echo "[4/8] Cleaning caches and dist"
rm -rf dist
rm -rf node_modules/.cache
rm -rf client/node_modules/.cache
npm cache clean --force 2>/dev/null || true

# --- 5. npm install ---
echo "[5/8] npm install"
npm install

# --- 6. Build ---
echo "[6/8] npm run build"
npm run build

# --- 7. DB push ---
# Session table is in schema so it is not dropped; sessions persist if SESSION_SECRET is set in .env (see .env.example).
echo "[7/8] npm run db:push (--force for non-interactive)"
npx drizzle-kit push --force

# --- 7b. Due management migration (ensures due_payments tables exist) ---
if [ -f "scripts/run-due-migration.js" ] && [ -f "migrations/0001_due_management.sql" ]; then
  echo "[7b/8] Running due management migration..."
  node scripts/run-due-migration.js || echo "  (migration skipped or already applied)"
fi

# --- 8. PM2 restart (full restart, no cache) ---
echo "[8/8] pm2 restart"
pm2 restart primepos --update-env 2>/dev/null || npm run pm2:restart

echo ""
echo "=== Deploy complete ==="
echo "Backups: $TAR_FILE, $SQL_FILE"

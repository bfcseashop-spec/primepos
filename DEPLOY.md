# PrimePOS Deployment

## Quick Deploy (with backup)

```bash
chmod +x deploy.sh   # one-time: make executable
sudo ./deploy.sh
# or
sudo npm run deploy
```

## Backup only (no git pull / build / restart)

```bash
./deploy.sh --no-deploy
# or
npm run deploy:backup-only
```

## Output files

Backups are stored in `backups/` with timestamped names:

- `08-15-2026-23-30-primepos.zip` - Code snapshot (excludes node_modules, dist, .git)
- `08-15-2026-23-30-primepos.sql` - Database dump (PostgreSQL)

## Requirements

- `zip` - for code backup
- `pg_dump` - for database backup (PostgreSQL client tools)
- `DATABASE_URL` in `.env` - for database backup

To install PostgreSQL client tools on Ubuntu: `apt install postgresql-client`

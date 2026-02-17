# PrimePOS Deployment

## Quick Deploy (with backup)

```bash
# Option A: via npm (works even if chmod not set)
sudo npm run deploy

# Option B: direct (run with bash to avoid CRLF issues)
bash deploy.sh
# or with sudo:
sudo bash deploy.sh
```

## Backup only (no git pull / build / restart)

```bash
bash deploy.sh --no-deploy
# or
npm run deploy:backup-only
```

## Output files

Backups are stored in `backups/` with timestamped names:

- `08-15-2026-23-30-primepos.tar.gz` - Code snapshot (excludes node_modules, dist, .git)
- `08-15-2026-23-30-primepos.sql` - Database dump (PostgreSQL)

## Requirements

- `tar` - for code backup (built-in on Linux)
- `pg_dump` - for database backup (PostgreSQL client tools)
- `DATABASE_URL` in `.env` - for database backup

To install PostgreSQL client tools on Ubuntu: `apt install postgresql-client`

## Troubleshooting

**"Permission denied" or "command not found" when running ./deploy.sh**

Use `bash deploy.sh` or `sudo bash deploy.sh` instead—invoking `bash` directly avoids issues from file permissions or Windows line endings (CRLF).

**To fix line endings in repo** (so `./deploy.sh` works after `chmod +x`):

```bash
git add --renormalize .
git commit -m "Fix line endings for deploy.sh"
git push
```

Then on server: `git pull` and `chmod +x deploy.sh`; `./deploy.sh` will work.

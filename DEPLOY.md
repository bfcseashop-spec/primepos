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

## Session persistence across deployments

To keep users logged in after deployment:

1. **Set `SESSION_SECRET` in `.env`** on the server and **never change it**. If it is missing or changes, all sessions are invalidated and users must log in again. Example in `/var/www/primepos/.env`:

   ```
   SESSION_SECRET=your-stable-secret-at-least-32-chars
   ```

2. The **session table** is included in the app schema so `npm run db:push` does not drop it during deploy. Sessions are stored in PostgreSQL; as long as `SESSION_SECRET` is stable, logins survive restarts and deployments.

## Requirements

- `tar` - for code backup (built-in on Linux)
- `pg_dump` - for database backup (PostgreSQL client tools)
- `DATABASE_URL` in `.env` - for database backup

To enable database backups:

1. Install the PostgreSQL client: `sudo apt install postgresql-client`
2. **If pg_dump fails** with "1234@localhost" or "could not translate host": the `@` in your password breaks the URL. Edit `.env` on the server and encode `@` as `%40`:
   ```bash
   # On the server:
   nano /var/www/primepos/.env
   # Change: Primepos@1234  ->  Primepos%401234
   ```
   Example line:
   ```
   DATABASE_URL=postgresql://primepos_user:Primepos%401234@localhost:5432/primepos_db
   ```

## Troubleshooting

**Backend not picking up new routes/schema after deploy**

The deploy uses `pm2 delete` + `pm2 start` (not just restart) to force a fresh Node process that loads the new `dist/index.cjs`. If you still see old behavior:

1. **Run deploy as the PM2 owner** – PM2 processes are per-user. If you use `sudo ./deploy.sh` but PM2 was started by `admin93`, run instead:
   ```bash
   sudo -u admin93 bash deploy.sh
   ```
   Or run without sudo: `bash deploy.sh` (as the user that owns PM2).

2. **Verify dist was rebuilt** – After deploy, check: `ls -la /var/www/primepos/dist/index.cjs` (timestamp should be recent).

3. **Manual PM2 refresh** – From the project directory:
   ```bash
   pm2 delete primepos
   pm2 start ecosystem.config.cjs
   pm2 save
   ```

**"Permission denied" when writing to backups/**

If backups were created by root (from a previous `sudo` run), run once:
```bash
sudo chown -R $USER:$USER /var/www/primepos/backups
```
Or the script will automatically use `~/primepos-backups` as fallback.

**"Permission denied" or "command not found" when running ./deploy.sh**

Use `bash deploy.sh` or `sudo bash deploy.sh` instead—invoking `bash` directly avoids issues from file permissions or Windows line endings (CRLF).

**To fix line endings in repo** (so `./deploy.sh` works after `chmod +x`):

```bash
git add --renormalize .
git commit -m "Fix line endings for deploy.sh"
git push
```

Then on server: `git pull` and `chmod +x deploy.sh`; `./deploy.sh` will work.

**"Error Not found" or 404 on Due Management / API pages**

If you see 404s for API requests (e.g. `/api/dues`, `/api/bills`, `/api/medicines`) while the app loads:

1. **Reverse proxy must forward all `/api/*`** to the Node app. Nginx/Caddy/Cloudflare Tunnel should proxy the entire path, e.g. `location / { proxy_pass http://127.0.0.1:5010; }` so `/api/dues`, `/api/bills`, etc. reach the server.
2. **Cloudflare**: Ensure WebSockets are On (Network) and no Page Rules block API paths.
3. **Verify**: `curl -I https://pos.primeclinic24.com/api/dues` (with session cookie) should return 200 or 401, not 404.
4. **Custom API base**: If the API is on a different origin, set `VITE_API_BASE` at build time (e.g. `VITE_API_BASE=https://api.example.com npm run build`). All API requests use absolute URLs via `getApiUrl()`.

**404s for `e.css`, `exex`, or other odd paths**

These often come from browser extensions (e.g. React DevTools, ad blockers) or third-party scripts, not from the app. Try in an incognito window or with extensions disabled. The app does not request these paths.

**Split payment / payment_splits column**

If you use manual migrations instead of `drizzle-kit push`, run `psql $DATABASE_URL -f migrations/0002_bills_payment_splits.sql` to add the `payment_splits` column to bills.

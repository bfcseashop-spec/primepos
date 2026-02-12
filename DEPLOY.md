# PrimePOS Deployment Guide

Deploy PrimePOS with **Cloudflare Tunnel (cloudflared)** and **pos.primeclinic24.com**, with optional **GitHub Actions** auto-deploy.

## Prerequisites

- Ubuntu server (e.g. VPS) with Node.js 20+ and git
- Cloudflare Tunnel (cloudflared) already configured on the server
- PostgreSQL database (local or managed)
- GitHub repo: `https://github.com/bfcseashop-spec/primepos`

---

## 1. Server setup (one-time)

### 1.1 Create app directory with correct ownership

```bash
# Create directory (if not exists)
sudo mkdir -p /var/www/primepos
# Give your user ownership so git clone/pull works without sudo
sudo chown -R $USER:$USER /var/www/primepos
cd /var/www/primepos
```

### 1.2 Clone the repository

```bash
git clone https://github.com/bfcseashop-spec/primepos.git .
```

### 1.3 Environment variables

Create `/var/www/primepos/.env`:

```bash
# Required: PostgreSQL connection string
DATABASE_URL=postgresql://user:password@localhost:5432/primepos

# Port for this app (must match cloudflared ingress)
PORT=5010

# Optional: session secret for express-session (generate with: openssl rand -hex 32)
# SESSION_SECRET=your-secret-here
```

### 1.4 Database

Ensure the PostgreSQL database and user exist, then push schema:

```bash
cd /var/www/primepos
npm install
npm run db:push
```

### 1.5 Build and run (manual test)

```bash
npm run build
npm run start
# App should be at http://localhost:5010
```

---

## 2. Cloudflared: expose pos.primeclinic24.com

Add this ingress rule to your existing cloudflared config (e.g. `/etc/cloudflared/config.yml`), then restart cloudflared.

```yaml
  - hostname: pos.primeclinic24.com
    service: http://localhost:5010
```

**Full example** (snippet only; keep your other hostnames):

```yaml
ingress:
  # ... your existing rules (vps.bfcpos.com, primeclinic24.com, etc.) ...
  - hostname: pos.primeclinic24.com
    service: http://localhost:5010
  - service: http_status:404
```

Then:

```bash
sudo systemctl restart cloudflared
```

In Cloudflare DNS, add a CNAME for `pos.primeclinic24.com` pointing to your tunnel hostname (e.g. `1c45aa89-47e5-4bdc-97e2-cf29f39115b2.cfargotunnel.com` or the FQDN shown in Zero Trust Dashboard).

---

## 3. Run as a service (PM2 recommended)

### Option A: PM2

```bash
sudo npm install -g pm2
cd /var/www/primepos
pm2 start dist/index.cjs --name primepos --env production
pm2 save
pm2 startup   # follow the command it prints to enable on boot
```

Use an ecosystem file so `PORT` and `DATABASE_URL` are set:

```bash
# /var/www/primepos/ecosystem.config.cjs
module.exports = {
  apps: [{
    name: 'primepos',
    script: 'dist/index.cjs',
    cwd: '/var/www/primepos',
    env: { NODE_ENV: 'production' },
    env_file: '.env',
    instances: 1,
    autorestart: true,
  }],
};
```

Then:

```bash
pm2 start ecosystem.config.cjs
pm2 save && pm2 startup
```

### Option B: systemd

Create `/etc/systemd/system/primepos.service`:

```ini
[Unit]
Description=PrimePOS Node app
After=network.target postgresql.service

[Service]
Type=simple
User=admin93
WorkingDirectory=/var/www/primepos
EnvironmentFile=/var/www/primepos/.env
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/index.cjs
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable primepos
sudo systemctl start primepos
sudo systemctl status primepos
```

---

## 4. GitHub Actions auto-deploy

The repo includes a workflow that SSHs into your server, pulls the latest code, installs deps, builds, and restarts the app.

### 4.1 GitHub secrets

In the GitHub repo: **Settings → Secrets and variables → Actions**, add:

| Secret name       | Description                          |
|-------------------|--------------------------------------|
| `DEPLOY_HOST`     | SSH host (e.g. `ssh.bfcpos.com`)     |
| `DEPLOY_USER`     | SSH user (e.g. `admin93`)             |
| `DEPLOY_PASSWORD` | SSH password (prefer SSH key; see below) |

### 4.2 SSH key (recommended)

1. On your **local machine** (or a deploy runner), generate a key:
   ```bash
   ssh-keygen -t ed25519 -C "github-actions-primepos" -f primepos_deploy_key -N ""
   ```
2. Add the **private** key to GitHub Actions secrets as `SSH_PRIVATE_KEY`.
3. On the **server**, add the **public** key to `~/.ssh/authorized_keys` for the deploy user.
4. In the workflow, the job uses `SSH_PRIVATE_KEY` and connects without a password.

If you use **Cloudflare Access** for SSH (`ssh.bfcpos.com`), ensure the deploy key is allowed to connect (e.g. allow the GitHub Actions IP or use an Access policy that allows non-browser SSH). Otherwise use the server’s direct IP/hostname and open SSH only for the deploy key.

### 4.3 Triggering deploys

- **Push to `main`**: workflow runs and deploys to the server.
- Or run the workflow manually: **Actions → Deploy PrimePOS → Run workflow**.

### 4.4 What the workflow does

1. Checkout repo
2. SSH to `DEPLOY_HOST` as `DEPLOY_USER`
3. `cd /var/www/primepos && git pull && npm ci && npm run build`
4. Restart the app:
   - If **PM2** is used: `pm2 restart primepos`
   - Else if **systemd** is used: `sudo systemctl restart primepos`
   - Otherwise the workflow runs `pkill -f "node dist/index.cjs"` and starts the app in the background (fallback)

Ensure one of PM2 or systemd is set up so restarts are reliable.

---

## 5. Checklist

- [ ] `/var/www/primepos` exists and is owned by deploy user
- [ ] Repo cloned in `/var/www/primepos`
- [ ] `.env` has `DATABASE_URL` and `PORT=5010`
- [ ] Database created and `npm run db:push` run
- [ ] `npm run build` and `npm run start` work locally on the server
- [ ] **On the server:** `curl -s http://localhost:5010/api/health` returns `{"status":"ok",...}` (not HTML)
- [ ] **In the browser:** `https://pos.primeclinic24.com/api/health` returns JSON (if you see the app UI, the tunnel is not sending traffic to Node)
- [ ] Cloudflared config includes `pos.primeclinic24.com` → `http://localhost:5010`
- [ ] DNS CNAME for `pos.primeclinic24.com` points to the tunnel
- [ ] App run by PM2 with `ecosystem.config.cjs` (so `start.cjs` loads `.env`)
- [ ] GitHub secrets set (and SSH key if used)
- [ ] After push to `main`, Actions run and app restarts

---

## 6. Troubleshooting

### "API returned a web page" / "Unexpected token '<'" / Settings or APIs not working

This means the browser is getting **HTML** (the app’s index.html) instead of **JSON** from `/api/settings` (and other APIs). The request is **not** reaching the Node app.

**On the VPS, run:**

```bash
curl -s http://localhost:5010/api/health
```

- If you see **`{"status":"ok","timestamp":"..."}`** → Node is fine. The problem is **how traffic reaches the server** (see below).
- If you see **HTML** or **connection refused** → Node is not running or not on 5010. Run `pm2 list`, `pm2 restart primepos`, and ensure `PORT=5010` and the app is started with `start.cjs` (e.g. `pm2 start ecosystem.config.cjs`).

**Then in the browser open:** `https://pos.primeclinic24.com/api/health`

- If you see **JSON** → APIs are reaching Node; the issue may be limited to one endpoint.
- If you see **the ClinicPOS login page (HTML)** → Your **hostname is not pointing at the Node app**. Only the Node process should serve `pos.primeclinic24.com`. Do **not** point the same hostname to nginx/caddy that serves `dist/public` for all paths. Fix: Cloudflared (or your proxy) must send **all** traffic for `pos.primeclinic24.com` to `http://localhost:5010` with **no** other server in front serving the SPA for that host.

**Checklist:** (1) Cloudflared config: single ingress `pos.primeclinic24.com` → `http://localhost:5010`. (2) No nginx/caddy serving the same hostname. (3) `pm2 start ecosystem.config.cjs` and after deploy: `npm run build && pm2 restart primepos`.

---

| Issue | Check |
|-------|--------|
| 502 from pos.primeclinic24.com | App listening on 5010? `curl http://localhost:5010` on server. |
| **APIs return index.html / “All APIs not working” on VPS** | See **“API returned a web page”** section above. |
| **"Session error" on login** | Login returns 500 and "Session error" when the session store (Postgres) fails to save. On the VPS run `pm2 logs primepos --lines 30` and look for `Session save error on login:` — the next line shows the real error (e.g. connection refused, permission denied, table missing). Fix: (1) Ensure `DATABASE_URL` in `.env` is correct and the database is running. (2) Ensure the DB user can create tables; the app uses `connect-pg-simple` with `createTableIfMissing: true` and table name `session`. (3) If the `session` table was created by another app with different schema, drop it and restart so this app can recreate it: `psql $DATABASE_URL -c 'DROP TABLE IF EXISTS session;'` then `pm2 restart primepos`. |
| Permission denied in /var/www/primepos | `sudo chown -R $USER:$USER /var/www/primepos` |
| DATABASE_URL must be set | Create `/var/www/primepos/.env` with `DATABASE_URL=...`; use `start.cjs` (via ecosystem) so `.env` is loaded. |
| Build fails on server | `node -v` (need 20+), `npm ci` and `npm run build` |
| Deploy workflow fails on SSH | Check `DEPLOY_HOST`, `DEPLOY_USER`, and key or password. If using Cloudflare Access for SSH, ensure the runner can authenticate (e.g. allow SSH key auth in Access). |

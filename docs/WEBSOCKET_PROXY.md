# WebSocket proxy configuration (Nginx / reverse proxy)

If the PrimePOS app is behind a reverse proxy (Nginx, Caddy, Cloudflare, etc.), the proxy **must** upgrade WebSocket connections for these paths:

- `/ws/notifications`
- `/ws/patient-monitor`

Otherwise the browser gets an HTTP response instead of a WebSocket handshake, which causes:

- **`WebSocket connection to 'wss://...' failed: Invalid frame header`** — proxy returned HTTP (e.g. 404 or HTML) instead of upgrading.
- **`WebSocket connection to 'wss://...' failed:`** — connection closed before the WebSocket handshake completed.

---

## Cloudflare Tunnel only (e.g. pos.primeclinic24.com → localhost:5010)

If you expose PrimePOS **only** via Cloudflare Tunnel (cloudflared) with no Nginx in front — e.g. `pos.primeclinic24.com` → `http://localhost:5010` in `config.yml` — then:

1. **Enable WebSockets in Cloudflare**
   - Cloudflare Dashboard → select the domain (e.g. primeclinic24.com) → **Network**.
   - Set **WebSockets** to **On**.
   - Save. The tunnel (cloudflared) will pass WebSocket traffic through; the edge must have WebSockets enabled or the handshake fails.

2. **No Nginx or extra config on the server**
   - The app listens on 5010 and handles WebSocket on the same port; cloudflared forwards everything to it. No Nginx needed for this path.

3. **Restart not required**
   - Changing the setting in the dashboard takes effect quickly; no need to restart cloudflared or PM2.

If WebSockets are **Off** at the Cloudflare edge, you will see `Invalid frame header` or connection failures for `wss://pos.primeclinic24.com/ws/notifications` and `wss://pos.primeclinic24.com/ws/patient-monitor`.

---

## Nginx

Add a `location` block for the WebSocket path and proxy to your Node app with upgrade headers. Example for `pos.primeclinic24.com`:

```nginx
# Upstream for PrimePOS (default port 5010 per ecosystem.config.cjs)
upstream primepos {
    server 127.0.0.1:5010;
    keepalive 64;
}

server {
    listen 443 ssl http2;
    server_name pos.primeclinic24.com;

    # SSL configuration...
    # ssl_certificate ...;
    # ssl_certificate_key ...;

    # WebSocket: must be defined BEFORE the general / proxy so it takes precedence
    location /ws/ {
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_pass http://primepos;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # Rest of your app (API + static)
    location / {
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_pass http://primepos;
    }
}
```

After editing:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## Caddy

Use a `reverse_proxy` with header upgrade. Example:

```caddy
pos.primeclinic24.com {
    reverse_proxy /ws/* 127.0.0.1:5010 {
        header_up X-Forwarded-Proto {scheme}
        header_up X-Forwarded-For {remote_host}
        header_up Host {host}
    }
    reverse_proxy 127.0.0.1:5010
}
```

Caddy normally handles WebSocket upgrade automatically; ensure the WebSocket path is included in the proxy.

## Cloudflare

If you use Cloudflare in front of Nginx:

1. In the Cloudflare dashboard, go to **Network** and ensure **WebSockets** is **On**.
2. Keep the Nginx (or other origin) WebSocket configuration above so the connection is upgraded from Cloudflare to your server.

## Verify

1. Open the Patient Monitor page: `https://pos.primeclinic24.com` (and go to Patient Monitor).
2. Open DevTools → Console. You should see no WebSocket errors.
3. The status above the content should show **Connected** (or similar) for real-time updates instead of "Reconnecting...".

If errors persist, check that:

- The app is listening on the port used in `proxy_pass`.
- No other proxy or firewall is stripping `Upgrade` / `Connection` headers.
- SSL is terminated at the proxy and the app sees the correct `X-Forwarded-Proto` if it needs it.

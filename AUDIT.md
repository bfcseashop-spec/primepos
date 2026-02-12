# PrimePOS – Backend, API, Frontend & Auth Audit

This document summarizes the verification of backend, APIs, frontend, and authentication as of the last deep check.

---

## 1. Backend

| Area | Status | Notes |
|------|--------|--------|
| **Entry** | OK | `server/index.ts` – express, session, `registerRoutes`, then error handler, then `serveStatic` (prod) or Vite (dev). |
| **Env** | OK | `import "dotenv/config"` in index; `start.cjs` loads `.env` from project root before requiring `dist/index.cjs` (PM2). |
| **DB** | OK | `db.ts` uses `DATABASE_URL`; throws if missing. Pool and Drizzle schema exported. |
| **Session** | OK | `express-session` + `connect-pg-simple` (Postgres store), `createTableIfMissing: true`, cookie `path: "/"`, `secure` in production, `sameSite: "lax"`. |
| **Trust proxy** | OK | `app.set("trust proxy", true)` for correct `req.secure` behind Cloudflare/reverse proxy. |
| **Static / SPA** | OK | `static.ts`: serves `dist/public`, then fallback. Fallback checks `req.path.startsWith("/api")` and returns 404 JSON (never serves HTML for `/api/*`). |
| **Seed** | OK | Runs on startup; exits early if patients count > 0 (no duplicate seed). |

---

## 2. API Routes

| Area | Status | Notes |
|------|--------|--------|
| **Order** | OK | Public first: `GET /api/health`, `POST/GET /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/change-password` (with requireAuth), then `GET /api/services|medicines|expenses/sample-template`. Then `app.use("/api", requireAuth)`; all other routes after. |
| **Auth** | OK | `requireAuth` checks `req.session.userId`; returns 401 JSON if missing. |
| **404** | OK | End of `registerRoutes`: `app.use("/api", (_req, res) => res.status(404).json({ message: "Not found" }))` for unmatched `/api` paths. |
| **Logout cookie** | OK | `clearCookie("connect.sid", { path: "/", httpOnly: true, secure: isProduction, sameSite: "lax" })`. |
| **Uploads** | OK | `/uploads/patient-photos`, `/uploads/doctor-photos`, `/uploads/logos`, `/uploads/salary` served with `express.static`; not under `/api`, so not protected by requireAuth (by design for receipt/UI assets). |
| **Excel** | OK | Sample templates and exports use `XLSX.write(..., { type: "array", bookType: "xlsx" })`, `Buffer.from(raw)`, and `Content-Length`. |
| **Lab reports** | OK | `GET /api/lab-tests/reports/:filename` serves file from `uploadsDir`; `GET /api/lab-tests/next-code` registered before `:id` routes. |

All listed route groups (dashboard, patients, bills, services, medicines, expenses, bank, investments, users, roles, integrations, settings, activity-logs, reports, lab-tests, appointments, doctors, salaries, salary-profiles, salary-loans, loan-installments, payroll-runs, payslips) have corresponding handlers and use `storage` methods that exist in `storage.ts`.

---

## 3. Frontend

| Area | Status | Notes |
|------|--------|--------|
| **Credentials** | OK | `apiRequest` and default `queryFn` (getQueryFn) use `credentials: "include"`. All direct `fetch` calls (auth/me, recheck, upload-logo, upload-photo, import, next-code, next-id, loan-installments, payslips) use `credentials: "include"`. |
| **Downloads** | OK | Services, medicines, expenses use `downloadFile()` (fetch + blob + `<a>` download) for sample templates and exports; no `window.open` to API URLs. |
| **401 handling** | OK | `throwIfResNotOk` and getQueryFn on 401: remove `clinicpos_user`, dispatch `clinicpos_logout_redirect`. App listens and clears user + queryClient. |
| **Query keys** | OK | All `queryKey` values align with server paths (e.g. `["/api/settings"]`, `["/api/dashboard/stats"]`). Invalidations use `["/api/dashboard"]` to refresh all dashboard-related queries (partial match). |
| **Settings** | OK | Application Metadata, Clinic Info, ID Prefixes, and Company Details use controlled state synced from `GET /api/settings`; save via `PUT /api/settings`. Logo upload uses response with `setQueryData` for immediate UI update. |
| **Billing** | OK | Clinic name, email, currency, logo, prefixes from settings; no hardcoded “Prime Clinic” / “info@primeclinic.com” in logic; display fallbacks only where needed for copy. |
| **Sidebar** | OK | App name, tagline, logo from `GET /api/settings`. |

---

## 4. Auth Flow

| Step | Status | Notes |
|------|--------|--------|
| **Login** | OK | `POST /api/auth/login` validates user, sets `req.session`, saves session, returns user + role. Cookie set by express-session. |
| **Me** | OK | `GET /api/auth/me` returns 401 if no session; otherwise user + role. Defined before requireAuth. |
| **Restore** | OK | On load, if `/api/auth/me` fails, client restores from `clinicpos_user` (id + username), then rechecks `/api/auth/me`; if 401, clears storage and user. |
| **Post-login** | OK | `handleLogin` calls `queryClient.invalidateQueries()` so subsequent requests use the new session cookie. |
| **Logout** | OK | `POST /api/auth/logout` destroys session and clears cookie with same options as set; client clears user and queryClient. |
| **Protected routes** | OK | All `/api/*` except health, auth, and sample-templates go through requireAuth after the public block. |

---

## 5. Deployment Checklist (recap)

- Run app with `start.cjs` (e.g. via `ecosystem.config.cjs`) so `.env` is loaded.
- Set `NODE_ENV=production`, `PORT`, `DATABASE_URL`, and optionally `SESSION_SECRET`.
- Ensure only the Node app receives traffic for the app hostname (no other server serving the same host and returning HTML for `/api`).
- After deploy: `curl -s http://localhost:PORT/api/health` and `https://your-domain/api/health` should return JSON.

---

*Last audit: full pass over server/index, server/routes, server/static, server/db, server/seed, server/storage, client App, queryClient, and all pages that call APIs or use settings.*

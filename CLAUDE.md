# NetPilot

NetPilot — Network diagnostics for Service Desk agents.

## Architecture

- **`app/`** — static web UI (HTML/CSS/JS, no framework, no build step). Served by
  Vercel as the site root.
- **`api/`** — Vercel Serverless Functions (Node, built-ins only, no npm deps):
  - `diagnose.js` — `GET /api/diagnose?target=…`; real DNS/TCP/HTTPS/TLS checks.
  - `tickets.js` — `GET` lists the shared queue, `POST` diagnoses + stores a ticket.
  - `_diagnostics.js` — shared diagnostics engine (underscore = not a route).
  - `_store.js` — Upstash Redis store over the REST API via `fetch`.
- **`main.js` + electron-builder** — optional desktop shell (not deployed on Vercel).

## Key constraints

- **Real diagnostics on Vercel are TCP-based**, not ICMP. Vercel's runtime can't
  open raw sockets, so there is **no `ping`/`traceroute`**; a TCP connect is the
  reachability test. Internal-LAN (switch/AP hop-chain) diagnostics are impossible
  from a cloud function and stay mock.
- **Shared ticket queue needs Upstash Redis.** The API reads `UPSTASH_REDIS_REST_URL`
  /`UPSTASH_REDIS_REST_TOKEN` or `KV_REST_API_URL`/`KV_REST_API_TOKEN`. Env vars only
  reach a deployment built *after* the store is connected — **redeploy** after
  connecting. Until configured, `/api/tickets` returns `503` and the UI is demo-only.
- **No npm dependencies in `api/`** — keep it that way (avoids reinstalling
  electron on Vercel and keeps `installCommand` skippable in `vercel.json`).
- **Deployment Protection** (Vercel Authentication) is on by default → `401` for
  anyone not logged into the Vercel account. Disable it for team access.
- **User-entered ticket fields are escaped on render** (`escapeHtml` in `app.js`);
  keep that when adding fields.

## Local dev

- UI only: `cd app && python3 -m http.server 8080` (no `/api` backend).
- Full stack (with API): `npx vercel dev`.

## Workflow preferences

- **Git: push directly to `main`.** Commit and push work straight to `main` for
  this project — no feature branch required.

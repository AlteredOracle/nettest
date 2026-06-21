# NetPilot

**Network diagnostics for Tier 1/2 Service Desk agents.**

NetPilot runs a full diagnostic sweep the moment a network ticket comes in and hands the agent a plain-English root cause — no network expertise required.

## Features

**Live diagnostics (real):**

- **Live network check** — real DNS, TCP reachability, HTTPS response & TLS certificate checks against any host/IP/URL (`⚡ Live check`)
- **Ticket intake** — file a ticket with a target; it's auto-diagnosed and saved to a shared team queue (`+ New ticket`)
- **Resolve / reopen / delete** tickets, **filter** the queue by All / Open / Resolved, and **auto-refresh** (every 15s) so the shared queue stays current
- **Plain-English verdict** — every check produces a root cause + red/amber/green grid

**Demo scenarios (mock data):**

- **Topology hop chain** — visual path from user → AP → switch → core → WAN with faulted hops shown in red
- **Similar past tickets** — pattern matching with resolutions
- **Other affected users** — storm/outage detection
- **Port event history** — full event log overlay for any switch port

## Live network check (real diagnostics)

Click **⚡ Live check** in the ticket queue header to run **real** diagnostics
against any hostname, IP, or URL. A Vercel Serverless Function (`api/diagnose.js`)
performs live:

- **DNS resolution** — real lookup + timing
- **TCP connect (:443 / :80)** — real reachability + latency (used in place of ICMP ping)
- **HTTPS response** — real status code + response time
- **TLS certificate** — real validity / expiry check

> ICMP `ping` and `traceroute` need raw sockets, which Vercel's runtime does not
> allow — so a TCP connect is used as the reachability test. Internal LAN
> switch/AP diagnostics (the hop chain) remain mock, since a cloud function
> can't see your local network.

The endpoint also works directly: `GET /api/diagnose?target=example.com`.

## Ticket intake (shared queue)

Click **+ New ticket** (top bar) to file a ticket: describe the problem and give
a target (host / IP / URL). On submit, NetPilot runs the real diagnostics, attaches
a plain-English verdict, and saves the ticket to a **shared queue** every agent sees.

API:

- `GET    /api/tickets` — list tickets (newest first)
- `POST   /api/tickets` — `{ title, target, user, location }` → diagnoses + stores, returns the ticket
- `PATCH  /api/tickets` — `{ id, status: 'open' | 'resolved' }` → update status
- `DELETE /api/tickets?id=TKT-…` — delete a ticket

Tickets are stored in a Redis hash keyed by id (so update/delete are single ops),
each carrying a `status` (`open`/`resolved`) and timestamps.

### Storage setup (one-time)

The shared queue is backed by **Upstash Redis** (called over its REST API — no npm
dependency). To enable it:

1. In your Vercel project: **Storage → Upstash → Redis → Create**, and connect it
   to this project.
2. This injects `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`
   (or `KV_REST_API_URL` / `KV_REST_API_TOKEN`) as env vars — the API reads either.
3. **Redeploy.**

Until storage is configured, `/api/tickets` returns a `503` explaining the above,
and the UI runs in demo-only mode (the three mock tickets still work).

To run the API locally you need the Vercel runtime (`npx vercel dev`), not a plain
static server — a static server (`python3 -m http.server`) serves the UI but has no
`/api` backend.

## Three demo ticket scenarios

| Ticket | Scenario |
|---|---|
| INC-4821 | Switch port flapping (core switch SW-12) |
| INC-4819 | VPN degraded — routing via backup WAN path |
| INC-4815 | False alarm — not a network issue (Salesforce app-layer) |

## Deploy to web (Vercel)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/IMGeman/NetTest)

No build step. `vercel.json` serves the static UI from `app/`, and Vercel
auto-detects the Serverless Functions in `api/` (`diagnose.js`, `tickets.js`).
Importing the repo and clicking **Deploy** is all that's needed; every push to
`main` then auto-deploys.

> Only the web UI + API deploy — the Electron desktop shell (`main.js`) does not run on Vercel.

### Team access — Deployment Protection

By default Vercel **Deployment Protection** (Vercel Authentication) restricts the
site/API to people logged into your Vercel account — anyone else gets `401`. For a
shared help-desk tool, turn it off (or set a shared bypass) at
**Project Settings → Deployment Protection**.

## Run in browser

```bash
cd app
python3 -m http.server 8080
# then open http://localhost:8080
```

> Do not open `index.html` by double-clicking — Chrome blocks script loading via `file://`.

## Run as desktop app (dev)

```bash
npm install
npm start
```

## Build Windows installer

Push to `main` — GitHub Actions builds the `.exe` automatically via `windows-latest`.

Download the installer from **Actions → Build Windows Installer → Artifacts → NetPilot-Windows-Installer**.

## Tech stack

- **UI**: HTML/CSS/JS — no build step, no framework
- **Backend**: Vercel Serverless Functions (`api/`) — real DNS/TCP/HTTPS/TLS checks via Node built-ins, no dependencies
- **Storage**: Upstash Redis (REST API) for the shared ticket queue
- **Fonts**: IBM Plex Sans (UI) + IBM Plex Mono (technical data)
- **Desktop**: Electron + electron-builder
- **CI**: GitHub Actions (Windows NSIS installer)
- **Data**: live checks are real; the three demo tickets and the topology/hop-chain remain mock

---

*Scope: read-only diagnostics, no auto-remediation. Live checks see the internet's
view of a host — ICMP ping/traceroute and internal-LAN (switch/AP) diagnostics need
an on-prem agent and remain mock. Auth and ITSM embedding are the next phase.*

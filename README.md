# NetPilot

**Network diagnostics for Tier 1/2 Service Desk agents.**

NetPilot runs a full diagnostic sweep the moment a network ticket comes in and hands the agent a plain-English root cause — no network expertise required.

## Features

- **Auto diagnostic sweep** — ping, traceroute, DNS, VPN, switch port, Wi-Fi/AP health, recent config changes
- **Plain-English diagnosis** — e.g. "Packet loss starts at hop 4 (SW-12). Likely cause: switch port flapping"
- **Topology hop chain** — visual path from user → AP → switch → core → WAN with faulted hops shown in red
- **Color-coded diagnostic grid** — red/amber/green per check
- **Similar past tickets** — pattern matching with resolutions
- **Other affected users** — storm/outage detection
- **Auto escalation packet** — full diagnostic data attached on Tier 3 escalation
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

To run the live check locally you need the Vercel runtime (`npx vercel dev`),
not a plain static server — a static server (`python3 -m http.server`) serves
the UI but has no `/api` backend.

## Three demo ticket scenarios

| Ticket | Scenario |
|---|---|
| INC-4821 | Switch port flapping (core switch SW-12) |
| INC-4819 | VPN degraded — routing via backup WAN path |
| INC-4815 | False alarm — not a network issue (Salesforce app-layer) |

## Deploy to web (Vercel)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/IMGeman/NetTest)

The static UI in `app/` deploys to Vercel with no build step. `vercel.json`
already sets the output directory to `app`, so importing the repo and clicking
**Deploy** is all that's needed. Every push to `main` then auto-deploys.

> Only the web UI deploys — the Electron desktop shell (`main.js`) does not run on Vercel.

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
- **Fonts**: IBM Plex Sans (UI) + IBM Plex Mono (technical data)
- **Desktop**: Electron + electron-builder
- **CI**: GitHub Actions (Windows NSIS installer)
- **Data**: Mock only — no real backend

---

*MVP scope: read-only diagnostics, no auto-remediation. Real SNMP/API integrations, auth, and ITSM embedding are the next phase.*

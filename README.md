# PotholeWatch Pro

A crowdsourced, **verification-first** civic road-hazard platform: residents report potholes,
collapses and broken surfaces with locked photo evidence and GPS, the community confirms or
flags each report, and a transparent risk score keeps a live leaderboard of the worst roads.

> Built as an interactive demo. Every report you file goes through the same verification pipeline
> a real deployment would use, and the score updates on screen as confirmations arrive.

---

## Why it exists

Most complaint portals accept anything, so nothing is trusted and nothing gets fixed. PotholeWatch
Pro flips that: a report is only a *claim* until independent residents and a municipal desk validate
it. The result is a ranked, auditable work queue that a council can actually act on.

---

## Feature tour

| Area | What it does |
| --- | --- |
| **Dashboard** (`/`) | Live totals, the top hazards, a schematic risk map of the city, and the current leaderboard snapshot. |
| **Report a hazard** (`/report`) | 4-step wizard: pick the road → capture GPS → capture photo in-app → set type and severity. |
| **Verification queue** (`/queue`) | Unverified reports waiting for peer review. Anyone can confirm ("I witnessed this too!") or flag. |
| **Leaderboard** (`/leaderboard`) | All road stretches ranked by Hazard Risk Score. Rank #1 wears a **Red Alert** badge. |
| **Road detail** (`/roads/:id`) | One stretch broken into reaches, with its reports, votes and score breakdown. |
| **Hazard detail** (`/hazards/:id`) | Evidence, locked metadata, score breakdown, witnesses, comments and status history. |
| **Municipal desk** (`/municipal`) | Ops view of everything awaiting repair, plus resolve / reinstate / reject actions. Demo access is open to all visitors. |

### Evidence integrity

- Photo or video must be **captured in-app**, not uploaded from the gallery.
- The capture timestamp is read from the file itself and must fall inside a **45-minute window**;
  files older than 12 hours are rejected outright.
- GPS must be captured at the scene and land **within 2 km** of the selected road's anchor point.
- The server re-validates capture time, file timestamp, MIME type and coordinates — the browser is
  never trusted. Rejections return typed error codes (`CAPTURE_STALE`, `GEO_MISMATCH`, …).
- **Duplicate guard:** the same hazard type on the same road within **150 m** in the last 48 hours
  is refused, so one pothole cannot be reported ten times.
- **Rate limit:** 5 reports per hour per device.
- The browser cannot vote on its own report (`OWN_REPORT`).

### Multi-layer verification

1. **Device identity** — a signed, HMAC-protected session cookie per device (no passwords, no SMS).
   Described honestly in the UI as *device verified*, not identity verified.
2. **Community peer review** — independent residents confirm from the queue.
3. **Thresholds** — **3 independent confirmations** promote a report to *Verified*;
   **3 flags** freeze the hazard and escalate it to admin review.
4. **Status is recomputed from live votes**, never cached — withdrawing a confirmation can demote a
   verified hazard back to pending, and withdrawing a flag restores it.
5. **Municipal oversight** — the desk can resolve, reinstate (which clears flags) or reject.

### Hazard Risk Score

```
Score = (Verified Reports × Severity Weight)
      + (Community Upvotes × 2)
      + (Unresolved Days × 1.5)
```

| Severity | Weight |
| --- | --- |
| Critical | 50 |
| Medium | 25 |
| Low | 10 |

Roads are ranked by the summed score of their open hazards, so a street accumulates risk while it
stays unrepaired — the ageing term means **ignoring a hazard makes it rank worse over time**. A
fully resolved road shows a green **Resolved** badge instead of a rank.

---

## Tech stack

- **Client:** React 18 + TypeScript (strict) + React Router 6, hand-written CSS design system
  (no UI framework), inline SVG icon set and a schematic SVG risk map that works offline.
- **Server:** Express 4 + Multer for uploads, HMAC-signed session cookies.
- **Persistence:** a JSON file (`data/db.json`) plus uploaded evidence in `data/uploads` — no
  database or native module required, so `npm install` stays fast and portable.
- **Dev:** Vite runs in middleware mode *inside* the Express server, so one process and one port
  serve both the API and the client.
- **Prod:** `tsc -b && vite build`, then Express serves `dist` with history fallback.

---

## Getting started

```bash
npm install
npm run dev          # http://localhost:5173
```

Other scripts:

```bash
npm run build        # typecheck + production build into dist/
npm start            # build, then serve production on http://localhost:5173
```

Environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `5173` | HTTP port (falls back to 5173 if unset or `0`). |
| `HOST` | `127.0.0.1` | Set to `0.0.0.0` to open the dev server to a phone on your LAN. |
| `PW_SECRET` | dev value | HMAC secret for session cookies — **set this in any real deployment**. |

> Geolocation is only available on `localhost` or HTTPS. When testing over plain-HTTP LAN, the
> wizard falls back to a road-anchor position.

---

## Demo data

The repository ships a seeded scenario (no database needed): 7 road stretches around Colombo,
14 residents, 17 reports and 55 confirmation votes, including one flagged hazard, five pending
reports and two resolved ones — so the ageing penalty, the Red Alert rank and the Resolved badge
all show real values on first load.

Delete the `data/` folder at any time to reseed from scratch (it is gitignored).

Sample evidence for the uploader lives in `public/demo/` so the capture flow can be demonstrated
without standing in traffic.

---

## Project structure

```
index.html            Vite entry
vite.config.ts        React plugin, build outDir
server/
  index.js            Express app: sessions, upload validation, votes, municipal actions, Vite middleware
  store.js            Seed data, JSON persistence, scoring and thresholds
  start-prod.js       Cross-platform production launcher
src/
  App.tsx             Routes and layout shell
  pages/              Dashboard, Leaderboard, Queue, ReportPage, RoadPage, HazardPage, Municipal, NotFound
  components/         Layout, Icon, ui primitives, HazardCard, RiskMap, RiskTable
  lib/                api client + types, formatting, session provider, useApi, stats helpers
  styles.css          Design system, components and responsive rules
public/
  demo/               Sample evidence images
  favicon.svg
data/                 Runtime JSON store + uploads (gitignored, created on first run)
```

---

## API reference

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/session` | Current device identity and permission flags. |
| `POST` | `/api/session` | Create/rotate the signed device session. |
| `GET` | `/api/dashboard` | Aggregates for the dashboard (totals, top hazards, city risk). |
| `GET` | `/api/roads` | All road stretches with scores and ranks. |
| `GET` | `/api/roads/:id` | One road with its reaches and reports. |
| `GET` | `/api/queue` | Pending reports for peer review. |
| `GET` | `/api/hazards/:id` | Full hazard record with breakdown, votes and comments. |
| `POST` | `/api/hazards/:id/vote` | Confirm or withdraw a confirmation. |
| `POST` | `/api/hazards/:id/comments` | Add a comment. |
| `POST` | `/api/reports` | File a report (multipart: evidence + `capturedAt` + GPS + road). |
| `GET` | `/api/municipal` | Ops queue: flagged and awaiting repair. |
| `POST` | `/api/hazards/:id/resolve` | Mark repaired. |
| `POST` | `/api/hazards/:id/reinstate` | Return to the queue and clear flags. |
| `POST` | `/api/hazards/:id/reject` | Reject a report as invalid. |

---

## Limitations

- **Demo-grade auth.** Identity is a device cookie, not a verified person. Anyone can use the
  municipal desk — it is labelled "Demo access" in the UI on purpose.
- **Single-node storage.** A JSON file is perfect for a demo and wrong for production: no
  concurrency control, no backups, no horizontal scaling.
- **Schematic map.** The map is an SVG layout, not real GIS tiles, so it works fully offline.
- **No real integrations.** Nothing is sent to a municipal system, and no notifications are sent.

---

## Roadmap

- Replace the JSON store with Postgres + object storage; keep uploads in a bucket, not on disk.
- Real auth (OTP or OAuth) with per-resident reputation weighted into verification.
- Server-side perceptual-hash duplicate detection instead of the 150 m / 48 h heuristic.
- Real map tiles and GIS road geometry, with per-segment scoring.
- Municipal export (CSV / work-order API) and SLA timers per severity.
- Push notifications when a hazard you confirmed is repaired.
- Offline-first PWA capture for areas with poor connectivity.

---

## License

MIT — do what you like, no warranty. Civic data belongs to the people who reported it.

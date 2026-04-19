# Architecture

Three layers, no servers.

```
    ┌──────────────────────────────────────────────────────────────────┐
    │                         FRONTEND (Lovable)                       │
    │                                                                  │
    │   /               landing + Echo/Healing mode toggle             │
    │   /q              Q1 · Q2 · Q3                                   │
    │   /rounds         3 image pairs                                  │
    │   /waiting        polls for match every 2.5 s                    │
    │   /chat           send + poll every 2.5 s                        │
    │   /postcard       end-of-chat postcard reveal                    │
    │   /globe          standalone booth-display mode                  │
    │                                                                  │
    │   localStorage:  resonance_session_id · resonance_match_mode     │
    │   Zustand:       match_pair_id · partner · transient UI state    │
    └──────────────────────────────────────────────────────────────────┘
                                    │  HTTPS · JSON
                                    ▼
    ┌──────────────────────────────────────────────────────────────────┐
    │                          BACKEND (n8n)                           │
    │                                                                  │
    │   WEBHOOKS              CRONS             CODE NODES / LLMs      │
    │   ──────────            ───────           ─────────────────      │
    │   emotion-intake        demo-reset/2min   Compute Vector (JS)    │
    │   emotion-match         chat-timeout/1min Pick Partner (JS)      │
    │   chat-send                               Generate Opener (JS)   │
    │   chat-poll                               gpt-5-mini (geocoder)  │
    │   match-end                               gpt-5-mini (postcard)  │
    │   match-feed                                                     │
    │   postcard                                                       │
    └──────────────────────────────────────────────────────────────────┘
                                    │  Google Sheets API
                                    ▼
    ┌──────────────────────────────────────────────────────────────────┐
    │                    DATABASE (Google Sheets)                      │
    │                                                                  │
    │   user_vectors      23 columns · one row per user                │
    │   chat_messages      5 columns · one row per message             │
    └──────────────────────────────────────────────────────────────────┘
```

## Frontend (Lovable)

A Vite + React + TypeScript + Tailwind + Framer Motion SPA. Built entirely from the seven prompts under [`../lovable-prompts/`](../lovable-prompts/). Source of truth for routes and state is those prompts — if the live Lovable build drifts from the prompts, the prompts are authoritative.

**State strategy:**
- `localStorage`: only `resonance_session_id` (UUID) and `resonance_match_mode` — things that must survive a page refresh.
- Zustand in-memory store: match state (`match_pair_id`, `partner`, `opener`), transient UI state, postcard data after chat ends.
- No server sessions. No JWTs. No cookies. The session UUID IS the identity.

**Fetch layer:**
- All five primary webhooks are reached via `VITE_N8N_*_URL` env vars injected at build time.
- Polling intervals are constants at the top of each screen's component: `MATCH_POLL_MS = 2500`, `CHAT_POLL_MS = 2500`, `GLOBE_POLL_MS = 3000`.
- Every fetch has a hard timeout (~8 s) and the UI surfaces failures as a retry button, not a silent freeze.

**Globe (`/globe`) is a separate concern.** It reads `VITE_N8N_FEED_URL` every 3 s and renders arcs with Globe.gl. It doesn't need any of the user state — it's a read-only window onto the match stream. The standalone `globe/live-matches.html` is the same visualization detached from Lovable, for booth display.

## Backend (n8n)

Nine workflows, all on one n8n Cloud instance. Deployed URLs and IDs are pinned in [`../n8n-workflows/DEPLOYED.json`](../n8n-workflows/DEPLOYED.json).

For per-workflow logic, see [n8n-workflows.md](n8n-workflows.md).

**Credentials** (configured once in n8n UI, never committed):
- **Google Sheets OAuth2** — one credential, reused by every sheet node.
- **n8n free OpenAI API credits** — one credential, reused by both `lmChatOpenAi` nodes (intake geocoder, postcard highlight).

**Activation state** — all nine workflows must be **active** (toggle top-right in the n8n UI) for the system to function. Inactive workflows silently drop webhook calls with a 404.

## Database (Google Sheets)

One sheet with two tabs: `user_vectors` and `chat_messages`.

**Why Sheets and not Postgres:**
- Zero provisioning. Fresh sheet + existing n8n Google Sheets credential = live backend in 60 seconds.
- Every row is human-inspectable in a browser during debugging.
- Rollback is Ctrl+Z.
- n8n abstracts the data layer, so migrating to Postgres later is a node-swap, not a rewrite.

**Why Sheets is not production-safe:**
- No atomic transactions. Two simultaneous matchers can race on the same candidate row. For v1 demo traffic this is acceptable; for real-world traffic a lock or queue is required.
- Polling-based chat has ~2.5 s user-visible latency per message.
- Read performance degrades past a few thousand rows.

See [n8n-workflows.md](n8n-workflows.md) for the full column schemas and the PascalCase/snake_case translation layer between `chat_messages` and the webhook API.

## Live dataflow (the hot paths)

**Intake → match → chat:**

```
Browser            n8n                    Google Sheets
─────────          ────                   ─────────────
POST /intake ────▶ Compute Vector
                   (maybe) gpt-5-mini ──▶ (no write)
                   Append ─────────────▶  user_vectors +1 row
                   Respond OK    ◀──────
         ◀──────── 200 OK

POST /match  ────▶ Read Users      ◀───── user_vectors
                   Pick Partner (JS)
                   Stamp two rows  ─────▶ user_vectors (2 rows updated)
                   Generate Opener (JS)
         ◀──────── 200 {partner, opener}

POST /send   ────▶ Append         ──────▶ chat_messages +1 row
         ◀──────── 200 {message_id}

GET  /poll   ────▶ Read Messages  ◀───── chat_messages
                   Read Users     ◀───── user_vectors
                   Filter & Sort (JS)
         ◀──────── 200 {messages[], pair_status}
```

**Live globe display (read-only):**

```
GET  /feed   ────▶ Read Users     ◀───── user_vectors
                   Build Feed (JS)
         ◀──────── 200 {matches[]}
```

**Background (server-side only):**

```
cron 1min   ────▶ Read Users + Messages ◀── both tabs
                  Find Stale Pairs (JS)
                  Stamp ended_at   ──────▶ user_vectors

cron 2min   ────▶ Read Users     ◀────── user_vectors
                  Filter demo rows
                  Clear match fields ───▶ user_vectors
```

## What's deliberately missing

- **No auth layer.** Session UUIDs are the only identity. No login, no tokens.
- **No websockets or realtime subscriptions.** Everything is HTTPS polling at 2.5–3 s cadence. Good enough for the demo.
- **No retries or queues in the frontend.** A failed call surfaces as a retry button to the user. No exponential backoff, no offline queue.
- **No caching layer.** Every read hits Sheets. The Sheets API is fast enough at demo scale (~100 users) that this is fine.
- **No CDN in front of n8n.** n8n Cloud's own routing handles the webhook load. For a public launch we'd want CloudFront or similar.
- **No analytics, no tracking, no telemetry.** None. This is part of the product design, not an oversight.

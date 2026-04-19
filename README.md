# Resonance

**ITU RoyalHacks 2026 — Denmark's national student hackathon.**

An anonymous emotion-matching web app. A user answers 3 short questions, picks through 3 pairs of images, and is placed in a short real-time chat with another user feeling the same way right now.

Repo: [github.com/XXinZ28/royalhacker-2026](https://github.com/XXinZ28/royalhacker-2026)

---

## 1. Project Overview

Every communication app asks **who you are** before it can help you. Dating apps want photos. Social apps want friends. Therapy apps want history. None of them ask **how you feel right now** — but that's usually the reason you opened the app.

Resonance flips the primitive. You answer three simple questions about how you're doing, pick instinctively between a few image pairs, and the app derives a **PAD vector** (Pleasure, Arousal, Dominance) from your answers. It then finds another user with a nearby vector and opens a one-off anonymous chat, seeded with an opener calibrated to the shared emotional quadrant. Fifteen minutes later the conversation dissolves and the system generates a single shared postcard with one line from what was actually said.

No accounts, no social graph, no profiles, no history. One moment, one stranger, the same weather inside.

For the full design philosophy, see [`docs/concepts.md`](docs/concepts.md).

## Documentation map

If you're trying to understand the project in one pass, read in this order:

| Doc | What it covers |
|---|---|
| This README | Project overview, feature list, modeling math, data layout |
| [`docs/concepts.md`](docs/concepts.md) | The philosophy — the problem, the PAD model, Echo vs Healing, ephemerality, anonymity |
| [`docs/architecture.md`](docs/architecture.md) | Three-layer system diagram, hot paths, what's deliberately missing |
| [`docs/n8n-workflows.md`](docs/n8n-workflows.md) | Per-workflow logic — every node, every decision, every constraint |
| [`docs/delta-rubric.md`](docs/delta-rubric.md) | The per-image `(p_delta, a_delta)` values and why |
| [`docs/setup.md`](docs/setup.md) | End-to-end setup checklist from empty repo to live demo |
| [`lovable-prompts/`](lovable-prompts/) | The seven prompts that built the frontend, in order |
| [`n8n-workflows/README.md`](n8n-workflows/README.md) | Workflow import + activation steps |
| [`n8n-workflows/DEPLOYED.json`](n8n-workflows/DEPLOYED.json) | Live webhook URLs and workflow IDs |

## 2. Key Features

- **3-question PAD onboarding** (Pleasure, Arousal, Dominance) grounded in Russell & Mehrabian's (1977) tridimensional emotion model.
- **3 rounds of instinctive image-pair selection** to fine-tune the P and A axes without making the user label their feeling.
- **Bucketed image dataset**: 9 buckets = 3×3 grid on initial P×A. Each bucket has 6 pre-labeled images with `(p_delta, a_delta)` tuples.
- **Vector-based matching**: same Dominance required in Echo mode, opposite Dominance by mutual opt-in in Healing mode; smallest Euclidean distance on `(final_P, final_A)`, FIFO tiebreak.
- **Echo / Healing match modes**: user picks on the landing page. Echo (default) matches same-D users; Healing matches opposite-D users, but only when *both* sides have explicitly asked for it.
- **Per-round traceability**: each image pick (round, choice label, `p_delta`, `a_delta`) is written to the sheet alongside the final vector, so the PAD calculation is fully auditable row-by-row.
- **Mode-aware opener bank**: a deterministic JS opener is generated per match, keyed by `match_mode` × PAD quadrant. Zero external API, zero demo-time failure mode. Can be swapped back to GPT (`gpt-4o-mini` or newer) by replacing one node once a real OpenAI key is available.
- **3D live-matches globe** (`globe/live-matches.html`, Globe.gl): a standalone display page that visualizes matches as flowing arcs + emotion-colored ripples. Runs a simulator out of the box, or polls the `match-feed` webhook for real pairs.
- **Demo-safe matching pool**: 12 seeded `demo_*` partners (3 per `mode × D` combo) + a 2-minute cron (`Demo-Reset`) that clears their match state, so a solo booth demo always finds a partner within seconds.
- **Ephemeral chat** via Google Sheets polling, with a 30-minute re-match cooldown.

## 3. Demo / User Flow

```
Landing page: pick Echo (default) or Healing mode
    ↓
Q1 — Pleasure        → initial_P ∈ {+0.7, 0, -0.7}
Q2 — Arousal         → initial_A ∈ {+0.7, 0, -0.7}
Q3 — Dominance       → final_D ∈ {1, 0}    (frozen after this)
    ↓
Derive bucket (1..9) from (initial_P, initial_A)
    ↓
Round 1 — color      → warm vs cold
Round 2 — nature     → sunny vs stormy
Round 3 — space      → vast vs close
    ↓
final_P = initial_P + avg(p_deltas) × 0.5
final_A = initial_A + avg(a_deltas) × 0.5
    ↓
POST /emotion-intake  → 20-column row appended (incl. per-round picks + deltas)
    ↓
POST /emotion-match   → polled every 2.5 s until matched
    │   Echo:    same match_mode + same final_D, closest (P,A), FIFO tiebreak
    │   Healing: same match_mode + opposite final_D (mutual opt-in)
    ↓
Chat view: mode-aware opener rendered as partner's first message
    ↓                                          ↓
User closes chat OR 30-min zombie release      Display: /globe polls /match-feed
    ↓                                              shows arc + ripple for every new pair
POST /match-end → both rows re-enter the pool
    ↓
"the moment dissolves. you carry what stayed."
```

## 4. System Architecture

```
 ┌─────────────┐     HTTPS     ┌──────────────┐    Sheets API    ┌──────────────┐
 │  Lovable    │ ────────────▶ │     n8n      │ ───────────────▶ │ Google Sheet │
 │  (React SPA │ ◀────────────  │  workflows   │ ◀───────────────  │ user_vectors │
 │  + /globe)  │               │  + cron      │                   │ chat_messages│
 └─────────────┘               │  + opener JS │                   └──────────────┘
         ▲                     └──────┬───────┘
         │                            │
         │  poll chat every 2.5 s     └──── Demo-Reset cron every 2 min
         │  poll match every 2.5 s          (clears demo_* match state)
         │  poll match-feed every 3 s (globe)
         │
         └── Browser localStorage holds session_id + match_mode only
```

- **Frontend (Lovable):** a React/Vite SPA that handles UI, session UUID + match_mode in localStorage, loading bucket JSONs, and calling n8n webhooks over HTTPS. `/globe` route is a standalone display page (no app chrome) that either runs a simulator or polls `match-feed`.
- **Backend (n8n):** seven workflows that own all business logic — vector math, matching, opener generation, chat message relay, match teardown, live globe feed, and a demo-pool reset cron.
- **Database (Google Sheets):** two live tabs — `user_vectors` (20 columns, one row per user including per-round picks) and `chat_messages` (5 columns, one row per message). n8n reads/writes via its built-in Google Sheets node, referencing tabs by name (not gid) for safety.
- **Opener generator:** a JS code node in `Emotion-Match` with a curated bank of 24 openers (2 modes × 4 quadrants × 3 variants). Swappable for GPT-4o-mini the moment a real OpenAI key is wired in.
- **Image dataset:** static Unsplash URLs committed to this repo under `picture-dataset/`, served to the browser from Lovable's `public/` folder. Image metadata (deltas, theme, round) travels with each image and is echoed back to the sheet per user.

## 5. Emotion Modeling

Based on **Russell & Mehrabian (1977)** — the tridimensional PAD model:

- **P (Pleasure):** +0.7 (pleasant) → 0 (neutral) → -0.7 (unpleasant)
- **A (Arousal):** +0.7 (activated) → 0 (neutral) → -0.7 (drowsy)
- **D (Dominance):** +1 (wants to be heard) / 0 (wants to listen)

Initial P and A come from Q1 and Q2 (three-way click). Dominance comes from Q3 and is **frozen** — it never changes again. This is what partitions the matching pool into two non-overlapping halves: users who want to talk and users who want to listen.

P and A are then fine-tuned by three image-pair rounds. Each image carries a pre-assigned `(p_delta, a_delta)` ∈ `[-0.3, +0.3]`. See [`docs/delta-rubric.md`](docs/delta-rubric.md) for the uniform rubric.

```
final_P = initial_P + avg(3 selected p_deltas) × 0.5
final_A = initial_A + avg(3 selected a_deltas) × 0.5
final_D = D    (from Q3, unchanged)
```

The `× 0.5` multiplier caps the maximum per-axis shift at ±0.15 — so a user who started at +0.7 stays ≥ +0.55, preserving the starting quadrant. Fine-tuning nudges, never flips.

## 6. Matching Algorithm

For a new user submitting their vector, the `Emotion-Match` n8n workflow:

1. **Reads** all rows of `user_vectors` from Google Sheets.
2. **Filters** to eligible candidates:
   - not the same `session_id`
   - candidate's stored `match_mode` equals requester's `match_mode` (mutual opt-in)
   - in `echo` mode: `final_D` equal to requester's `final_D`
   - in `healing` mode: `final_D` **opposite** to requester's `final_D`
   - AND one of:
     - `matched_user_id` is empty (never matched), OR
     - `match_ended_at` is set (partner left), OR
     - `match_timestamp` is older than 30 minutes (zombie release)
3. **Scores** each candidate by Euclidean distance on `(final_P, final_A)`:
   `d = sqrt((P1-P2)² + (A1-A2)²)`
4. **Ranks** smallest-first, tiebroken by earliest `timestamp` (FIFO — the user who has been waiting longest wins).
5. **Atomically updates** both rows with `matched_user_id`, `match_timestamp`, and clears `match_ended_at`.
6. **Generates a mode-aware opener** in a JS code node. The bank is keyed by `match_mode` × emotional quadrant (joy / calm / anxious / melancholy), picking one of three variants per cell. *Echo* openers land inside the shared quadrant; *Healing* openers gently acknowledge the listener/talker complementarity without naming the mechanic.
7. **Returns** `{ matched: true, partner_session_id, match_pair_id, opener, match_timestamp, match_mode }` to the frontend.

If no eligible candidate exists, returns `{ matched: false, match_mode, message }`. The message has two variants:
- echo: `"you are the first one here right now. please wait."`
- healing: `"no one has opened themselves to a healing meeting yet. stay a moment."`

The frontend polls every 2.5 s until matched.

## 7. How n8n Is Used

n8n is the full backend. No custom server code — every piece of business logic lives in a visual n8n workflow.

### Workflows

| Workflow | Trigger | What it does |
| -------- | ------- | ------------ |
| `Emotion-Intake` | POST `/webhook/emotion-intake` | Accepts either `selections: [{round, choice, p_delta, a_delta}]` (preferred) or legacy `p_deltas`/`a_deltas` arrays. Computes PAD vector server-side, normalizes `match_mode`, appends a 20-column row to `user_vectors`. |
| `Emotion-Match`  | POST `/webhook/emotion-match` | Read sheet → filter eligibility (mutual mode opt-in + D rule per mode) → rank by distance → atomic dual update → pick a curated opener by `match_mode × quadrant` → respond. |
| `Chat-Send`      | POST `/webhook/chat-send` | Append a message to `chat_messages` using the sheet's original PascalCase headers (`Message Id`, `Match Pair Id`, `From Session Id`, `Text`, `Timestamp`). Webhook response stays snake_case. |
| `Chat-Poll`      | GET `/webhook/chat-poll` | Return messages for a `match_pair_id` newer than `since`. Re-keys PascalCase sheet headers to snake_case in the response so the frontend contract is stable. |
| `Match-End`      | POST `/webhook/match-end` | Stamp `match_ended_at` on both rows so they re-enter the pool. |
| `Match-Feed`     | GET `/webhook/match-feed` | Reads `user_vectors`, deduplicates matched pairs, deterministically assigns each `session_id` to one of ~22 hub cities (Copenhagen weighted 2× for the booth), returns `{ matches: [{from, to, mode, final_P, final_A, intensity, timestamp, match_pair_id}, ...] }` for the globe. Accepts `?since=<iso>&limit=<n>`. |
| `Demo-Reset`     | cron, every 2 min | Reads `user_vectors`, finds rows whose `session_id` starts with `demo_` and has a non-empty `matched_user_id` or `match_ended_at`, clears those three match fields so the seeded demo partners are always available. |

### Why n8n is powerful here

- **Zero-server architecture.** Every endpoint the frontend talks to is a webhook node. We ship a backend without provisioning, deploying, or maintaining any code servers.
- **Visual orchestration.** The matching pipeline — "read sheet → filter → score → update two rows → call LLM → respond" — is inspectable and debuggable as a diagram, not a call stack.
- **Credential management for free.** Google Sheets OAuth2 and the built-in GPT-5-mini credential are configured once in the n8n UI; no secrets live in the frontend or in this repo.
- **Atomic multi-step flows.** The n8n execution model keeps the two-row update + LLM call + response in one logical run. Far simpler than wiring the same logic across Lambda + SQS + OpenAI SDK.
- **Replaceable without frontend changes.** The Sheets tab could be swapped for Postgres, the OpenAI node for Anthropic, the matching algorithm for a clustering approach — all without touching a single line of Lovable code.
- **Rapid iteration.** During the hackathon, we rewrote the matching eligibility query three times in minutes — each iteration is drag, drop, re-activate. No rebuild, no redeploy.

## 8. How Lovable Is Used

Lovable is the full frontend. No hand-written React scaffolding, no manual route plumbing.

### What Lovable produced

- Full Vite + React + TypeScript + Tailwind + Framer Motion scaffold in one prompt.
- Five screens (landing, questions, image rounds, waiting, chat) built incrementally from the prompts in `lovable-prompts/`.
- Session UUID persistence, route transitions, and Zustand-based state management — each introduced by a single prompt.
- Styled aesthetics (deep-navy + glow, serif headlines, pulsing orbs, breathing bubble) driven by natural-language visual direction.

### Why Lovable is effective here

- **Hackathon speed.** The full frontend — five screens, state store, env-var wiring, fetch layer — went from zero to demo in a few hours of prompt iteration. A hand-rolled React app would not have fit the weekend.
- **Iteration loop measured in seconds.** Change a copy line, a color, a route flow — describe it in English and watch Lovable rewrite the relevant components. No rebuild-reload cycle.
- **No design debt on a throwaway demo.** Lovable gives us clean, passable-looking UI without a dedicated designer, for a project that is primarily backend and matching-algorithm work.
- **Clean code output.** The generated React + TypeScript is readable and structured — we extended specific components by hand where the prompts didn't fully capture the desired animation feel (e.g. the match-waiting orb).
- **Seamless env-var integration.** All five n8n webhook URLs are passed in via `VITE_*` env vars. Swap workflows between staging and prod by flipping one config.
- **Deploys itself.** Lovable's built-in deployment gets us a live URL for the Devpost submission without touching Vercel or any CI.

## 9. Data Storage

Google Sheets is our database. Two tabs in one sheet, `resonance-users`:

### `user_vectors` (20 columns)

| # | Column | Type | Notes |
|---|--------|------|-------|
| A | `session_id`      | string (UUID) | Browser-generated, stored in localStorage. Rows starting with `demo_` are seeded demo partners, reset every 2 min. |
| B | `timestamp`       | ISO 8601     | Row creation time |
| C | `initial_P`       | number       | From Q1 ∈ {+0.7, 0, −0.7} |
| D | `initial_A`       | number       | From Q2 ∈ {+0.7, 0, −0.7} |
| E | `final_P`         | number       | `initial_P + avg(round[1..3].p_delta) × 0.5` |
| F | `final_A`         | number       | `initial_A + avg(round[1..3].a_delta) × 0.5` |
| G | `final_D`         | number       | 0 or 1 from Q3, never changes |
| H | `match_mode`      | string       | `echo` (default) or `healing` — chosen on landing page, frozen for the session |
| I | `matched_user_id` | string / "" | Partner's `session_id`, or empty |
| J | `match_timestamp` | ISO 8601 / "" | When the match was made |
| K | `match_ended_at`  | ISO 8601 / "" | When either party left the chat |
| L | `round1_choice`   | string       | `"warm"` / `"cold"` (color round) |
| M | `round1_p_delta`  | number       | Per-image constant from the delta rubric |
| N | `round1_a_delta`  | number       | Per-image constant from the delta rubric |
| O | `round2_choice`   | string       | `"sunny"` / `"stormy"` (nature round) |
| P | `round2_p_delta`  | number       | |
| Q | `round2_a_delta`  | number       | |
| R | `round3_choice`   | string       | `"vast"` / `"close"` (space round) |
| S | `round3_p_delta`  | number       | |
| T | `round3_a_delta`  | number       | |

Columns L–T make the final-vector calculation auditable: given the `initial_*` and three `*_delta` values, the `final_*` in columns E/F should reconcile exactly.

### `chat_messages` (PascalCase headers in-sheet, snake_case in webhook response)

| Column in sheet | Webhook key | Notes |
| --------------- | ----------- | ----- |
| `Message Id`      | `message_id`      | Deduplication key for the frontend |
| `Match Pair Id`   | `match_pair_id`   | Deterministic `[id_a, id_b].sort().join('__')` |
| `From Session Id` | `from_session_id` | Who sent it |
| `Text`            | `text`            | Up to 1000 chars |
| `Timestamp`       | `timestamp`       | Send time |

Chat-Send writes to the sheet using the PascalCase keys (matching the original column names); Chat-Poll re-keys them to snake_case before responding, so the Lovable frontend contract never changes.

### Why Sheets is fine for v1

- Zero setup — a fresh sheet + the n8n Google Sheets node is live in minutes.
- Transparent — you can watch users arrive and match in a browser tab.
- Reversible — every write is undoable with Ctrl+Z.
- Replaceable later — n8n abstracts the data layer; swapping for Postgres or Firestore is a node swap, not a rewrite.

### Why Sheets is **not** fine for prod

- No atomic transactions — under concurrent matchers, two simultaneous POSTs could both "win" the same candidate. For v1 demo traffic this is acceptable.
- Polling-based chat (2.5 s) is noticeable latency compared to a realtime DB.
- Read performance degrades beyond a few thousand rows.

## 9.5. Changelog (v2 — April 2026)

- **White-dwarf supernova ending transition** — new prompt `lovable-prompts/07-ending-transition.md`. When the chat ends, the conversation physically collapses into a point of light, detonates as a Type Ia flash, blooms into a nebula colored by the match's emotional quadrant, and the postcard rises from the remnant. Three seconds, screen center, no route flicker. Reduced-motion users get a 400ms crossfade fallback.
- **Solo-demo puppet page** — new `demo/puppet.html`. Standalone HTML that impersonates a `demo_*` partner by calling chat-send/chat-poll webhooks directly. Lets you record demo videos with a real two-tab chat without needing a second device or person.
- **(0,0) geocode bug fix** — Emotion-Intake's Compute Vector node now treats `(lat=0, lng=0)` as "geolocation failed" instead of writing the literal ocean coordinate to the sheet. Failed geolocations now route through the `gpt-5-mini` geocoder correctly, producing proper canonical names and coordinates.
- **LangChain geocoder robustness** — Parse Geocode node now accepts string-number outputs (`"lat": "35.68"`) from the LLM, not just numeric ones. Fixes rare JSON parsing failures where gpt-5-mini quoted the coordinates.
- **Three documentation deep-dives** — `docs/concepts.md` (the design philosophy), `docs/architecture.md` (three-layer system), `docs/n8n-workflows.md` (per-workflow logic). The README now links them as a reading-order map.
- **Healing match mode** — new landing-page toggle, mutual opt-in, opposite-D eligibility. Plumbed through `Emotion-Intake`, `Emotion-Match`, and the opener bank. Lovable prompt: `lovable-prompts/02b-mode-toggle.md`.
- **Per-round picks recorded in the sheet** — `user_vectors` expanded from 10 to 20 columns. Each of the three image picks now writes `roundN_choice`, `roundN_p_delta`, `roundN_a_delta`, so `final_P` / `final_A` are verifiable row-by-row.
- **Mode-aware opener bank** — replaced the `gpt-5-mini` node (the n8n free AI credits proxy returns 404) with a deterministic JS code node that picks from 24 curated lines keyed by `match_mode × quadrant`. One-node swap when a real OpenAI key is wired in.
- **3D live-matches globe** — standalone `globe/live-matches.html` for the booth display, plus `lovable-prompts/06-globe-display.md` for a `/globe` route inside the Lovable app with a `VITE_DISPLAY_MODE=simulator|live` switch.
- **`Match-Feed` workflow** — new GET webhook that produces the globe's data feed (deduped pairs, uses real user city/lat/lng when available, deterministic hub fallback otherwise).
- **`Demo-Reset` cron** — new workflow that runs every 2 minutes and clears match state on all `demo_*` rows. Paired with 12 seeded demo partners (3 per `mode × D` combo) so a solo booth demo always matches within seconds.
- **`Chat-Timeout` cron** — new workflow that runs every 1 minute, finds matched pairs idle more than 15 minutes (max of `match_timestamp` and latest chat message timestamp) and stamps `match_ended_at` on both rows. Chat-Poll surfaces this via `pair_status`.
- **Per-user city + coordinates** — `user_vectors` gained three more columns (`city`, `lat`, `lng`). Intake accepts a `city` string and geocodes it against ~90 known cities; optional `lat`/`lng` from browser geolocation override. Match response now carries full `me {city, lat, lng, P, A, D}` and `partner {same}` so the pre-chat reveal screen can draw the real connection on the globe.
- **LLM geocoder fallback** — unknown city names (non-English scripts, misspellings, abbreviations) are routed through a LangChain Agent + `gpt-5-mini` node inside Emotion-Intake that returns canonical name + lat/lng. Confirmed working on n8n's free AI credits via LangChain.
- **Recency filter on matching** — real-user candidates in Emotion-Match must have intaked within the last 30 minutes; stale sheet data never matches. `demo_*` seed rows bypass this.
- **Clean end-of-chat signaling** — Match-End and Chat-Timeout no longer pollute the `chat_messages` text column with `__partner_left__` / `__chat_timeout__` system rows. Both only stamp `match_ended_at`. Chat-Poll now reads `user_vectors` too and returns a top-level `pair_status: 'active' | 'ended'` alongside the messages array.
- **`Postcard-Generate` workflow** — new POST `/webhook/postcard`. Reads both users and the full chat transcript, asks `gpt-5-mini` for a one-line highlight grounded in the conversation, picks a deterministic background image per pair from the three images the requester chose during the image-rounds, and returns a full shareable payload.
- **Sheet-integration hardening** — all workflows now reference tabs by name (`user_vectors`, `chat_messages`), not gid, preventing a class of bugs where a wrong gid silently writes to a fake-data tab. `match_mode` header position moved to column H (between `final_D` and `matched_user_id`) via `moveDimension` with zero data loss.
- **Chat column alignment** — `chat_messages` keeps its original PascalCase headers (`Message Id`, `Match Pair Id`, etc.). `Chat-Send` writes in PascalCase; `Chat-Poll` re-keys to snake_case for the frontend. No more duplicate columns.
- **Frontend polling fix** — waiting screen polls `/emotion-match` every 2.5 s instead of firing once and stalling. No more "stuck on waiting" when the pool has seeded partners.

## 10. Future Improvements

- **Realtime chat** — move `chat_messages` to Firebase Realtime DB or Supabase realtime, drop polling.
- **Atomic matching** — replace Sheets with Postgres + row-level locks, OR add a lightweight queue (Redis) so the matcher is single-consumer.
- **Richer image dataset** — 54 curated originals (one unique image per bucket slot) with proper attribution.
- **Match quality evaluation** — post-chat "did this feel resonant?" prompt feeding back into distance weighting.
- **Additional image rounds** — 4–5 rounds instead of 3 for finer vector resolution.
- **Multi-language UI** — the current prompts target English; the emotional semantics of the PAD model are universal, but the copy isn't.
- **Safety net** — abuse reporting, rate limiting, message content filtering via an n8n preprocessing step.
- **Opener personalization from open-text field** — let users optionally type one line pre-match; feed it into the GPT-5-mini opener prompt.
- **Longitudinal check-in** — a user can open the app again in a few days and see whether their vector has drifted.

---

## Repository layout

```
.
├── README.md                        this file
├── QUICKSTART.md                    minimum-steps path to a running demo
├── .env.example                     public template
├── .env                             gitignored — real n8n API token
├── .env.lovable                     copy-paste env vars for Lovable project settings
├── user_vectors.csv                 header-only CSV template for the Sheets tab
├── fake1_users.csv                  demo seed users (12 demo_* partners)
├── fake_chat_messages.csv           demo seed chat messages
│
├── picture-dataset/                 the 9 bucket JSONs with 6 pre-labeled images each
│   ├── README.md                    dataset schema + delta rubric
│   └── bucket_1.json ... bucket_9.json
│
├── n8n-workflows/                   the full backend, as visual workflows
│   ├── README.md                    import + activation steps
│   ├── DEPLOYED.json                live webhook URLs + workflow IDs
│   ├── emotion-intake.json          intake + per-round picks + LLM geocoder
│   ├── emotion-match.json           echo/healing eligibility + opener bank
│   ├── chat-send.json               append message to chat_messages
│   ├── chat-poll.json               fetch messages + pair_status signal
│   ├── match-end.json               stamp match_ended_at on both rows
│   ├── match-feed.json              GET feed for the live globe
│   ├── demo-reset.json              cron that clears demo_* match state
│   ├── chat-timeout.json            cron that auto-ends idle matches >15 min
│   └── postcard-generate.json       POST /postcard — LLM highlight + bg image
│
├── lovable-prompts/                 build the frontend from these, in order
│   ├── README.md
│   ├── 01-scaffold.md               project setup, routes, session UUID
│   ├── 02-questions.md              the three PAD-initial questions
│   ├── 02b-mode-toggle.md           Echo/Healing landing-page toggle
│   ├── 03-image-rounds.md           three image-pair rounds
│   ├── 04-waiting-and-match.md      match polling
│   ├── 05-chat.md                   chat view (send + poll + end)
│   ├── 06-globe-display.md          /globe route with simulator + live modes
│   └── 07-ending-transition.md      white-dwarf supernova → postcard transition
│
├── globe/
│   └── live-matches.html            standalone Globe.gl visualization for booth
│
├── demo/
│   └── puppet.html                  solo-demo puppet page — impersonate a demo_* user
│
├── docs/
│   ├── concepts.md                  the philosophy: PAD, Echo/Healing, ephemerality
│   ├── architecture.md              three-layer system + hot paths
│   ├── n8n-workflows.md             per-workflow logic deep dive
│   ├── delta-rubric.md              per-image (p_delta, a_delta) rationale
│   ├── setup.md                     end-to-end setup checklist
│   └── screenshots/                 UI reference screenshots
│
└── archive/
    └── cc-1st/                      archived v0 EchoWander 3D-globe concept
```

See [`docs/setup.md`](docs/setup.md) for the full setup checklist.

## Credits

- Russell, J. A. & Mehrabian, A. (1977). *Evidence for a Three-Factor Theory of Emotions.* Journal of Research in Personality.
- Images: [Unsplash](https://unsplash.com/license) — free commercial use with attribution. See each image's `photographer_credit`.
- Opener generation: curated JS bank inside the `Emotion-Match` n8n workflow (24 lines across `mode × quadrant`). Drop-in replaceable with `gpt-4o-mini` once a real OpenAI key is configured.
- 3D globe: [Globe.gl](https://globe.gl) via CDN (no build step).
- Frontend generation: [Lovable](https://lovable.dev).
- Backend orchestration: [n8n](https://n8n.io).

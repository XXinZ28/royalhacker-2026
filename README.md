# Resonance

**ITU RoyalHacks 2026 — Denmark's national student hackathon.**

An anonymous emotion-matching web app. A user answers 3 short questions, picks through 3 pairs of images, and is placed in a short real-time chat with another user feeling the same way right now.

---

## 1. Project Overview

Most apps ask you to label your feeling before they can help you. Resonance flips that: you answer three simple questions about how you're doing, pick instinctively between a few image pairs, and the app derives a **PAD vector** (Pleasure, Arousal, Dominance) from your answers. It then finds another user with a nearby vector and opens a one-off anonymous chat, seeded with an AI-generated opener calibrated to the shared emotional quadrant.

No accounts, no social graph, no history. One moment, one stranger, the same weather inside.

## 2. Key Features

- **3-question PAD onboarding** (Pleasure, Arousal, Dominance) grounded in Russell & Mehrabian's (1977) tridimensional emotion model.
- **3 rounds of instinctive image-pair selection** to fine-tune the P and A axes without making the user label their feeling.
- **Bucketed image dataset**: 9 buckets = 3×3 grid on initial P×A. Each bucket has 6 pre-labeled images with `(p_delta, a_delta)` tuples.
- **Vector-based matching**: same Dominance required, smallest Euclidean distance on `(final_P, final_A)`, FIFO tiebreak.
- **AI-generated opener**: a single warm line from GPT-5-mini, calibrated to the shared emotional vector — placed as the first message the two strangers see.
- **Ephemeral chat** via Google Sheets polling, with a 30-minute re-match cooldown.

## 3. Demo / User Flow

```
Landing page ("Begin now to enter your emotion world")
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
POST to n8n "Emotion-Intake" → row written to Google Sheets
    ↓
POST to n8n "Emotion-Match"  → smallest-distance partner picked, opener generated
    ↓
Chat view: AI opener rendered as partner's first message
    ↓
User closes chat OR 30-min zombie release
    ↓
"the moment dissolves. you carry what stayed."
```

## 4. System Architecture

```
 ┌─────────────┐     HTTPS    ┌──────────┐     Sheets API    ┌──────────────┐
 │  Lovable    │ ───────────▶ │   n8n    │ ────────────────▶ │ Google Sheet │
 │  (React SPA)│ ◀───────────  │ workflows│ ◀────────────────  │ (v_users +   │
 └─────────────┘               │ + GPT-5  │                    │  v_messages) │
         ▲                     │  -mini   │                    └──────────────┘
         │                     └──────────┘
         │  fetch every 2.5 s (chat-poll)
         │
         └── Browser localStorage holds session_id only
```

- **Frontend (Lovable):** a React/Vite SPA that handles UI, session UUID in localStorage, loading bucket JSONs, and calling n8n webhooks over HTTPS. No backend code.
- **Backend (n8n):** five webhook-triggered workflows that own all business logic — vector math, matching, AI opener generation, chat message relay, match teardown.
- **Database (Google Sheets):** two tabs — `user_vectors` (one row per user) and `chat_messages` (one row per message). n8n reads and writes via its built-in Google Sheets node.
- **LLM (GPT-5-mini):** invoked only inside the `Emotion-Match` workflow, via n8n's built-in ChatGPT node. No external API key in the frontend.
- **Image dataset:** static Unsplash URLs committed to this repo under `picture-dataset/`, served to the browser from Lovable's `public/` folder. Image metadata (deltas, theme, round) travels with each image.

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
   - same `final_D` (same dominance mode)
   - AND one of:
     - `matched_user_id` is empty (never matched), OR
     - `match_ended_at` is set (partner left), OR
     - `match_timestamp` is older than 30 minutes (zombie release)
3. **Scores** each candidate by Euclidean distance on `(final_P, final_A)`:
   `d = sqrt((P1-P2)² + (A1-A2)²)`
4. **Ranks** smallest-first, tiebroken by earliest `timestamp` (FIFO — the user who has been waiting longest wins).
5. **Atomically updates** both rows with `matched_user_id`, `match_timestamp`, and clears `match_ended_at`.
6. **Calls GPT-5-mini** (via the built-in n8n OpenAI node) with both vectors as context, asking for a single warm opener under 20 words.
7. **Returns** `{ matched: true, partner_session_id, match_pair_id, opener, match_timestamp }` to the frontend.

If no eligible candidate exists, returns `{ matched: false, message: "you are the first one here right now. please wait." }`. The frontend retries every 3 s.

## 7. How n8n Is Used

n8n is the full backend. No custom server code — every piece of business logic lives in a visual n8n workflow.

### Workflows

| Workflow | Trigger | What it does |
| -------- | ------- | ------------ |
| `emotion-intake` | POST webhook | Validate + compute PAD vector server-side, append to `user_vectors` tab. |
| `emotion-match`  | POST webhook | Read sheet → filter eligibility → rank by distance → atomic dual update → call GPT-5-mini for opener → respond. |
| `chat-send`      | POST webhook | Append a message to the `chat_messages` tab. |
| `chat-poll`      | GET webhook  | Return messages for a `match_pair_id` newer than `since`. Lovable polls every 2.5 s. |
| `match-end`      | POST webhook | Stamp `match_ended_at` on both rows so they re-enter the pool. |

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

### `user_vectors`

| Column            | Type         | Notes |
| ----------------- | ------------ | ----- |
| `session_id`      | string (UUID) | Browser-generated, stored in localStorage |
| `timestamp`       | ISO 8601     | Row creation time |
| `initial_P`       | number       | From Q1 |
| `initial_A`       | number       | From Q2 |
| `final_P`         | number       | After image rounds |
| `final_A`         | number       | After image rounds |
| `final_D`         | number       | 0 or 1 from Q3, never changes |
| `matched_user_id` | string / "" | Partner's `session_id`, or empty |
| `match_timestamp` | ISO 8601 / "" | When the match was made |
| `match_ended_at`  | ISO 8601 / "" | When either party left the chat |

### `chat_messages`

| Column            | Type         | Notes |
| ----------------- | ------------ | ----- |
| `message_id`      | string (UUID) | Deduplication key for the frontend |
| `match_pair_id`   | string       | Deterministic `[id_a, id_b].sort().join('__')` |
| `from_session_id` | string       | Who sent it |
| `text`            | string       | Up to 1000 chars |
| `timestamp`       | ISO 8601     | Send time |

### Why Sheets is fine for v1

- Zero setup — a fresh sheet + the n8n Google Sheets node is live in minutes.
- Transparent — you can watch users arrive and match in a browser tab.
- Reversible — every write is undoable with Ctrl+Z.
- Replaceable later — n8n abstracts the data layer; swapping for Postgres or Firestore is a node swap, not a rewrite.

### Why Sheets is **not** fine for prod

- No atomic transactions — under concurrent matchers, two simultaneous POSTs could both "win" the same candidate. For v1 demo traffic this is acceptable.
- Polling-based chat (2.5 s) is noticeable latency compared to a realtime DB.
- Read performance degrades beyond a few thousand rows.

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
├── .env.example               # public template
├── .env                       # gitignored — real n8n token lives here
├── README.md                  # this file
├── user_vectors.csv           # header-only CSV template for the Sheets tab
├── picture-dataset/
│   ├── README.md              # dataset schema + delta rubric
│   ├── bucket_1.json ... bucket_9.json
├── n8n-workflows/
│   ├── README.md              # import + activation steps
│   ├── emotion-intake.json
│   ├── emotion-match.json
│   ├── chat-send.json
│   ├── chat-poll.json
│   └── match-end.json
├── lovable-prompts/
│   ├── README.md
│   ├── 01-scaffold.md
│   ├── 02-questions.md
│   ├── 03-image-rounds.md
│   ├── 04-waiting-and-match.md
│   └── 05-chat.md
├── docs/
│   ├── delta-rubric.md        # scoring rationale
│   └── setup.md               # end-to-end setup checklist
└── archive/
    └── cc-1st/                # archived v0 EchoWander 3D-globe concept
```

See [`docs/setup.md`](docs/setup.md) for the full setup checklist.

## Credits

- Russell, J. A. & Mehrabian, A. (1977). *Evidence for a Three-Factor Theory of Emotions.* Journal of Research in Personality.
- Images: [Unsplash](https://unsplash.com/license) — free commercial use with attribution. See each image's `photographer_credit`.
- LLM: GPT-5-mini via n8n's built-in ChatGPT node.
- Frontend generation: [Lovable](https://lovable.dev).
- Backend orchestration: [n8n](https://n8n.io).

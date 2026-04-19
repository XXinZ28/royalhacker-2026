# n8n Workflows — End-to-End Logic

Every HTTP endpoint the Lovable frontend calls, and every scheduled background task, is an n8n workflow. There is no custom server code. This document walks through each of the nine workflows, explaining what it does, why each step is there, and which design decisions were load-bearing for the hackathon demo.

For high-level flow diagrams, see [architecture.md](architecture.md). For the import + credential setup, see [setup.md](setup.md) and [`../n8n-workflows/README.md`](../n8n-workflows/README.md).

---

## Map of the nine workflows

| # | File | Trigger | Cost per call | Purpose |
|---|------|---------|---------------|---------|
| 1 | `emotion-intake.json` | POST `/webhook/emotion-intake` | 1 sheet write + 0–1 LLM call | Compute PAD vector + geocode city, write the user's row |
| 2 | `emotion-match.json` | POST `/webhook/emotion-match` | 1 sheet read + 1 sheet write | Find a partner, stamp both rows, return an opener |
| 3 | `chat-send.json` | POST `/webhook/chat-send` | 1 sheet write | Append one chat message |
| 4 | `chat-poll.json` | GET `/webhook/chat-poll` | 2 sheet reads | Return new messages + pair_status |
| 5 | `match-end.json` | POST `/webhook/match-end` | 1 sheet update | Stamp `match_ended_at` on both rows |
| 6 | `match-feed.json` | GET `/webhook/match-feed` | 1 sheet read | Feed the 3D globe |
| 7 | `postcard-generate.json` | POST `/webhook/postcard` | 2 sheet reads + 1 LLM call | Generate the end-of-chat postcard |
| 8 | `demo-reset.json` | cron / 2 min | 1 sheet read + 0–1 write | Keep 12 demo partners perpetually available |
| 9 | `chat-timeout.json` | cron / 1 min | 2 sheet reads + 0–1 write | Auto-end pairs idle >15 min |

Total infrastructure: **one Google Sheet, zero servers, no auth database, no real-time service**. Everything else is n8n.

---

## 1. `emotion-intake` — vector computation + geocoding

**Contract**

- **In:** `{ session_id, initial_P, initial_A, final_D, match_mode, city, lat?, lng?, selections: [{round, choice, p_delta, a_delta} × 3] }`
- **Out:** `{ ok, session_id, final_P, final_A, final_D, match_mode, city, lat, lng }`
- **Side effect:** one row appended to `user_vectors`

**Pipeline**

```
Webhook → Compute Vector → Needs Geocode? ─┬─ Normalize City (GPT) → Parse Geocode ─┐
                                           └─ (direct pass-through) ────────────────┤
                                                                                    ▼
                                                                    Merge Geo → Append to Sheet → Respond
```

**Compute Vector** (JS code node) — the entire intake math lives here in one function:

1. Pulls the three image-round selections, averages their `p_delta`s and `a_delta`s:
   ```js
   final_P = initial_P + avg([p_delta₁, p_delta₂, p_delta₃]) × 0.5
   final_A = initial_A + avg([a_delta₁, a_delta₂, a_delta₃]) × 0.5
   ```
2. The `× 0.5` multiplier caps each user's drift at ±0.15 per axis, which mathematically guarantees the starting quadrant never flips. This is intentional — image rounds fine-tune within a quadrant, they don't allow jumping across the P=0 or A=0 axes.
3. Tries a **hardcoded lookup of 90 major cities** (Copenhagen, Tokyo, Moscow, São Paulo, …). If the city name matches any key (case-insensitive, hyphen-normalized), lat/lng is filled from the dict and the GPT path is skipped entirely — zero LLM cost for the 90 most common cases.
4. Handles `(lat=0, lng=0)` specially: that's literally in the Atlantic off Africa (Null Island), no city is there — it's the signature of a failed browser geolocation. These are cleared to empty string so the IF node routes them through the GPT geocoder instead of writing 0,0 to the sheet.

**Needs Geocode? (IF)** — splits traffic:

- If `lat === ''` (unknown city or failed geolocation) → GPT path
- Else → direct pass-through (hardcoded-city or browser-provided coords)

**Normalize City (GPT)** — a LangChain Agent node paired with `lmChatOpenAi` running `gpt-5-mini`. System prompt:

> You are a geocoding service. The user gives a city name in any language, script, or casing. Respond with ONLY a single JSON object: `{"city":"Canonical English name","lat":NUMBER,"lng":NUMBER}`. If the input is not a recognizable populated place, respond with `{"city":"","lat":null,"lng":null}`.

Input is the raw `city` string. Output hits **Parse Geocode**, which:

- Strips any accidental code fences from the LLM output
- Tries `JSON.parse`; falls back to regex extraction if the LLM wrapped the JSON in prose
- Validates that lat/lng are finite numbers and not (0,0)
- Accepts string-numbers (`"35.68"`) — some LLM responses aren't strictly typed

**Merge Geo** — recombines the two branches so there's exactly one item entering the sheet write.

**Append to Sheet** — writes to `user_vectors` using autoMapInputData mode. The schema on this node pins all 23 column names in order; the upstream object keys must match exactly.

**Why this design:**
- Hardcoded lookup first + LLM fallback means we pay for GPT **only** on long-tail inputs. At a booth where 95% of visitors will type a known city, we touch zero LLM quota.
- The LLM is the only way to handle "東京" → "Tokyo" or "Москва" → "Moscow". A lookup table of every city in every script is not feasible; a 100ms GPT call is.
- Dual-path (IF → Merge) ensures exactly one row is written per intake, regardless of which branch ran.

---

## 2. `emotion-match` — partner selection

**Contract**

- **In:** `{ session_id, final_P, final_A, final_D, match_mode, city, lat?, lng? }`
- **Out:** `{ matched: bool, partner_session_id?, match_pair_id?, opener?, me {…}, partner {…}, match_timestamp?, match_mode }`
- **Side effect:** if matched, both rows get `matched_user_id`, `match_timestamp` updated and `match_ended_at` cleared

**Pipeline**

```
Webhook → Read Users → Pick Partner → Generate Opener → Stamp Match → Respond
```

**Pick Partner** (JS) — the entire matching algorithm in one code node. Eligibility filter per candidate row:

1. `session_id !== me.session_id` (don't match yourself)
2. **Recency**: for non-demo rows, the candidate must have intaked within the last 30 minutes. This prevents matching against day-old sheet data during booth demos. `demo_*` rows bypass this because they're seeded standing partners, not live users.
3. **Mutual mode**: `candidate.match_mode === me.match_mode` — Echo users only match Echo users, Healing only Healing. No cross-mode pairing, ever.
4. **D rule**:
   - Echo mode: `candidate.final_D === me.final_D` (same dominance — both want to talk, or both want to listen)
   - Healing mode: `candidate.final_D !== me.final_D` (complementary — one talks, one listens)
5. **Availability** (at least one of):
   - `matched_user_id` is empty (never matched), OR
   - `match_ended_at` is non-empty (partner already left), OR
   - `match_timestamp` is older than 30 min (zombie release — protects against users who close the browser without ending the match)

After filtering, candidates are **scored by Euclidean distance** on `(final_P, final_A)` and sorted smallest-first. Ties break by earliest `timestamp` (FIFO — whoever has been waiting longest wins).

**Real-user priority**: after scoring, candidates are partitioned into real vs demo pools. The demo pool is only used if the real pool is empty. This guarantees two real booth visitors always match with each other rather than with a demo partner.

**Generate Opener** (JS) — **not an LLM call**. A curated bank of 24 hand-written lines, indexed by `match_mode × quadrant` (echo-joy / echo-calm / echo-anxious / echo-melancholy / healing-joy / …). Picks one of three variants per cell deterministically.

> Why not GPT? Because the opener is on the critical path between "match found" and "chat visible". A 300 ms LLM call there would double the perceived match latency. GPT is used elsewhere (intake geocoding, postcard highlight) where latency is hidden. Here it isn't.

**Stamp Match** — writes `matched_user_id = partner.session_id` + `match_timestamp = now` + `match_ended_at = ""` to both rows.

**`match_pair_id` construction**: `[me.session_id, partner.session_id].sort().join('__')`. Deterministic — both sides compute the same ID without coordination. This is the chat room key.

---

## 3. `chat-send` — message append

**Contract**

- **In:** `{ match_pair_id, from_session_id, text, timestamp }`
- **Out:** `{ ok, message_id }`
- **Side effect:** one row appended to `chat_messages`

**Pipeline**

```
Webhook → Build Row → Append Message → Respond
```

**Build Row** generates a UUID for `Message Id` and normalizes the timestamp. The subtle part is column naming: `chat_messages` was seeded with PascalCase headers (`Message Id`, `Match Pair Id`, `From Session Id`, `Text`, `Timestamp`). chat-send writes in PascalCase to match the sheet. Chat-Poll translates back to snake_case for the frontend. This split keeps the sheet human-readable and the API contract machine-friendly.

---

## 4. `chat-poll` — message fetch + pair status

**Contract**

- **In:** query params `?match_pair_id=…&since=<iso>`
- **Out:** `{ messages: [{message_id, from_session_id, text, timestamp}], pair_status: 'active' | 'ended', ended_at? }`

**Pipeline**

```
Webhook ─┬─ Read Messages ─┐
         └─ Read Users   ──┴─ Merge → Filter & Sort
```

The parallel reads matter: in addition to the expected chat message fetch, chat-poll **also reads `user_vectors`** to determine whether the pair has ended. The signal lives in `user_vectors.match_ended_at`, not in `chat_messages`.

**Filter & Sort** (JS):

1. Filter messages to those matching `match_pair_id` and with `timestamp > since`
2. Sort ascending by timestamp
3. Re-key PascalCase → snake_case
4. Drop legacy system rows (`from_session_id === 'system'` or `text` starting with `__`) — these are cleanup for an earlier design where chat-end signaling was done by injecting a fake message
5. Check both user rows for the pair: if either has `match_ended_at` set → `pair_status = 'ended'`

**Why this design:** the frontend polls chat-poll every 2.5 s anyway. Folding the pair status check into the same response means zero additional requests for end-of-chat detection. A separate `/chat-status` endpoint would halve the polling frequency per concern but double the number of requests per second.

---

## 5. `match-end` — end the pair

**Contract**

- **In:** `{ session_id, partner_session_id }`
- **Out:** `{ ok }`
- **Side effect:** `match_ended_at = now` stamped on both rows

**Pipeline**

```
Webhook → Build Rows → Update Sheet → Respond
```

Extremely simple. Does **not** write to `chat_messages`. The end signal reaches the other side via chat-poll's `pair_status`. This is a deliberate simplification from v1, where match-end used to inject a `__partner_left__` system message into `chat_messages` — that approach required dedup and filter logic in chat-poll, which was a bug magnet.

---

## 6. `match-feed` — the globe's data source

**Contract**

- **In:** query params `?since=<iso>&limit=<n>`
- **Out:** `{ matches: [{from: {city,lat,lng}, to: {city,lat,lng}, mode, final_P, final_A, intensity, timestamp, match_pair_id}, …] }`

**Pipeline**

```
Webhook → Read Users → Build Feed
```

**Build Feed** (JS) does three non-trivial things:

1. **Dedupes pairs.** When A matches B, both `user_vectors` rows have `matched_user_id` set. A naive read would emit two arcs (A→B and B→A). Build Feed uses the canonical `match_pair_id` as the dedup key so each physical match appears exactly once.
2. **Coordinate fallback.** If either user's row has empty `city/lat/lng`, Build Feed falls back to a deterministic hash-bucket: `hash(session_id) % 22` into a ring of hub cities. This guarantees the globe never shows a match as (0,0) or a broken arc. Copenhagen is weighted 2× so the host city visibly dominates the booth display.
3. **Intensity calculation.** Arc visual intensity = `1 - min(age_minutes / 10, 0.7)` — freshly-formed matches glow brighter than matches from 10 minutes ago. This gives the globe a "live heartbeat" quality.

---

## 7. `postcard-generate` — end-of-chat memento

**Contract**

- **In:** `{ match_pair_id, session_id, image_urls: [url, url, …] }`
- **Out:** `{ ok, highlight, subtitle, me_city, me_lat, me_lng, partner_city, partner_lat, partner_lng, mode, quadrant, bucket, message_count, duration_minutes, background_image_url }`

**Pipeline**

```
Webhook ─┬─ Read Users   ──┐
         └─ Read Messages ─┴─ Merge → Prepare Context → Has Chat? ─┬─ Highlight Agent → Build Postcard
                                                                   └─ No-Chat Fallback ↑
```

**Prepare Context** (JS) — assembles everything the downstream nodes need:

- Both users' rows (city, PAD vector, mode)
- Full message transcript for the pair, sorted by timestamp
- Duration (match_timestamp → latest message or match_ended_at)
- Emotional quadrant classification from the requester's `(P, A)`

**Has Chat? (IF)** — was anything actually said? This gate exists because the LLM can't generate a "highlight grounded in the conversation" if the conversation is empty.

- `message_count > 0` → **Highlight Agent** (LangChain + `gpt-5-mini`) is prompted to read the transcript and extract a single emotional beat. System prompt emphasizes: one line, no greetings, no summaries, quote or paraphrase something actually said.
- `message_count === 0` → **No-Chat Fallback** (JS) returns a canned line like *"two silences found each other in the same room"*. Same output shape so Build Postcard doesn't care which path produced it.

**Build Postcard** (JS):

- Deterministically picks one URL from `image_urls[]` using a hash of `match_pair_id` as the index. This guarantees both users see the **same postcard background** — they can compare later without coordination.
- Computes a `bucket` label (1–9 based on shared quadrant) and writes all display fields into the response shape.

**Why generate from real chat:** a generic "you two shared a moment" line is forgettable. A line that paraphrases something the user actually said is what makes the postcard screenshot-worthy. This is the one place in the system where LLM cost is clearly justified.

---

## 8. `demo-reset` — cron, every 2 min

**Pipeline**

```
Schedule (2 min) → Read Users → Filter Demo Rows → Clear Match Fields
```

Filters `user_vectors` to rows where `session_id` starts with `demo_`, and clears their `matched_user_id`, `match_timestamp`, and `match_ended_at` columns. Runs whether there's traffic or not.

**Why it exists:** the sheet is seeded with 12 `demo_*` partners (3 per `mode × D` combination — 2 modes × 2 D values × 3 variants = 12). Without periodic reset, the first booth visitor "consumes" a demo partner for 30 minutes (the cooldown). At a hackathon booth with ~50 visitors/hour, we'd run out of demos fast. The 2-minute reset means every new visitor finds a fresh demo pool.

**Why 2 minutes, not 30 seconds:** demo-reset running during an active demo visitor's chat would reset their matched demo partner out from under them. A 2-minute interval is long enough for a demo visitor to complete a full match + chat start (~40 seconds) without interference, but short enough that the pool is always ready within a visitor's patience window.

---

## 9. `chat-timeout` — cron, every 1 min

**Pipeline**

```
Schedule (1 min) → Read Users → Read Messages → Find Stale Pairs → Stamp Ended At
```

**Find Stale Pairs** (JS) — for each row where `matched_user_id` is set and `match_ended_at` is not:

1. Compute `last_activity = max(match_timestamp, latest chat_messages.timestamp for this pair)`
2. If `now - last_activity > 15 min` → mark both rows for stamping

**Stamp Ended At** — sets `match_ended_at = now` on flagged rows.

**Why it exists:** users close the browser without clicking "leave". Without this workflow, `matched_user_id` stays set on both sides forever, blocking both users from rematching until the 30-minute zombie release. Chat-timeout catches these dead pairs proactively.

**Why 15 min and not 30 min:** the implicit "zombie release" in emotion-match is the backstop, not the primary mechanism. If a pair has been silent for 15 minutes, the chat is over regardless of whether the users formally ended it. Stamping at 15 minutes means the **globe stops showing a dead match as live** and **both users' `pair_status` in chat-poll flips to `ended`** — the UX signal, not the DB cleanup, is why we do this at 15 min.

---

## The LLM story — what runs on n8n's free AI credits

Only **LangChain Agent nodes** (`@n8n/n8n-nodes-langchain.agent`) connected to **OpenAI Chat Model** nodes (`@n8n/n8n-nodes-langchain.lmChatOpenAi`) route through n8n's free AI credit proxy.

The classic `n8n-nodes-base.openAi` node returns 404 regardless of model — a documented quirk of the free tier.

Two workflows use LLMs:

1. **Emotion-Intake** → `Normalize City (GPT)`: converts non-English/misspelled city names to canonical English + coordinates. Only runs when the hardcoded 90-city lookup misses.
2. **Postcard-Generate** → `Highlight Agent`: generates one line grounded in the actual chat transcript. Only runs when there are messages.

Model: `gpt-5-mini` (preferred), `gpt-4.1-mini` / `gpt-4o-mini` also work as fallbacks. Credential: the built-in "n8n free OpenAI API credits" OAuth.

**If the free credits run out mid-event**: change the credential on both `lmChatOpenAi` nodes to a personal `openAiApi` credential with an `OPENAI_API_KEY`. Zero prompt changes needed — the LangChain abstraction insulates the system from the credit source.

---

## Hard constraints enforced across all workflows

These are wired into the code nodes and aren't negotiable at runtime:

1. **Same `final_D` required in Echo mode; opposite `final_D` required in Healing mode.** Never mix.
2. **Healing mode requires mutual opt-in.** Both sides must have stored `match_mode = 'healing'` before they can be paired.
3. **30-minute rematch cooldown** for already-matched users (via `match_timestamp` age check).
4. **Tab references use `mode: "name"`**, never hardcoded gid values. Gids in the URL bar can point to hidden `fake_*` tabs. Using tab names makes the workflows portable across spreadsheet reorgs.
5. **`chat_messages` keeps PascalCase sheet headers.** Chat-Send writes PascalCase. Chat-Poll re-keys to snake_case.
6. **Match-End and Chat-Timeout only stamp `match_ended_at`.** They never write to `chat_messages`. The end-of-chat signal is delivered via Chat-Poll's `pair_status`.
7. **Emotion-Match never pairs against a real user row older than 30 minutes.** Demo rows bypass this because they're standing partners, not live users.
8. **Image URL pool** for Postcard-Generate is passed in by the requester (`image_urls[]`). The workflow doesn't fetch its own images — this keeps the LLM cost bounded and the postcard reproducible.

---

## How the nine workflows compose into one product

```
  User journey           Workflows touched
  ──────────────         ─────────────────
  Answer questions ─────▶ emotion-intake  ────────▶ sheet: user_vectors
                                                           │
  Wait for match   ─────▶ emotion-match   ──read──▶        │
                                          ──write─▶        │
                                                           │
  Chat             ─────▶ chat-send       ────────▶ sheet: chat_messages
                   ─────▶ chat-poll       ──read──▶ both tabs
                                                           │
  Leave            ─────▶ match-end       ────────▶ sheet: user_vectors
                                                           │
  Postcard         ─────▶ postcard-generate ─read─▶ both tabs
                                                           │
  Globe display    ─────▶ match-feed      ──read──▶ sheet: user_vectors
                                                           │
  (background)     ─────▶ demo-reset      ─────────▶ sheet: user_vectors
                   ─────▶ chat-timeout    ─────────▶ sheet: user_vectors
```

One sheet. Two tabs. Nine workflows. Zero servers. That's the entire backend of Resonance.

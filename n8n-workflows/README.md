# n8n Workflows

Nine workflows power the backend. All live on the same n8n instance, read/write the same Google Sheet, and expose public webhooks called from the Lovable frontend (plus two internal crons).

| File | Method / Path | Purpose |
| ---- | ------------- | ------- |
| `emotion-intake.json` | POST `/webhook/emotion-intake` | Receive Q1–Q3 + image `selections[]` + `city` (+ optional `lat`/`lng`). Tries hardcoded 90-city lookup first; if unknown, routes through a **LangChain Agent + gpt-5-mini** node that normalizes the city name (any language/script/casing) and returns canonical English + coords. Falls back to blank coords for non-places. Computes `final_P`/`final_A`, appends row to `user_vectors`. |
| `emotion-match.json`  | POST `/webhook/emotion-match`  | Read all users, enforce **recency**: real-user candidates must have intaked within the last 30 min (`demo_*` bypass this). Then filter by mutual `match_mode` + D-rule (same in echo, opposite in healing). Rank by smallest Euclidean `(P,A)` distance, FIFO tiebreak. Prefers real users over seeded `demo_*` fallback. Response includes `me {city,lat,lng,…}`, `partner {city,lat,lng,…}`, `opener`, `match_pair_id`. |
| `chat-send.json`      | POST `/webhook/chat-send`      | Append a chat message to the `chat_messages` tab using its original PascalCase headers. |
| `chat-poll.json`      | GET  `/webhook/chat-poll`      | Reads both `chat_messages` AND `user_vectors` in parallel. Returns `{messages: […], pair_status: 'active' \| 'ended', ended_at}`. Filters out any legacy system rows (`from_session_id === 'system'` or `text` starting with `__`). Re-keys PascalCase to snake_case. |
| `match-end.json`      | POST `/webhook/match-end`      | Stamps `match_ended_at` on both user rows. Does **not** write to `chat_messages` — end-of-chat signaling is delivered via Chat-Poll's `pair_status`, not through fake message rows. |
| `match-feed.json`     | GET  `/webhook/match-feed`     | Feed the 3D globe. Dedupes matched pairs, uses stored city/lat/lng when present, falls back to deterministic hub for rows with no coords. Query: `?since=<iso>&limit=<n>`. |
| `postcard-generate.json` | POST `/webhook/postcard`    | Given `{match_pair_id, session_id, image_urls?[]}`, reads both users from `user_vectors` and the pair's messages from `chat_messages`, uses **LangChain Agent + gpt-5-mini** to generate a one-line highlight grounded in the actual conversation. Picks a deterministic background image per pair from the supplied `image_urls`. Returns full postcard payload (highlight, subtitle, both cities+coords, mode, quadrant, bucket, message_count, duration_minutes, background_image_url). Has a no-chat fallback line when 0 messages were exchanged. |
| `demo-reset.json`     | cron, every 2 min              | Clears `matched_user_id` / `match_timestamp` / `match_ended_at` on all rows whose `session_id` starts with `demo_`, so 12 seeded demo partners are always available for solo booth demos. |
| `chat-timeout.json`   | cron, every 1 min              | Finds matched pairs whose last activity is >15 minutes old (max of `match_timestamp` and latest `chat_messages` timestamp), stamps `match_ended_at` on both rows. Does **not** write to `chat_messages` — Chat-Poll's `pair_status` covers the signal. |

## Google Sheet tabs

- **`user_vectors`** — 23 columns:
  `session_id, timestamp, initial_P, initial_A, final_P, final_A, final_D, match_mode, matched_user_id, match_timestamp, match_ended_at, round1_choice, round1_p_delta, round1_a_delta, round2_choice, round2_p_delta, round2_a_delta, round3_choice, round3_p_delta, round3_a_delta, city, lat, lng`
- **`chat_messages`** — 5 columns (PascalCase in sheet, snake_case in webhook response):
  `Message Id, Match Pair Id, From Session Id, Text, Timestamp`

Do **not** modify the `fake_users` / `fake_chat_messages` tabs — only the first two are live.

## Before importing (fresh n8n instance)

1. Create the Google Sheet with the two tabs above (headers in row 1 exactly as listed).
2. In n8n, create an **OAuth2 Google Sheets** credential and connect your Google account.
3. Import each JSON via **n8n UI → Workflows → Import from File** *or* POST to `/api/v1/workflows` with the public API token.
4. In each imported workflow, open every Google Sheets node and re-select the credential — n8n doesn't carry credential IDs across instances.
5. The workflows reference the live sheet ID directly (hardcoded inside each node) and reference tabs by **name** (`user_vectors`, `chat_messages`), not by gid, so tabs can move around safely.
6. Activate each workflow (toggle top-right). Demo-Reset runs every 2 minutes on its own schedule; the rest are webhook-triggered.
7. Copy the webhook URLs into the Lovable `.env` as `VITE_N8N_*` (see `DEPLOYED.json` for the mapping).

## Matching eligibility (implemented in `emotion-match.json → Pick Partner`)

A candidate row is eligible if ALL of:

- `session_id` != current user's
- candidate's stored `match_mode` == current user's `match_mode` (mutual opt-in; legacy blank reads as `echo`)
- in **echo** mode: `final_D` equal
- in **healing** mode: `final_D` opposite
- one of:
  - `matched_user_id` is empty, OR
  - `match_ended_at` is non-empty, OR
  - `match_timestamp` is more than 30 minutes old (zombie release)

Ranking: smallest Euclidean distance on `(final_P, final_A)`, tiebreak earliest `timestamp` (FIFO). After ranking, **real users take priority** — `demo_*` partners are only selected when no real candidate exists.

## Opener generation

The `Generate Opener` node inside `emotion-match.json` is a **JS code node**, not an OpenAI node. It picks from a curated bank of 24 lines keyed by `match_mode × emotional_quadrant` (joy / calm / anxious / melancholy). Zero external API, zero failure mode at the booth. The real GPT-based generation is used elsewhere (city normalization in intake, postcard highlight), which proves `gpt-5-mini` works through the n8n free AI credits — but keeping the opener deterministic avoids double latency on the hot match path.

## LLM usage (what works on n8n free AI credits)

Only the **LangChain** nodes route through the free AI credits proxy. The classic `n8n-nodes-base.openAi` node returns 404 regardless of model.

Working pattern:
- `@n8n/n8n-nodes-langchain.agent` (with `promptType: "define"` + `text` prompt)
- connected to `@n8n/n8n-nodes-langchain.lmChatOpenAi` via the `ai_languageModel` handle
- model: `gpt-5-mini` (preferred), `gpt-4.1-mini`, `gpt-4o-mini` all respond
- credential: the built-in "n8n free OpenAI API credits" OAuth

If credits run out mid-event, swap the `lmChatOpenAi` node's credential to a real `openAiApi` credential with a personal `OPENAI_API_KEY` — no prompt changes needed.

## Hard constraints (enforced)

- Echo: same `final_D` required. Healing: opposite `final_D` and both sides must have set `match_mode = 'healing'`.
- 30-minute re-match cooldown.
- All tab references use `mode: "name"` — never hardcode gid values from URL bars (the URL gid can be showing a `fake_*` tab).
- `chat_messages` keeps its original PascalCase sheet headers; Chat-Send writes PascalCase, Chat-Poll re-keys to snake_case on response.
- Match-End only stamps `match_ended_at` on user_vectors. **It no longer writes to chat_messages.** The frontend detects end-of-chat via Chat-Poll's `pair_status` field (`"active"` or `"ended"`).
- Chat-Timeout (cron, 1 min) auto-ends any matched pair idle more than 15 minutes by stamping `match_ended_at`. Same signal path as Match-End — Chat-Poll surfaces it via `pair_status`.
- Emotion-Match will **never** pair against a real user whose row is older than 30 minutes (`demo_*` rows bypass this). This prevents matching against day-old sheet data during a booth demo.

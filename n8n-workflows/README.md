# n8n Workflows

Five workflows power the backend. All live on the same n8n instance, read/write the same Google Sheet, and expose public webhooks called from the Lovable frontend.

| File | Method / Path | Purpose |
| ---- | ------------- | ------- |
| `emotion-intake.json` | POST `/webhook/emotion-intake` | Receive Q1–Q3 + image selections, compute `final_P`/`final_A`, append row to `user_vectors` tab. |
| `emotion-match.json`  | POST `/webhook/emotion-match`  | Read all users, filter by same `final_D` + eligibility, pick smallest Euclidean distance (FIFO tiebreak), atomically update both rows, generate GPT-5-mini opener. |
| `chat-send.json`      | POST `/webhook/chat-send`      | Append a chat message to the `chat_messages` tab. |
| `chat-poll.json`      | GET  `/webhook/chat-poll`      | Return all chat messages for a `match_pair_id` newer than `since`. Lovable polls every 2–3 s. |
| `match-end.json`      | POST `/webhook/match-end`      | Stamp `match_ended_at` on both rows so they re-enter the pool. |

## Google Sheet tabs

- `user_vectors` — columns: `session_id, timestamp, initial_P, initial_A, final_P, final_A, final_D, matched_user_id, match_timestamp, match_ended_at`
- `chat_messages` — columns: `message_id, match_pair_id, from_session_id, text, timestamp`

## Before importing

1. Create the Google Sheet with the two tabs above (headers in row 1).
2. In n8n, create an **OAuth2 Google Sheets** credential and connect your Google account.
3. In n8n, attach your built-in OpenAI/ChatGPT credential to the `Generate Opener` node inside `emotion-match.json`.
4. Set env var `GOOGLE_SHEET_ID` in n8n (Settings → Variables) to the sheet's ID from its URL.
5. Import each JSON via **n8n UI → Workflows → Import from File** *or* deploy via the Public API using the token in `.env`.
6. In each imported workflow, open each Google Sheets / OpenAI node and re-select the credential (n8n doesn't carry credential IDs across instances).
7. Activate each workflow (toggle top-right) and copy the webhook URLs into the Lovable `.env` as `VITE_N8N_*`.

## Matching eligibility (implemented in `emotion-match.json → Pick Partner`)

A candidate row is eligible if ALL of:

- `session_id` != current user's
- `final_D` == current user's `final_D`
- one of:
  - `matched_user_id` is empty, OR
  - `match_ended_at` is non-empty, OR
  - `match_timestamp` is more than 30 minutes old (zombie release)

Ranking: smallest Euclidean distance on `(final_P, final_A)`, tiebreak earliest `timestamp` (FIFO).

## Hard constraints (enforced)

- Same `final_D` required (never mix 🗣️ and 💡).
- 30-minute re-match cooldown.
- Opener uses built-in n8n GPT-5-mini node only (no external API).

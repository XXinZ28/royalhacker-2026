# Setup

End-to-end checklist to go from empty repo → live demo.

## 1. Google Sheet

1. Go to [sheets.new](https://sheets.new) — sign in with the Google account that will own the data.
2. Rename the sheet to **`resonance-users`**.
3. Rename the first tab to **`user_vectors`** and paste the header row:
   ```
   session_id,timestamp,initial_P,initial_A,final_P,final_A,final_D,matched_user_id,match_timestamp,match_ended_at
   ```
4. Add a second tab named **`chat_messages`** with header row:
   ```
   message_id,match_pair_id,from_session_id,text,timestamp
   ```
5. Copy the sheet ID from the URL (the long string between `/d/` and `/edit`). Paste it into `.env` as `GOOGLE_SHEET_ID`.
6. Share the sheet with the service account or Google account you'll use in n8n as **Editor**.

## 2. n8n

1. Log in to your n8n instance. Note the base URL (e.g. `https://yourname.app.n8n.cloud`). Paste into `.env` as `N8N_BASE_URL`.
2. **Credentials**:
   - Create a **Google Sheets OAuth2** credential and connect the Google account that owns `resonance-users`.
   - Confirm your built-in **OpenAI / ChatGPT** credential (included in your n8n Pro plan) is present.
3. **Variables** (Settings → Variables): add `GOOGLE_SHEET_ID` with the sheet ID from step 1.
4. **Import workflows**: for each file in `n8n-workflows/`, Workflows → Import from File → select the JSON.
5. In every imported workflow, open each Google Sheets and OpenAI node and re-select the credential dropdown (n8n doesn't keep credential IDs across imports).
6. **Activate** each workflow (toggle top-right).
7. Copy the production webhook URL for each workflow. Paste into `.env`:
   ```
   VITE_N8N_INTAKE_URL=https://<instance>/webhook/emotion-intake
   VITE_N8N_MATCH_URL=https://<instance>/webhook/emotion-match
   VITE_N8N_CHAT_SEND_URL=https://<instance>/webhook/chat-send
   VITE_N8N_CHAT_POLL_URL=https://<instance>/webhook/chat-poll
   VITE_N8N_MATCH_END_URL=https://<instance>/webhook/match-end
   ```

## 3. Lovable

1. Create a new Lovable project.
2. Paste `lovable-prompts/01-scaffold.md` → iterate until it builds clean.
3. Paste prompts 2 → 3 → 4 → 5 in order, one screen per paste.
4. In the Lovable code editor, create `public/picture-dataset/` and copy all nine `bucket_*.json` files from this repo.
5. Set the five `VITE_N8N_*` env vars in Lovable project settings.
6. Deploy.

## 4. Smoke test

1. Open the deployed URL in two different browsers (or normal + private).
2. Browser A: run through questions + rounds. On `/waiting`, it should say "you're the first one here right now."
3. Browser B: run through. It should match Browser A within one poll cycle.
4. Both screens land in `/chat` with the same opener line from GPT-5-mini.
5. Send a message from A → should appear in B within 3 s.
6. One side clicks "leave" → both land on `/ended`.
7. Check the Google Sheet — both `user_vectors` rows have `matched_user_id`, `match_timestamp`, `match_ended_at` populated, and `chat_messages` has your test messages.

## 5. Demo tips

- Pre-seed 2–3 rows in `user_vectors` with varied PAD vectors so the first live user gets an instant match during the pitch.
- Keep your own browser open mid-match on a second screen as a fallback — if no-one is queued, you become their match.
- Practice the one-minute walkthrough: question → rounds → match reveal → opener → chat message.

# Lovable Prompt 5 — Chat View

---

Build the `/chat` screen. The match is already established, the AI opener is in Zustand — render it as the first message from the partner, then open the chat.

## Layout

- Full screen, black background with faint purple/pink nebula glow
- Centered: a large translucent bubble shape (round-ish, slightly irregular) with soft glowing border and a 4 s breathing scale animation
- Messages appear as soft-edged chat cards inside the bubble; user's on the right, partner's on the left
- A subtle header: the shared anonymous tag (see below)
- A footer input: text field + "send" glowing button

## Identities

Generate anonymous spirit handles locally:
- Both users share a "weather word" derived deterministically from their `match_pair_id` (e.g. "BlueMist", "QuietTide", "GoldenRoom", "SlowRain").
- Each user also gets a 2-digit suffix from the last two chars of their own `session_id`.
- Result: "BlueMist #47" vs "BlueMist #12".
- No real names, no avatars beyond the shared handle.

## Opener

On mount, render the `opener` string received from `/match` as the **first partner message**, animated in 600 ms after arrival on the screen.

## Sending a message

When user sends, POST to `VITE_N8N_CHAT_SEND_URL`:
```json
{
  "match_pair_id": "<id>",
  "from_session_id": "<my uuid>",
  "text": "<message>"
}
```

Append it optimistically to the local message list (right side).

## Receiving messages

Poll `VITE_N8N_CHAT_POLL_URL` every 2.5 s:
```
GET /webhook/chat-poll?match_pair_id=<id>&since=<ISO-8601 of last seen>
```

Response: `{ messages: [{ message_id, from_session_id, text, timestamp }, ...] }`. For each message whose `from_session_id !== me`, render on the left.

Dedupe by `message_id` to avoid rendering echoes of your own optimistic sends when they come back.

## Leaving / ending the chat

Top-right: a small "leave" icon. On click:
1. Confirm modal: "end this moment?"
2. If yes, POST to `VITE_N8N_MATCH_END_URL`:
```json
{ "session_id": "<my uuid>", "partner_session_id": "<partner uuid>" }
```
3. Navigate to `/ended`.

If the partner ends first (detected via a `match_ended_at` field returned on the next poll, or a sentinel message), show a soft fade and auto-navigate to `/ended`.

## Polish

- Messages shimmer gently as they arrive
- Bubble has a subtle breathing scale (1.00 → 1.02 → 1.00 over 4 s)
- No typing indicator — keep it quiet
- No message history across sessions — if you refresh, poll from `since=0` to reload

## `/ended` screen

- Centered, full height, starfield fades
- Serif line: *"the moment dissolves. you carry what stayed."*
- Below: a single button "return to the start" → clear transient Zustand state, navigate to `/`

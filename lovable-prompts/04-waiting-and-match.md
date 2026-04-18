# Lovable Prompt 4 — Waiting & Match

---

Build the `/waiting` screen. It appears right after the intake POST returns, and loops a match-poll until a partner is found.

## Visual

- Full screen, black background with slow nebula glow
- Centered: a pulsing orb (CSS radial gradient, 2s breathing animation)
- Below the orb, fading sequential text lines (each ~1.2 s in, ~0.8 s out, staggered):
  1. "mapping your emotional geography..."
  2. "listening for someone like you..."
  3. "three other spirits are in this room tonight."  *(only if > 0 polls without match)*

## Polling

Immediately on mount, POST to `VITE_N8N_MATCH_URL`:
```json
{ "session_id": "<uuid>", "final_P": 0.85, "final_A": 0.10, "final_D": 1 }
```

Response cases:
- `{ matched: true, partner_session_id, match_timestamp, match_pair_id, opener }` → store in Zustand, navigate to `/chat`
- `{ matched: false, message }` → display softly, wait 3 seconds, POST again

Continue polling every 3 seconds up to a max of ~60 seconds, then show:
> "you're the first one here right now. stay a moment, or come back later."
>
> [ Try again ] [ Leave ]

## Back behavior

Browser back from `/waiting` → return to `/` and clear transient state (keep `session_id` in localStorage).

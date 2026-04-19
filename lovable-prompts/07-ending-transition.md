# Lovable Prompt 7 — Ending Transition (white-dwarf supernova → postcard)

Use after `/chat` and `/ended` basics are working (prompt 05). This **replaces** the plain `/ended` fade with a cinematic transition from the chat surface into the postcard reveal.

Metaphor: the chat collapses into a single white-hot point, detonates as a white-dwarf-style supernova (Type Ia burst — the whitest, loudest death in the universe), then the expanding remnant nebula settles into the postcard. Three seconds, screen center, no navigation flicker.

---

## Trigger conditions (any one)

The transition fires when ANY of these becomes true while the user is on `/chat`:

1. Chat-Poll returns `pair_status === "ended"` (partner left, match-end stamped, or chat-timeout cron fired)
2. User clicks the "leave" icon top-right and confirms the modal
3. The local 15-minute match timer elapses (safety net in case polling lags)

Once the transition begins, **lock the chat composer immediately** — no more sends, no more optimistic bubbles — and set `transitionStarted=true` in Zustand so re-renders can't double-fire it. Kick off the `/webhook/postcard` POST in parallel with the animation start so the data is ready by the time the nebula clears.

---

## Route & mount

Do NOT navigate to a new route yet. Render the transition as a full-viewport overlay **on top of** `/chat`. This avoids a white-flash route change and lets the chat fade out beneath the collapse animation. After the last beat, swap route to `/postcard` (which mounts silently under the final frame of the overlay, then the overlay fades out over the postcard).

Route structure:
- `/chat` → overlays `<EndingTransition />` on top → swaps to `/postcard` on completion
- `/ended` is deprecated; redirect to `/postcard` if anyone lands on it

---

## Animation timeline (total 3.0 s)

All stages run in sequence. Use Framer Motion (`motion.div` + `AnimatePresence`) or GSAP. Screen center is `(50vw, 50vh)` in all coordinates below.

### Stage 0 · Chat collapse (0.0 s → 0.6 s)

The conversation physically pulls inward toward screen center.

- Every chat bubble animates:
  - `translate` along a vector pointing from its current position to screen center
  - `scale` from `1.0` → `0.0`
  - `opacity` from `1.0` → `0.0`
  - stagger by DOM order, 30 ms delay between bubbles (newer bubbles collapse first)
- Header bar and composer bar slide off-screen vertically (header up, composer down), 400 ms
- Background starfield (if you added one in prompt 01) compresses radially toward center at the same time — stars streak inward like light entering a black hole
- By 0.6 s the screen is **black**, with a single 2 px white dot at center

Easing: `cubic-bezier(0.55, 0, 0.1, 1)` (strong ease-in — slow start, fast finish into the singularity).

### Stage 1 · Compression flicker (0.6 s → 0.9 s)

The dot isn't stable. A white dwarf at the Chandrasekhar limit is about to go.

- Central dot pulses: 2 px → 8 px → 2 px → 12 px (uneven, jittery)
- Around it, a faint halo (`box-shadow: 0 0 40px 10px rgba(255,255,255,0.3)`) breathes
- Subtle screen-wide chromatic aberration: split the residual black canvas into R/G/B offsets by ±1 px, pulsing at 8 Hz
- Ambient audio (optional): a rising low-frequency hum from ~40 Hz to ~200 Hz, 300 ms (use Web Audio API if easy; skip if it complicates review)

### Stage 2 · Detonation flash (0.9 s → 1.15 s)

This is the beat. Do not be subtle.

- Central dot explodes into a **radial white flash** filling the viewport in 120 ms
  - `radial-gradient(circle at center, #ffffff 0%, #fff8e7 20%, #a78bfa 45%, transparent 80%)`
  - full opacity for 80 ms — this is visually painful-bright by design
- Simultaneous **shockwave ring**: a thin circle (2 px stroke, white, glow `0 0 20px #fff`) expands from `r=0` to `r=max(vw,vh)` in 250 ms, easing `cubic-bezier(0.2, 0.8, 0.2, 1)`
- The whole viewport shakes once: translate `(2px, -2px)` → `(-2px, 3px)` → `0` over 150 ms
- After the 80 ms peak, flash fades from full white down to 40% opacity over the remaining 170 ms as the colors start bleeding in

### Stage 3 · Nebula bloom (1.15 s → 2.3 s)

The remnant. This is where the user exhales.

Colors key off the match's **emotional quadrant** (read from Zustand — the `me.final_P` / `me.final_A` you stored on match). Same palette as the globe from prompt 06:

| Quadrant | Primary | Secondary | Accent |
|---|---|---|---|
| joy (+P +A) | `#fbbf24` amber | `#fb923c` orange | `#ffffff` |
| calm (+P -A) | `#a78bfa` violet | `#c4b5fd` lavender | `#ffffff` |
| anxious (-P +A) | `#22d3ee` cyan | `#67e8f9` ice | `#ffffff` |
| melancholy (-P -A) | `#60a5fa` blue | `#818cf8` indigo | `#ffffff` |
| healing mode (override) | `#f472b6` pink | `#fb7185` rose | `#ffffff` |

Render the nebula as **3–5 overlapping radial gradients** positioned at slightly offset centers (not all at 50/50):
- each gradient: `radial-gradient(ellipse, primary 0%, secondary 30%, transparent 70%)`
- each has its own `scale` animation from `0.3` → `1.6` over 1.1 s
- each has independent slow rotation (`0–360°`, each at different speeds, `8s–14s` linear loops)
- mix-blend-mode: `screen` on all layers
- add a subtle noise/grain overlay at 8% opacity so it looks photographic, not vector

Tiny particulate "sparks" drift outward from center — ~12 small white dots (1–2 px), each with its own velocity, fading over the 1.15 s.

This stage NEVER fully clears. It becomes the background for Stage 4.

### Stage 4 · Postcard emergence (2.3 s → 3.0 s)

The postcard rises from the nebula's core.

- By now, the `/webhook/postcard` POST should have resolved (if not, hold on a faint "composing…" ligature at center until it does — cap this at +1.5 s before timing out to a fallback layout)
- Postcard starts at `scale: 0.2, opacity: 0, translateY: 30px, rotateX: 15deg`
- Animates to `scale: 1.0, opacity: 1.0, translateY: 0, rotateX: 0deg` over 700 ms
- Easing: `cubic-bezier(0.2, 0.9, 0.2, 1)` (soft landing)
- Nebula continues to drift slowly behind — do NOT kill it, the postcard sits ON TOP of a living background
- After 500 ms of the postcard being visible, start router.replace('/postcard') so URL hygiene is maintained; the overlay then unmounts on the next frame without any visual discontinuity

---

## Postcard POST (fires at Stage 0 start, lands during Stage 3)

```ts
fetch(import.meta.env.VITE_N8N_POSTCARD_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    match_pair_id: store.match_pair_id,
    session_id: store.session_id,
    image_urls: curatedBackgroundUrls  // array of 6–12 ambient photo urls for the postcard back
  })
})
```

Response shape (already implemented in `postcard-generate.json`):
```ts
{
  ok: true,
  highlight: string,            // one-line AI-generated from actual chat
  subtitle: string,
  me_city, me_lat, me_lng,
  partner_city, partner_lat, partner_lng,
  mode: 'echo'|'healing',
  quadrant: 'joy'|'calm'|'anxious'|'melancholy',
  message_count: number,
  duration_minutes: number,
  background_image_url: string  // deterministic pick from image_urls[]
}
```

Keep this in Zustand as `store.postcard`. `/postcard` route reads it from there; if it's missing (user deep-links), `/postcard` re-fires the POST on mount.

---

## State machine guard

```ts
// in Zustand
transition: 'idle' | 'collapsing' | 'detonating' | 'blooming' | 'postcard' | 'done'
```

Only `'idle'` can transition to `'collapsing'`. All other states ignore re-triggers. This prevents double-fires when the 15-min timer AND a poll-ended signal arrive in the same tick.

---

## Accessibility

- Respect `prefers-reduced-motion: reduce`. If set:
  - Skip Stages 0–3 entirely; crossfade the chat out and the postcard in over 400 ms on a dim backdrop
  - Do not do the shake or the full-screen flash — these are seizure risks
- Keep a single focusable skip button top-right during Stages 1–3: "skip to postcard" — small, subtle, aria-label set

---

## Don'ts

- Don't add sound unless the Web Audio API wiring is trivial for your stack; silent works fine for this transition
- Don't show the match_pair_id, session_id, or any raw UUIDs anywhere on screen — this is a poetic moment
- Don't retain chat scroll position — by Stage 0's end, the chat DOM should be gone, not just covered
- Don't let the postcard POST failure kill the animation; Stage 4 has a fallback layout using a static gradient background and a generic subtitle ("two emotions met at the edge of a night") if `postcard` is null after the timeout
- Don't make the flash dependent on async data — the collapse and detonation MUST run on a fixed timeline even if the network is slow. Only Stage 4 can wait

---

## Polish (if time permits)

- After Stage 4 lands, slow zoom the nebula background by 1.03× over 8 s continuously — gives the postcard "depth" and keeps the scene alive while the user reads
- On the postcard, a single small line at the bottom: *"this moment will not be saved."* Fades in 1.5 s after postcard lands, at 40% opacity
- The skip button gets its own micro-explode when clicked (small flash centered on it) before jumping to Stage 4 — don't let accessibility feel like a downgrade

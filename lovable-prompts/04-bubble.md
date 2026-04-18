# Lovable Prompt 4 — Resonance Bubble (chat)

---

Build the `/bubble` screen. This is the ephemeral chat room. For the MVP, the "other person" is scripted — we'll use a pre-written conversation that plays out over ~60 seconds, timed to feel like a real chat.

**Layout:**
- Full screen, black background with extremely subtle pink/purple nebula glow
- Centered: a large translucent bubble shape (round-ish, slightly irregular) with soft glowing border
- Messages appear inside the bubble as soft-edged chat cards
- Top-right of screen: countdown timer "15:00", turns amber under 5:00, red under 1:00

**Identities:**
- User sees themselves as their assigned spirit type: e.g. "BlueMist #47"
- The "other" person is shown as a different spirit type of the same emotion: e.g. "QuietTide #12"
- No real names, no avatars beyond spirit icons

**Scripted conversation (plays automatically for demo):**
- Import from `/src/data/bubble-scripts.ts` (emotion-keyed). Each emotion has a 6-message scripted conversation.
- Messages appear one-by-one, ~8-12 seconds apart, alternating sides
- User can type a message that gets added to the log (but the scripted other party continues on schedule — for demo simplicity)

**Timer behavior:**
- Starts at 15:00 counting down
- For demo purposes, compress: include a "demo mode" toggle that runs at 10x speed
- At 0:00: bubble begins to fade, messages become translucent, final message appears: *"the bubble dissolves. you carry the moment."*
- Fade to black → button appears: "return to globe" → navigates back to `/globe`

**Visual polish:**
- Messages gently shimmer as they arrive
- Bubble has a subtle breathing animation (slight scale pulse every 4s)
- When timer goes under 1:00, bubble begins to slowly shrink

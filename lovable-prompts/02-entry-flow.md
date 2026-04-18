# Lovable Prompt 2 — Entry Flow (text + image swipe)

Use after scaffold is working.

---

Build the `/enter` screen. This is the core novel interaction — the user never picks an emotion, the system infers it from what they type and which images they instinctively tap.

**Flow (three sub-steps, each a full-screen view with smooth fade transitions):**

### Step A — Text prompt
- Full screen, black background with slow-moving starfield
- Centered serif prompt: "What's on your mind right now?"
- Below it, a single large text input (no box border, just a soft underline that glows on focus)
- Placeholder: *"just type anything. one word, a sentence, a fragment."*
- Below the input, a small shimmering "continue" button that only appears after 3+ characters typed
- Submit → fade transition → Step B

### Step B — Image swipe pairs (4 rounds)
- Full screen, two images side by side, nearly filling the viewport
- A slim 4-dot progress indicator at the top
- Centered instruction in small italics: *"which one pulls you? no thinking. just tap."*
- User taps an image → that image flashes/ripples → both images fade out → next pair slides in from the right
- Images come from a JSON pool (I'll provide `image-pool.json`) — select pairs at random across contrasting themes
- After 4 rounds, transition → Step C

### Step C — Sensing animation (3 seconds)
- Full black screen
- Centered: a slowly-pulsing orb (could be a CSS radial gradient)
- Below, sequential text animations (each fades in, holds ~1s, fades out):
  1. "sensing your frequency..."
  2. "mapping your emotional geography..."
  3. "found you."
- Then navigate to `/globe`

**State to pass forward:** the typed text + array of 4 selected image IDs → stored in a zustand store or URL state → read on `/globe`.

**Image pool source:** load from `/src/data/image-pool.json`. I'll provide this file separately.

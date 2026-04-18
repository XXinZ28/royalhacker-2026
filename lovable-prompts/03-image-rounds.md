# Lovable Prompt 3 — Image Fine-Tuning (3 rounds)

Use after the questions flow is working.

---

Build the `/rounds` flow. Three rounds, each a full-screen view with two images side-by-side. The user picks one per round. The picks fine-tune their P/A vector.

## Layout (per round)

- Full screen, dark background with subtle starfield
- 3-dot progress indicator at the top (same visual style as `/q`)
- Tiny italic instruction, centered: *"which one pulls you? no thinking — just tap."*
- Two images side by side, each filling ~45% of viewport width, ~60% of viewport height
- Tap an image → it ripples / briefly glows → brief fade out → next round slides in from the right
- Small theme label above each pair (subtle, sans-serif, low opacity): "color", "nature", "space"

## Data source

Load `picture-dataset/bucket_${bucket_id}.json` where `bucket_id` was computed at the end of `/q`. The file has 6 images; group them by `round`:

- Round 1: `theme === "color"` → two images (warm, cold)
- Round 2: `theme === "nature"` → two images (sunny, stormy)
- Round 3: `theme === "space"` → two images (vast, close)

Left/right order can be randomized per load.

## On tap

Append the picked image's `p_delta` and `a_delta` to two arrays in the Zustand store:
```ts
selected_p_deltas.push(image.p_delta)
selected_a_deltas.push(image.a_delta)
```

## After round 3

Compute the final vector:
```ts
const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length
const final_P = initial_P + avg(selected_p_deltas) * 0.5
const final_A = initial_A + avg(selected_a_deltas) * 0.5
```

POST to `VITE_N8N_INTAKE_URL`:
```json
{
  "session_id": "<uuid>",
  "initial_P": 0.7,
  "initial_A": 0.0,
  "final_D": 1,
  "p_deltas": [0.20, 0.25, 0.15],
  "a_deltas": [0.15, 0.10, 0.10]
}
```

The backend recomputes `final_P`/`final_A` from `p_deltas`/`a_deltas` (same formula — single source of truth). Frontend can keep its local copy for display.

Then navigate to `/waiting` and kick off matching.

## Polish

- Each round: 400 ms fade-in, 300 ms fade-out on tap
- Picked image briefly scales to 1.03 before fading
- Unpicked image fades to 40% opacity before fading out
- Loading states: if `bucket_${id}.json` is slow, show a pulsing orb placeholder

# Lovable Prompt 6 — Live Matches 3D Globe (Demo Screen)

Paste this AFTER the chat view works. This screen is *not* part of the user flow — it's a dedicated visualization for the demo booth / big-screen feed.

---

Add a new route `/display` that renders a full-screen, cyberpunk-styled 3D Earth. As new matches happen on the backend, a glowing arc flies between the two users' approximate cities, both endpoints pulse a ripple ring, and a rolling counter shows how many resonances have occurred in the last two minutes.

## Visual aesthetic

- Full black background with a faint radial nebula glow (purple, top-right).
- Earth rendered with the `earth-night` texture from `three-globe/example/img/earth-night.jpg`.
- Purple atmosphere (`#7c3aed`).
- Globe auto-rotates slowly (≈0.35 speed).
- Subtle scanline overlay on top of the entire canvas (1px repeating gradient at 1.2% opacity) to reinforce the synth-monitor feel.
- City labels for ~20 hubs are rendered small at low opacity so the geography reads without being loud.

## Library

Use **`globe.gl`** (the standalone wrapper over three-globe). Install via npm:

```
npm i globe.gl
```

Import in the component:

```tsx
import Globe from 'globe.gl'
```

Do not reach for three.js directly. `globe.gl` gives us arcs, points, rings, and labels as first-class layers — writing the same from scratch in three.js would eat the hackathon.

## Data contract

Each "match event" passed into the globe has this shape:

```ts
type MatchEvent = {
  from: { lat: number; lng: number; city?: string }
  to:   { lat: number; lng: number; city?: string }
  mode: 'echo' | 'healing'
  final_P: number  // -1..+1 (pleasure)
  final_A: number  // -1..+1 (arousal)
  intensity?: number  // 0..1, defaults to 0.7
}
```

## Emotion → color

```ts
const EMOTION_COLORS = {
  joy:        '#fbbf24', // +P +A
  calm:       '#a78bfa', // +P -A
  anxious:    '#22d3ee', // -P +A
  melancholy: '#60a5fa', // -P -A
  healing:    '#f472b6'  // mode override
}

function emotionOf(m: MatchEvent): keyof typeof EMOTION_COLORS {
  if (m.mode === 'healing') return 'healing'
  if (m.final_P >= 0 &&  m.final_A >= 0) return 'joy'
  if (m.final_P >= 0 &&  m.final_A <  0) return 'calm'
  if (m.final_P <  0 &&  m.final_A >= 0) return 'anxious'
  return 'melancholy'
}
```

## Layers

On mount, configure the globe with these five layers. Pseudo-code — adapt to the component wrapper you pick.

```ts
const world = Globe()(containerRef.current\!)
  .globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg')
  .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
  .backgroundColor('rgba(0,0,0,0)')
  .atmosphereColor('#7c3aed')
  .atmosphereAltitude(0.18)

// Arcs — the emotional connection
world.arcsData(arcs)
  .arcStartLat(d => d.from.lat).arcStartLng(d => d.from.lng)
  .arcEndLat(d => d.to.lat).arcEndLng(d => d.to.lng)
  .arcColor(d => [rgba(d.color, 0.95), rgba(d.color, 0.25)])
  .arcStroke(d => 0.45 + 0.6 * (d.intensity ?? 0.6))
  .arcDashLength(0.4).arcDashGap(2)
  .arcDashInitialGap(() => Math.random())
  .arcDashAnimateTime(2200)
  .arcAltitudeAutoScale(0.55)

// Points — both endpoints
world.pointsData(points).pointLat('lat').pointLng('lng')
  .pointColor('color').pointAltitude(0.005).pointRadius(0.35)

// Rings — the ripple that fires at each endpoint the moment a match is born
world.ringsData(rings).ringLat('lat').ringLng('lng')
  .ringColor(d => (t => rgba(d.color, 1 - t)))
  .ringMaxRadius(4).ringPropagationSpeed(2.4).ringRepeatPeriod(900)

// Labels — hub cities, faint
world.labelsData(CITIES)
  .labelLat('lat').labelLng('lng').labelText('name')
  .labelSize(0.55).labelColor(() => 'rgba(231, 233, 255, 0.28)')

world.controls().autoRotate = true
world.controls().autoRotateSpeed = 0.35
```

TTLs (so the globe never silts up):
- Arcs: 6.5 s
- Points: 12 s
- Rings: 3.5 s
- Counter window: 120 s

## Data source — two modes

The `/display` screen should support **both** of the following, selected via an env var `VITE_DISPLAY_MODE`:

1. **`VITE_DISPLAY_MODE=simulator`** (default on the hackathon booth machine).
   - Generate one synthetic match every 0.9–3.4 s, biasing lat/lng to a fixed list of ~20 hub cities.
   - 18% of generated matches have `mode: 'healing'`.
   - This is what runs in front of the judges — zero dependency on real users in the audience.

2. **`VITE_DISPLAY_MODE=live`**
   - Poll a new n8n webhook every 2 s, `GET /webhook/match-feed?since=<ISO>`, that returns:
     ```json
     { "events": [{ "match_pair_id": "...", "timestamp": "...",
                    "from": {"lat":..,"lng":..,"city":"Copenhagen"},
                    "to":   {"lat":..,"lng":..,"city":"Berlin"},
                    "mode": "echo",
                    "final_P": 0.61, "final_A": 0.22 }] }
     ```
   - For each event, call `pushMatch(event)`. Dedupe by `match_pair_id`.
   - If the feed is unreachable, fall back to simulator silently.

**Note:** the `match-feed` n8n workflow is not yet in this repo. For v1 we demo on the simulator; a backend dev can add the webhook later by:
- Reading new rows from `user_vectors` where `match_timestamp >= since` AND `matched_user_id \!= ''`.
- Joining with a city lookup per `session_id` (e.g. from a `session_geo` sheet populated by IP geolocation on intake).
- Emitting de-duplicated events per `match_pair_id`.

## HUD / chrome (overlayed on top of the canvas)

- **Top-left:** serif title "Resonance" + tiny caption "LIVE MATCHES · GLOBAL FEED" in 10px letter-spaced caps.
- **Top-right:** monospace running count (zero-padded, e.g. `07`) + caption "RESONANCES IN THE LAST 2 MINUTES".
- **Bottom-left:** legend with 5 colored dots matching the palette above.
- **Bottom-right:** most recent pair, e.g. `Copenhagen  ⟷  Tokyo  [ECHO]` or `[HEALING]`, with the mode chip tinted to match the connection color.

All chrome uses `pointer-events: none` so it never blocks camera drag.

## Do not

- Do not add controls users can click (this is a presentation surface, not a control panel).
- Do not show real session IDs or message content.
- Do not use a Mercator / 2D fallback — the globe IS the feature.
- Do not use `THREE.CapsuleGeometry` or any post-r128 Three primitives; stick to `globe.gl`'s built-in layers.

## Reference

A standalone working version (no React, pure HTML + globe.gl CDN) is shipped at `globe/live-matches.html`. You can open it in a browser for visual reference before porting to React.

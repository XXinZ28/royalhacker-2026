# EchoWander — AI Builder Manual
**RoyalHacks 2026 | April 18-19 | IT University of Copenhagen**

---

## Project Summary

EchoWander is a 3D emotional globe where you don't pick your emotion or your city — your subconscious does. You write one sentence, swipe 4 image pairs instinctively, and the app maps you to the city in the world that matches your emotional state right now. Then it finds strangers feeling the same way and puts you in a 15-minute ephemeral chat bubble.

**Pitch hook:** "You didn't choose. You just wrote one sentence and swiped 4 images. Your subconscious already knew where you belong."

---

## Tech Stack

| Layer | Tool | Purpose |
|---|---|---|
| Frontend | Lovable | All UI, 3D globe, interactions |
| Automation | n8n | AI orchestration, chat lifecycle, data aggregation |
| 3D rendering | Three.js (via Lovable prompt) | Emotional terrain globe |
| Realtime chat | Firebase Realtime DB | Ephemeral 15-min chat rooms |
| Deployment | Lovable built-in / Vercel | Live demo link for submission |

---

## Tracks to Enter

- Built with Lovable
- Built with n8n
- Best UX/UI
- Most Quirky Hack

---

## Core User Flow

```
Open app → rotating 3D globe appears
    ↓
One-line text input: "What's on your mind right now?"
    ↓
3-4 image swipe pairs (instinctive, <20 seconds)
  — pairs are dynamically chosen by AI based on your text
    ↓
AI reads text + image choices → infers emotional state
    ↓
Globe animates: your city lights up, spirit avatar appears
    ↓
Bias reveal: "Your subconscious kept choosing Lisbon.
              Every image you picked points there."
    ↓
"3 spirits feel the same as you right now"
    ↓
Enter resonance bubble → 15-min ephemeral chat
    ↓
Time's up → bubble dissolves, back to globe
```

---

## MVP Scope (build today)

### Do
- One-line free text input
- 3-4 image swipe pairs (dynamic, AI-selected per user)
- AI emotion inference (text + image choices → one of 5 emotions)
- 5 spirit avatars (Joy, Melancholy, Excitement, Calm, Lonely)
- 6 preset cities: Lisbon, Bali, Mexico City, Tokyo, Berlin, Copenhagen
- Simplified 3D globe with emotion terrain (Three.js)
- City emotion panel (static mock data)
- Bias reveal moment after avatar assignment
- Ephemeral chat room (15-min expiry, mock or Firebase)
- Mock data for city emotion distributions

### Don't build
- Real-time global emotion data
- Arbitrary city selection
- Custom avatar editor
- Friend system or chat history
- Complex emotion taxonomy

---

## n8n Workflows

### 1. Emotion Inference Workflow
- Trigger: user submits text + image selections
- Action: call Claude/GPT with text + image metadata → return emotion label + city assignment
- Output: `{ emotion: "melancholy", city: "lisbon", bias_message: "..." }`

### 2. Chat Room Creation Workflow
- Trigger: user clicks "Find resonance"
- Action: create Firebase room with 15-min TTL, return room ID

### 3. Chat Room Expiry Workflow
- Trigger: 15-min timer or user exits
- Action: delete Firebase room + all messages

### 4. City Emotion Aggregation Workflow
- Trigger: every 5 minutes (cron)
- Action: tally active emotions per city → update frontend data endpoint

---

## Lovable Prompts (use these in order)

### Prompt 1 — Project scaffold
```
Build a web app called EchoWander. Dark space aesthetic: deep navy background, purple/pink glow accents, gold highlights. Single page app with these routes:
- / : landing with rotating 3D globe (Three.js), 6 glowing city dots
- /enter : text input + image swipe interface
- /globe : main globe view after emotion is assigned
- /bubble : ephemeral chat room view

Use a dreamy, healing visual style inspired by the game Journey.
```

### Prompt 2 — Text + image input screen
```
On the /enter screen:
- Large centered prompt: "What's on your mind right now?"
- Single text input, placeholder: "just type anything..."
- Below: image swipe component showing 2 images side by side
- User taps one image to select, next pair slides in
- Show 4 pairs total, progress dots at bottom
- After last selection: loading animation "sensing your frequency..."
- Then navigate to /globe
```

### Prompt 3 — Globe with spirit avatar
```
On the /globe screen:
- Three.js globe, slowly rotating
- 6 city markers glowing (Lisbon, Bali, Mexico City, Tokyo, Berlin, Copenhagen)
- User's assigned city pulses brighter
- Bottom panel slides up showing:
  - Spirit avatar (animated SVG or CSS shape based on emotion)
  - Bias reveal text: italic, soft, e.g. "Your subconscious kept choosing Lisbon."
  - Count: "3 spirits feel the same as you right now"
  - Button: "Enter resonance bubble"
```

### Prompt 4 — Ephemeral chat bubble
```
On the /bubble screen:
- Bubble-shaped chat container, translucent with glow border
- Countdown timer top-right: "14:32 remaining"
- Anonymous usernames: just spirit type + random number e.g. "BlueMist #47"
- When timer hits 0: fade out animation, text "The bubble dissolves. You carry the moment."
- Button: "Return to globe"
```

### Prompt 5 — Spirit avatar designs
```
Create 5 CSS/SVG animated spirit avatars:
1. Joy — glowing gold sphere, bouncing animation, light pulse ripples
2. Melancholy — semi-transparent blue fog shape, slow drift, occasional shrink
3. Excitement — purple electric ball, rapid jitter, small lightning sparks
4. Calm — green orb, rhythmic expand/contract like breathing
5. Lonely — faint grey-white dot, occasional flicker, mostly still at edges
```

---

## Image Pool (pre-curate before hacking starts)

Organize ~30 images into emotional theme folders. n8n selects pairs based on text input emotion signal.

| Theme | Example images |
|---|---|
| Isolation | empty beach, fog-covered road, single chair in room |
| Connection | crowded market, two people laughing, festival lights |
| Restlessness | busy intersection, turbulent ocean, running figure |
| Peace | still lake, empty library, sunrise mountain |
| Overwhelm | neon city at night, packed subway, dense forest |
| Longing | airport departure board, old photograph, rain on window |

Use Unsplash or Pexels for free images. Download ~5 per theme.

---

## 5 Spirit Emotions + City Mapping

| Emotion | Cities that match | Terrain on globe |
|---|---|---|
| Joy | Bali, Mexico City | peaks, warm gold glow |
| Melancholy | Lisbon, Copenhagen | valleys, blue-grey tone |
| Excitement | Berlin, Tokyo | jagged spikes, electric purple |
| Calm | Copenhagen, Lisbon | gentle rolling hills, soft green |
| Lonely | Tokyo, Berlin | flat plains, dim white flicker |

---

## Bias Reveal Messages (copy-paste into code)

```js
const biasMessages = {
  lisbon: "Your subconscious kept choosing Lisbon. Every image pulled you toward something slow, beautiful, and a little melancholy.",
  tokyo: "Your choices point to Tokyo — the weight of a city that never stops, and the loneliness only a crowd can create.",
  berlin: "Berlin keeps appearing in your instincts. Creative restlessness. The need to make something out of the noise.",
  bali: "Bali is where your subconscious wanted to go. Sun, presence, the feeling that right now is enough.",
  mexicocity: "Mexico City — warmth, chaos, life at full volume. Your choices said you're ready for all of it.",
  copenhagen: "Copenhagen. Clean, quiet, honest. Your instincts chose a place where it's okay to just be still."
}
```

---

## Pitch Script (2 minutes)

**Hook (15s):**
"What if you didn't have to explain how you feel — you just showed us?"

**Problem (20s):**
"When you're far from home, the loneliest moment isn't when you're alone. It's when you feel something strongly and have no one to share it with — not because there's no one around, but because saying it out loud feels like too much."

**Demo (60s):**
Live walkthrough: type one sentence → swipe images → bias reveal → spirit appears → find resonance → enter bubble.

**Wow moment:**
"You didn't choose Lisbon. You didn't choose melancholy. You just swiped 4 images in 20 seconds — and EchoWander already knew."

**Tracks (15s):**
"We're submitting to Lovable, n8n, Best UX/UI, and Most Quirky. The entire product was built in 24 hours using both platforms end-to-end."

**Close (10s):**
"EchoWander doesn't help you make friends. It just helps you feel — for 15 minutes — that you're not alone."

---

## Submission Checklist

- [ ] Live deployed link (Lovable or Vercel)
- [ ] Public GitHub repo
- [ ] Devpost submission with all track selections
- [ ] AI tools disclosed: Lovable, n8n, Claude/GPT
- [ ] Working demo walkthrough tested end-to-end

---

## Fallbacks if time runs out

| Feature | Fallback |
|---|---|
| 3D globe too slow | 2D world map with emotion heatmap overlay |
| Firebase chat broken | Static mock conversation in bubble UI |
| n8n inference fails | Hardcode emotion from text keywords client-side |
| Image swipe not ready | Show 5 emotion buttons with evocative labels instead |

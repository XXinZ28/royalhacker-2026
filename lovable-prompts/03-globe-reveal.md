# Lovable Prompt 3 — Globe + Bias Reveal

Use after the entry flow works.

---

Build the `/globe` screen. This is where the bias reveal moment happens — the "wow" of the demo.

**Layout:**
- Full screen, deep navy background, starfield
- Top 60% of screen: rotating 3D Three.js globe with 6 city markers (Lisbon, Bali, Mexico City, Tokyo, Berlin, Copenhagen)
- Bottom 40%: glass-morphism panel with reveal content

**Globe behavior:**
- All 6 cities glow gently by default
- On mount, the user's assigned city pulses significantly brighter and emits a slow radial glow ring
- The globe auto-rotates so the assigned city faces the camera
- Small city name labels appear near markers

**Bias reveal panel (animates in one line at a time, ~800ms each):**
1. Small text: "based on what you wrote and the images you chose..."
2. Large serif text, italic: *"your subconscious kept choosing [CITY]."*
3. Body text (from `biasMessages[city]`): the full bias reveal paragraph
4. Animated spirit avatar on the left side (emotion-specific — see Prompt 5)
5. Small text: "3 spirits feel the same as you right now."
6. Glowing button: "enter resonance bubble" → navigates to `/bubble`

**Bias message content:** import from `/src/data/bias-messages.ts` (I'll provide).

**Emotion inference:** call `/src/lib/inferEmotion.ts` (I'll provide) with text + imageIds → returns `{ emotion, city, biasMessage }`. Later we'll swap this for an n8n webhook call; for now local logic is fine.

**If the n8n webhook URL is configured in env (`VITE_N8N_EMOTION_URL`), prefer that. Otherwise use local inference as fallback.**

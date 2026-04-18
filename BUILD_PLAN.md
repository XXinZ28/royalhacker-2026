# EchoWander Build Plan

## Realistic strategy (hybrid)

**Lovable** builds the main app shell (wins Lovable track) — scaffolding, routing, styling, simple UI.

**I write locally** the hard parts that Lovable prompts can't one-shot reliably:
- `EmotionGlobe.tsx` — Three.js globe with terrain
- `ImageSwipe.tsx` — animated pair-swipe component
- `inferEmotion.ts` — client-side fallback emotion logic
- n8n workflow JSONs (importable)
- Image pool constants

You paste Lovable prompts → Lovable creates the shell → you drop in my components via Lovable's code editor → deploy from Lovable.

**n8n** handles emotion inference (wins n8n track). Free cloud tier, one workflow.

**Mock everything else** — chat conversations, city emotion counts, matched spirits.

---

## Timeline (assuming ~20 hours of actual build time)

| Block | Hours | Deliverable |
|---|---|---|
| **H0–H1** | Setup | Lovable project live, n8n workflow skeleton, image pool confirmed |
| **H1–H4** | Core UI | Entry screen (text + image swipe) working end-to-end |
| **H4–H7** | Globe | 3D globe renders with 6 cities + terrain, city highlight animation |
| **H7–H10** | Flow wiring | Emotion inference call → globe transition → bias reveal text |
| **H10–H13** | Bubble | Chat bubble UI + 15-min countdown + mock conversation |
| **H13–H16** | Polish | Spirit avatars animated, transitions, loading states, copy refinement |
| **H16–H18** | Demo prep | Pitch script rehearsal, one-pager, recorded GIF/video |
| **H18–H20** | Buffer | Bug fixes, deployment verification, Devpost submission |

---

## Decision log

- **Chat:** mock conversation (no Firebase) — saves 3h
- **Data:** all mock, no real users
- **Deployment:** Lovable built-in (if stable) else Vercel
- **GitHub:** public repo required for submission

---

## What's blocked on your input

- [ ] Lovable account access (confirm you're logged in)
- [ ] n8n cloud account + API key
- [ ] Claude or OpenAI API key
- [ ] GitHub username + repo name preference
- [ ] Pitch time Sunday (affects scope aggressiveness)

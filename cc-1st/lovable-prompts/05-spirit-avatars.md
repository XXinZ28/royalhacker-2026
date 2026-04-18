# Lovable Prompt 5 — Spirit Avatars

Can be done in parallel with other screens.

---

Create 5 animated spirit avatars as reusable React components. Each is a pure CSS/SVG component — no external assets. They appear on the globe reveal screen and in the bubble.

**Shared spec:**
- Each avatar is a standalone component: `<JoySpirit />`, `<MelancholySpirit />`, etc.
- Size prop: `sm` (40px), `md` (80px), `lg` (160px)
- All animations loop infinitely and use CSS or Framer Motion

**1. JoySpirit**
- Glowing gold sphere with a soft sun-ray halo
- Color: gradient from #fde047 (inner) to #fbbf24 (outer) to transparent
- Animation: gentle vertical bounce (12px up/down, 2s ease-in-out), light pulse ripple every 3s

**2. MelancholySpirit**
- Semi-transparent blue fog cloud shape (irregular, soft edges via blur filter)
- Color: #60a5fa at 40% opacity
- Animation: slow horizontal drift (6s cycle), occasional vertical shrink (every 5s, scale y to 0.85 and back)

**3. ExcitementSpirit**
- Purple electric ball with small lightning arcs
- Color: core #a78bfa with electric white flashes
- Animation: rapid subtle jitter (10px random, 100ms), lightning sparks emit every 1.5s (small white SVG lines that fade out)

**4. CalmSpirit**
- Soft green orb with concentric ripple rings
- Color: gradient from #86efac to #22c55e
- Animation: rhythmic breathing (scale 1.0 → 1.1 → 1.0 over 4s, ease-in-out-sine)

**5. LonelySpirit**
- Faint grey-white dot with a thin outer ring
- Color: #e5e7eb at 60% opacity
- Animation: mostly still; brief flicker every 3-5s (opacity drops to 30% for 200ms, then back)

**Export pattern:**
```tsx
export function SpiritAvatar({ emotion, size = 'md' }: Props) {
  switch (emotion) {
    case 'joy': return <JoySpirit size={size} />
    // ...
  }
}
```

Used in: `/globe` (size=lg, shows user's spirit), `/bubble` (size=sm, shows both chat participants' spirits beside their messages).

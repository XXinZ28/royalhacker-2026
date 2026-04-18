# Lovable Prompt 2 — Three Onboarding Questions

Use after the scaffold is working.

---

Build the `/q` flow. Three questions, each its own full-screen view, advanced sequentially with smooth fade transitions. A slim 3-dot progress indicator at the top.

The answers populate the Zustand store as:
- Q1 → `initial_P` ∈ {+0.7, 0, -0.7}
- Q2 → `initial_A` ∈ {+0.7, 0, -0.7}
- Q3 → `final_D` ∈ {1, 0} (FIXED — never changes after this point)

## Q1 — Pleasure

Serif prompt, centered: **"How do you feel overall right now?"**

Three stacked option cards (large tap targets, glow-on-hover):

| Option                                      | Stored value |
| ------------------------------------------- | ------------ |
| 🙂 Pretty good / a little happy             | `+0.7`       |
| 😐 Neither good nor bad                     | `0`          |
| 🙁 Not great / a little heavy               | `-0.7`       |

Tap → fade → Q2.

## Q2 — Arousal

Serif prompt, centered: **"What does your current state feel more like?"**

| Option                                            | Stored value |
| ------------------------------------------------- | ------------ |
| ⚡ Tense / anxious / excited                      | `+0.7`       |
| 🌊 Steady / normal                                | `0`          |
| 🪫 Tired / low energy                             | `-0.7`       |

Tap → fade → Q3.

## Q3 — Dominance (locked after this screen)

Serif prompt, centered: **"What do you want more right now?"**

| Option                                                                     | Stored value |
| -------------------------------------------------------------------------- | ------------ |
| 🗣️ Someone to talk to / to be listened to                                  | `1`          |
| 💡 To hear some advice / to find help                                      | `0`          |

Small helper text below, subtle: *"this one won't change — it decides who you match with."*

Tap → fade → compute bucket from `(initial_P, initial_A)`, then navigate to `/rounds`.

## Bucket computation

```ts
// bucket_id = (1..9)  row-major on the 3×3 P×A grid
// rows: P = +0.7 / 0 / -0.7
// cols: A = +0.7 / 0 / -0.7
const rowIdx = initial_P === 0.7 ? 0 : initial_P === 0 ? 1 : 2
const colIdx = initial_A === 0.7 ? 0 : initial_A === 0 ? 1 : 2
const bucket_id = rowIdx * 3 + colIdx + 1
```

Load `picture-dataset/bucket_${bucket_id}.json` — you'll use it in the next screen.

# Picture Dataset

One JSON file per bucket (`bucket_1.json` … `bucket_9.json`), matching the 3×3 PAD grid on `(initial_P, initial_A)`.

## Bucket grid

|            | A = +0.7       | A = 0          | A = -0.7       |
| ---------- | -------------- | -------------- | -------------- |
| P = +0.7   | 1 (Ecstatic)   | 2 (Content)    | 3 (Serene)     |
| P = 0      | 4 (Alert)      | 5 (Neutral)    | 6 (Drowsy)     |
| P = -0.7   | 7 (Anxious)    | 8 (Sad)        | 9 (Depressed)  |

## Per-bucket structure

Each file contains exactly 6 images = 3 rounds × 2 choices:

- **Round 1 — color**: warm vs cold
- **Round 2 — nature**: sunny vs stormy
- **Round 3 — space**: vast (small figure in landscape) vs close (intimate close-up)

The user sees one round at a time, two images side by side, and picks one.

## Delta rubric (uniform across all 9 buckets)

| Round | Theme  | Choice | p_delta | a_delta |
| ----- | ------ | ------ | ------- | ------- |
| 1     | color  | warm   | +0.20   | +0.15   |
| 1     | color  | cold   | -0.20   | -0.15   |
| 2     | nature | sunny  | +0.25   | +0.10   |
| 2     | nature | stormy | -0.25   | +0.20   |
| 3     | space  | vast   | -0.10   | -0.20   |
| 3     | space  | close  | +0.15   | +0.10   |

Note: in Round 2 both choices have **positive** `a_delta` — nature activates regardless; the informative signal is on `p`. This is intentional.

See [`../docs/delta-rubric.md`](../docs/delta-rubric.md) for the full rationale.

## Vector formula

```
final_P = initial_P + avg(3 selected p_deltas) × 0.5
final_A = initial_A + avg(3 selected a_deltas) × 0.5
final_D = D    # fixed from Q3, never changes
```

Max |shift| = `0.5 × max|avg(deltas)|` = `0.5 × 0.3 = 0.15` worst case. A user who starts at `+0.7` stays `≥ +0.55`. The multiplier exists to preserve quadrant.

## Per-image schema

```json
{
  "image_url": "https://images.unsplash.com/photo-XXXXX?w=800&auto=format&fit=crop&q=80",
  "bucket_id": 1,
  "round": 1,
  "theme": "color",
  "choice_type": "warm",
  "p_delta": 0.20,
  "a_delta": 0.15,
  "alt": "short description for accessibility",
  "photographer_credit": "Unsplash photo-XXXXX"
}
```

`choice_type` is v1-specific metadata for debugging/labelling the two options within a round. It is not required for the vector math.

## v1 caveat

Most image URLs are **pulled from a 30-photo pool curated for the archived EchoWander v0 project** and reused across buckets where thematically close. Schema is production-ready; URLs should be swapped for unique, bucket-specific, credit-attributed Unsplash/Pexels photos before a public launch. Every image in the pool has a free commercial-use license; real `photographer_credit` strings must be filled in from each photo's Unsplash page before shipping.

## Licensing

All URLs point to the Unsplash CDN. Images are free for commercial use with attribution; see [unsplash.com/license](https://unsplash.com/license). Keep the `photographer_credit` field populated when replacing placeholders.

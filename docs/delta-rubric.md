# Delta Rubric

Rationale for the six `(p_delta, a_delta)` tuples used across all 9 buckets.

## Table

| Round | Theme  | Choice | p_delta | a_delta | Why                                                                                           |
| ----- | ------ | ------ | ------- | ------- | --------------------------------------------------------------------------------------------- |
| 1     | color  | warm   | +0.20   | +0.15   | Warm saturated light reads as pleasant + mildly activating.                                   |
| 1     | color  | cold   | -0.20   | -0.15   | Cold desaturated light reads as less pleasant + quieter.                                      |
| 2     | nature | sunny  | +0.25   | +0.10   | Open sunny nature is strongly pleasant, moderately activating.                                |
| 2     | nature | stormy | -0.25   | +0.20   | Storms are unpleasant but strongly activating — the two choices differ on P, agree on +A.     |
| 3     | space  | vast   | -0.10   | -0.20   | Small figure in a vast landscape reads as quiet and slightly melancholic.                     |
| 3     | space  | close  | +0.15   | +0.10   | Intimate close-up reads as warm and mildly engaging.                                          |

## Properties

- **Within each round, the two choices have opposite-signed P deltas.** Picking one rather than the other always produces a real informative signal on the pleasure axis.
- **Round 2 is P-informative only.** Both `sunny` and `stormy` have positive `a_delta` — nature scenes activate regardless. This is intentional: the arousal signal comes from rounds 1 and 3.
- **All |deltas| ≤ 0.25.** Combined with the `× 0.5` multiplier in the final formula, no user can shift by more than `0.5 × 0.3 = 0.15` on any axis. Quadrant is preserved.
- **Uniform across buckets.** The same six tuples apply whether the user entered Bucket 1 or Bucket 9. The images themselves differ per bucket (bucket-appropriate mood), but the scoring rubric is a constant function of choice type.

## Vector formula

```
final_P = initial_P + avg(3 selected p_deltas) × 0.5
final_A = initial_A + avg(3 selected a_deltas) × 0.5
final_D = D    # from Q3, never changes after the questionnaire
```

## Worked examples

### User A: bucket 1 (P=+0.7, A=+0.7), picks warm + sunny + close

```
avg p_delta = (+0.20 + 0.25 + 0.15) / 3 = +0.20
avg a_delta = (+0.15 + 0.10 + 0.10) / 3 = +0.1167
final_P = 0.7 + 0.20 × 0.5 = +0.80
final_A = 0.7 + 0.1167 × 0.5 = +0.758
```

### User B: bucket 9 (P=-0.7, A=-0.7), picks cold + stormy + vast

```
avg p_delta = (-0.20 + (-0.25) + (-0.10)) / 3 = -0.1833
avg a_delta = (-0.15 + 0.20 + (-0.20)) / 3 = -0.05
final_P = -0.7 + (-0.1833) × 0.5 = -0.792
final_A = -0.7 + (-0.05) × 0.5 = -0.725
```

### User C: bucket 5 (P=0, A=0), picks all three "positive" options

```
avg p_delta = (+0.20 + 0.25 + 0.15) / 3 = +0.20
avg a_delta = (+0.15 + 0.10 + 0.10) / 3 = +0.1167
final_P = 0 + 0.20 × 0.5 = +0.10
final_A = 0 + 0.1167 × 0.5 = +0.058
```

A Bucket-5 user who leans "positive" in the image rounds moves gently into the upper-right quadrant — available to match with any other user who lands nearby.

## Swapping the rubric

If you change the tuples, do it in two places and nowhere else:

1. All nine `picture-dataset/bucket_*.json` files (the `p_delta` / `a_delta` per image).
2. This doc.

The frontend and the `emotion-intake` n8n workflow both derive the vector from the raw deltas, so no other code needs to change.

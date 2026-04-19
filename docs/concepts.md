# Concepts — the idea behind Resonance

Resonance is an anonymous chat app that matches two strangers by emotional state instead of profile. This document explains the thinking behind that sentence — the research it draws from, the choices that shape the user experience, and the constraints that made those choices inevitable.

---

## The problem

Every communication app asks **who you are** before it can help you.

- Dating apps ask your age, photos, job, hobbies.
- Social apps ask your friends, your history, your interests.
- Therapy apps ask what you want to work on.
- Chat apps ask who you're trying to reach.

None of them ask **how you feel, right now**.

But emotional state is usually the reason you reached for the app in the first place. It's 2 a.m., you can't sleep, something is heavy. You don't need a therapist. You don't need advice. You don't need your friends, who know too much of your context. You need someone who is feeling the same thing you're feeling, at the same time.

That person exists. There's no way to find them.

## The idea

If we can place each user as a point in an emotional coordinate space, matching becomes a nearest-neighbor problem. Two people at nearby points are feeling nearby things — and that's enough to start a conversation.

Resonance does exactly this. A user answers three questions, picks through three pairs of images, and is placed as a `(P, A, D)` vector in 3D emotion space. The system finds another person whose vector is close (in Echo mode) or complementary (in Healing mode), opens a 15-minute anonymous chat, and then lets the moment dissolve.

No names. No profiles. No accounts. No history. One vector, one stranger, one moment.

## The emotion model: Russell & Mehrabian (1977) PAD

We didn't invent an emotion coordinate system. We used the one that has survived half a century of psychology research: the tridimensional **Pleasure-Arousal-Dominance** model proposed by Russell and Mehrabian in *Evidence for a Three-Factor Theory of Emotions* (Journal of Research in Personality, 1977).

The PAD model claims every discrete emotion can be decomposed into three orthogonal dimensions:

- **P — Pleasure**: how positive or negative the feeling is. Joy is high P. Sadness is low P. Neutrality is zero P.
- **A — Arousal**: how activated or quiescent the feeling is. Excitement is high A. Calm is low A. Rage is high A. Grief is low A.
- **D — Dominance**: how much control you feel you have over the situation. Anger is high D (you're asserting). Fear is low D (something is asserting on you). Meditation can be high D (you've chosen the state) or low D (the state has chosen you).

This model is useful for us specifically because:

1. **Dimensional, not categorical.** You don't have to pick "sad" vs "angry" vs "frustrated". You give three numbers, and your exact shade falls at a specific point in space.
2. **Research-validated across cultures.** The three axes reproduce across translations, scripts, and population samples. Nothing about the axes is English-specific.
3. **Computable.** Two users' distance in `(P, A, D)` is trivially a Euclidean distance. No embeddings, no models, no latency.
4. **Orthogonal to identity.** Your PAD vector right now says nothing about your age, gender, location, job, or past. It's a snapshot of present state, which is all that matters for an anonymous match.

In Resonance we use P and A continuously (fine-tuned by the image rounds, so the final values fall anywhere in `[-0.85, +0.85]`) and D as a binary (`1` = wants to be heard, `0` = wants to listen). The binary D is a deliberate simplification — asking a user to rate "how much control do you feel" on a scale is confusing; asking "do you want to talk or listen" is not.

## The four emotional quadrants

Using P and A alone, every user falls into one of four quadrants:

|              | A ≥ 0 (activated)        | A < 0 (quiet)              |
|--------------|--------------------------|----------------------------|
| **P ≥ 0** (pleasant)   | **joy** — elated, excited, energized  | **calm** — peaceful, content, sated |
| **P < 0** (unpleasant) | **anxious** — restless, tense, alert  | **melancholy** — sad, tired, flat   |

These four quadrants are the organizing principle of almost every visual element in Resonance:

- **Image pairs per round** have deltas pre-tuned so a joy-quadrant user tends to pick different images than a melancholy-quadrant user.
- **Openers** in the match-start screen are hand-written separately for each quadrant.
- **Colors on the live-matches globe** — amber for joy, violet for calm, cyan for anxious, blue for melancholy.
- **Postcard background tones** are deterministically hashed from the match's shared quadrant so joy-matches get warm backgrounds and melancholy-matches get cool ones.
- **Transition animation colors** for the white-dwarf-supernova ending sequence key off the match's shared quadrant.

The quadrant isn't a label we show the user. It's a palette the system uses to make the whole product feel coherent per-user.

## Echo and Healing — two modes of resonance

Resonance supports two modes of matching, chosen by each user on the landing page:

- **Echo** (default): match with someone at a nearby point in `(P, A)` space with the **same** Dominance. Two people who feel similar, and both want to talk OR both want to listen. This is the common case — "I'm feeling X and I want to meet someone else feeling X."
- **Healing**: match with someone at a nearby point in `(P, A)` space with **opposite** Dominance. One wants to talk, one wants to listen. Healing mode requires mutual opt-in — you don't get matched into a listener role unintentionally.

The two modes correspond to two different reasons someone reaches for the app:

**Echo** is for *witness*. "I feel this way. Someone else feels this way. Knowing that is enough."

**Healing** is for *exchange*. "I need to be heard, and I know someone out there needs to hear someone."

The modes are implemented as a simple mutual-opt-in filter in the matching algorithm — Echo users never match Healing users, and Healing users only match other Healing users whose D is opposite. But the emotional frame they create for the chat is different. Echo chats tend to be brief and validating. Healing chats tend to be longer and more unbalanced.

We don't tell users which mode their partner chose. The fact that they're in the same mode is a silent shared premise.

## Why ephemerality is a feature, not a limitation

Resonance saves nothing to the user. No chat history. No match history. No postcard collection. Your session ID is a browser-local UUID that has no persistence across devices and no way to recover if you clear your cookies.

This is a deliberate choice, not a storage constraint. There are three reasons:

**1. Ephemerality is the whole point of the experience.**

If you know you can read the conversation tomorrow, you chat differently today. You curate. You withhold. You're aware you're creating a record. Ephemerality removes that awareness. The conversation is a moment, not a document.

**2. No retention means no safety liability.**

Resonance doesn't store what two strangers said to each other about their 2 a.m. feelings. If we did, we'd inherit responsibility for that data — subpoenas, breaches, moderation, GDPR takedown requests. By not storing it, we don't have it, and we can't be compelled to produce it.

**3. Matching against yourself is prevented structurally, not procedurally.**

You can't match with the same person twice because their row in `user_vectors` has your `session_id` stamped as the last `matched_user_id`, and the 30-minute cooldown blocks a re-pair. This is done via data constraints, not by querying a "match history" table that doesn't exist.

The one small concession to persistence is the postcard. After a chat ends, both users see a shared postcard — a one-line highlight from what was actually said, on a background image deterministically picked from the user's own image-round choices. The postcard is rendered client-side and **not stored anywhere**. If you want to remember the moment, you screenshot it. That's the deal.

## Why anonymity is load-bearing

"Anonymous" in Resonance means specifically four things:

1. **No account.** There is no sign-up. Your session UUID is generated on first page load.
2. **No profile.** You never answer questions about yourself that aren't about your emotional state right now.
3. **No handle.** You don't pick a username. Your partner sees the literal last two characters of your session UUID as your "name" (e.g., `3f`), which is deliberately meaningless.
4. **No context leak.** The system never shows your partner your city, lat/lng (those are used only for the globe display, not exposed to your partner), question answers, or image choices. They only see what you type.

Anonymity is load-bearing because we want strangers to share emotional states they wouldn't share with people who know them. The closest analog to Resonance is the cultural role of talking to a bartender or a stranger on a long-haul flight — someone who will hear you, respond, and disappear. The app is designed to be that stranger.

## The math of how the questionnaire becomes a vector

The intake flow computes `final_P`, `final_A`, `final_D` from the user's answers. The math is deliberately minimal and hand-auditable:

```
initial_P ← Q1 ∈ {+0.7, 0, −0.7}           // three-way choice
initial_A ← Q2 ∈ {+0.7, 0, −0.7}           // three-way choice
final_D   ← Q3 ∈ {1, 0}                    // binary, frozen for the session

(initial_P, initial_A) → bucket_id ∈ {1..9} // 3×3 grid lookup

bucket_id → picture-dataset/bucket_<id>.json  // 6 preselected images per bucket
                                              // 3 rounds × 2 choices

for each of 3 rounds:
  user picks one of two images
  image carries a pre-assigned (p_delta, a_delta) ∈ [-0.3, +0.3]

final_P = initial_P + avg(3 selected p_deltas) × 0.5
final_A = initial_A + avg(3 selected a_deltas) × 0.5
```

The `× 0.5` multiplier caps the maximum per-axis shift at ±0.15. Mathematically:

> Max drift per axis = 0.5 × max(|avg(p_delta)|) = 0.5 × 0.30 = 0.15
>
> A user who starts at `initial_P = +0.7` ends with `final_P ∈ [+0.55, +0.85]` — still in the +P half-plane.

This is how the image rounds **fine-tune within a quadrant** without risking flipping the user into an emotionally mismatched quadrant. The questionnaire is the coarse alignment, the image rounds are the vernier.

## Why images, not more questions

After the three questions, we already have `(initial_P, initial_A, final_D)`. Why do we need three more rounds of picture picks?

Because the questions are cognitive and the images are pre-cognitive.

When you answer Q1 ("how has today been?"), you're thinking about it. You're choosing an answer that matches your self-narrative. That narrative is usually, but not always, accurate.

When you pick between a warm-toned sunset and a cold-toned neon street, you're not thinking. You pick the one that pulls you. That pull exposes a finer-grained emotional state than the narrative does.

The image rounds are a projective test — a psychometric instrument that reveals state by what the user is drawn to, without asking them to describe that state directly. The delta rubric (`±0.20` for color, `±0.25` / `±0.10` for nature, `±0.15` / `±0.10` for space) was hand-tuned so a consistently-pulled-toward-warm-sunny-close picker ends up at `(+0.3, +0.225) × 0.5 = (+0.15, +0.11)` shift relative to their initial state — a nudge, not a jump.

See [`delta-rubric.md`](delta-rubric.md) for the per-image rationale.

## What the app is not

To be explicit about the product's boundaries:

- **Not a therapy app.** We don't give advice, we don't recommend interventions, we don't collect data for clinical use.
- **Not a dating app.** Matches end in 15 minutes with no contact retention. Re-matching with the same person is structurally prevented.
- **Not a social network.** There are no follows, friends, feeds, or public posts.
- **Not a moderated community.** There's no moderator because there's no persistence — a conversation that no one remembers needs no moderation. (If this product scaled past a hackathon demo, that boundary would need to move.)
- **Not a diagnostic tool.** The PAD vector is a coordinate for matching, not a measurement of mental health.

Resonance is a chat app with a different matching primitive. That's it.

## What changes when the stranger matches are real

The most interesting thing about using Resonance isn't the tech. It's the experience of opening a chat with someone you know nothing about, except that they're currently feeling the way you're currently feeling.

The first two or three messages tend to be mutual confirmation — *are you also feeling this? yes, me too*. After that, people tend to say more than they would to a friend, because the friend comes with a context that shapes what gets shared.

The chat ends after 15 minutes (or when either person closes the window), and the system generates a postcard that quotes one line from what actually got said. Then the match ends and the pair cannot rematch for 30 minutes — a structural guarantee of the no-repeat constraint.

That's the whole experience. Whether it feels meaningful or gimmicky depends entirely on the state you brought to it, which is as it should be.

# Lovable Prompt 2b — Match Mode Toggle (Echo vs Healing)

Paste this AFTER `02-questions.md` is working, BEFORE moving on to the image rounds.

---

Resonance now supports two matching modes. The default is **Echo** (same dominance — talker meets talker, listener meets listener). An optional **Healing** mode matches opposite dominances by mutual opt-in — a user who wants to be heard meets a user who wants to listen.

## Where the toggle lives

Add a single selector on the **landing page** (`/`), directly under the tagline and above the "Begin now" button. It must look intentional, calm, and optional — never shouty.

```
                     Resonance
        one moment, one stranger, the same weather inside.

            ┌──────────────┐   ┌──────────────────┐
            │   Echo       │   │   Healing  ·  ⌇   │
            │   resonance  │   │   complement      │
            └──────────────┘   └──────────────────┘
                 (selected)        (selected shows glow)

              [ Begin now to enter your emotion world ]
```

- Two pill-shaped buttons, side by side, centered.
- Selected state: soft purple glow ring + slightly brighter label.
- Unselected state: 50% opacity, thin hairline border.
- Tiny caption beneath, italic, ~60% opacity:
  - When **Echo** is selected: *"find someone whose weather mirrors yours."*
  - When **Healing** is selected: *"meet your complement. one wants to speak, one wants to listen. both have consented to this."*
- Hover on Healing shows a faint "⌇" glyph pulsing — signals the inversion.

## State

Extend the Zustand store:

```ts
type MatchMode = 'echo' | 'healing'

interface SessionState {
  // ...existing fields
  match_mode: MatchMode   // default 'echo'
  setMatchMode: (m: MatchMode) => void
}
```

Persist `match_mode` in localStorage under `resonance_match_mode` alongside `resonance_session_id`. If the user refreshes the landing page, the last-chosen mode is pre-selected.

## Wiring

All three places the frontend talks to n8n must now include `match_mode`:

1. **Intake POST** (`VITE_N8N_INTAKE_URL`):
   ```json
   {
     "session_id": "<uuid>",
     "initial_P": 0.7,
     "initial_A": 0.0,
     "final_D": 1,
     "p_deltas": [0.20, 0.25, 0.15],
     "a_deltas": [0.15, 0.10, 0.10],
     "match_mode": "echo"
   }
   ```

2. **Match POST** (`VITE_N8N_MATCH_URL`):
   ```json
   {
     "session_id": "<uuid>",
     "final_P": 0.85,
     "final_A": 0.10,
     "final_D": 1,
     "match_mode": "echo"
   }
   ```

3. **Match response** now carries `match_mode` back. Store it in Zustand so the chat view can read it and — optionally — hint to the user with a small subtitle:
   - Echo → *"a mirror. their weather is close to yours."*
   - Healing → *"a complement. you asked to meet your opposite."*

## Copy guardrails

- Never call Healing mode "opposite" in a clinical way — the word **complement** is the product word.
- Never label the other user's dominance ("they are a listener" etc).
- The consent framing is load-bearing: *"both have consented to this."* appears somewhere in the Healing flow before the chat opens. Put it on the `/waiting` screen as the second fade-in line when `match_mode === 'healing'`:
  - Line 2 becomes: *"listening for your complement. both sides have asked for this."*

## Q3 copy adjustment

On Q3 (the Dominance question), when `match_mode === 'healing'` is currently selected, append a subtle hint below the existing helper text:

> *"in healing mode, this choice is what pairs you with your opposite."*

Otherwise leave Q3 unchanged.

## Accessibility

- Toggle is keyboard-navigable: `Tab` focuses it, `←` / `→` / `Space` switches.
- Screen reader label for each pill: "Echo mode — resonance with someone feeling the same" / "Healing mode — complement with someone feeling the opposite, by mutual consent."

## What you should NOT do

- Do not add a third mode.
- Do not let users change `match_mode` after they leave the landing page. Changing mid-flow would invalidate the mutual-opt-in guarantee.
- Do not auto-select Healing based on anything the user wrote. Always explicit.

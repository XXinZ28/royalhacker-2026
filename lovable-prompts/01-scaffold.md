# Lovable Prompt 1 — Project Scaffold

Paste this as the first prompt in a new Lovable project.

---

Build a web app called **Resonance**. It's an anonymous emotion-matching experience: the user answers 3 questions + picks 3 pairs of images, and gets matched with another user feeling the same way for a short anonymous chat.

**Visual aesthetic:**
- Dark background: gradient from deep navy (#0a0e27) to near-black
- Accents: soft purple (#a78bfa), pink (#f9a8d4), warm gold (#fbbf24)
- Typography: elegant serif for headlines (Cormorant Garamond), clean sans-serif for body (Inter)
- Dreamy, contemplative, healing — inspired by the game Journey
- Heavy use of soft glows, gentle blur, slow easing
- Never aggressive, never loud

**Tech:**
- React + TypeScript + Vite
- TailwindCSS for styling
- Framer Motion for transitions
- Zustand for session state
- Fetch calls only — no SDKs, no backend code in the frontend
- Read env vars: `VITE_N8N_INTAKE_URL`, `VITE_N8N_MATCH_URL`, `VITE_N8N_CHAT_SEND_URL`, `VITE_N8N_CHAT_POLL_URL`, `VITE_N8N_MATCH_END_URL`

**Routes (single-page app with smooth fade transitions):**
- `/` — landing: centered serif title + single button "Begin now to enter your emotion world"
- `/q` — three onboarding questions, one per screen
- `/rounds` — three image-pair rounds (color, nature, space)
- `/waiting` — "finding someone..." while matching
- `/chat` — the matched chat view
- `/ended` — after a chat ends

**Session identity:**
- On first visit, generate a UUID and store in `localStorage` under key `resonance_session_id`. Reuse on later visits.
- If the user refreshes during questionnaire or rounds, restart that flow (v1 has no resume).
- If refreshed after matching, read `matched_user_id` from the backend using `session_id` and re-enter the chat.

**Landing page (`/`):**
- Centered, full-height
- Serif title: "Resonance"
- Tagline, italicized, smaller: *"one moment, one stranger, the same weather inside."*
- Single glowing button: "Begin now to enter your emotion world" → navigates to `/q`
- Faint starfield in the background (pure CSS animation)

Start by scaffolding this. I'll paste the next screens in order.

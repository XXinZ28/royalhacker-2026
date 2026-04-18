# Lovable Prompt 1 — Project Scaffold

Paste this as the first prompt in a new Lovable project.

---

Build a web app called **EchoWander**. It's an emotional companion app for travelers and digital nomads who feel far from home.

**Visual aesthetic:**
- Dark space background: gradient from deep navy (#0a0e27) to near-black
- Glow accents: soft purple (#a78bfa), pink (#f9a8d4), warm gold (#fbbf24)
- Typography: elegant serif for headlines (e.g. Cormorant Garamond), clean sans-serif for body (Inter)
- Inspired by the video game Journey — dreamy, healing, quiet, contemplative
- Heavy use of subtle glows, blur, and slow animations
- Never aggressive or loud; always soft and weightless

**Routes (single-page app with smooth transitions between them):**
- `/` — landing screen with an animated rotating 3D globe and an invitation to begin
- `/enter` — text input + image swipe flow (the "unlock" experience)
- `/globe` — main globe view after the user's emotion has been assigned
- `/bubble` — the ephemeral 15-minute chat bubble

**Tech requirements:**
- React + TypeScript
- Three.js for 3D (globe will be added next prompt)
- Framer Motion for transitions
- TailwindCSS for styling
- No backend yet — we'll wire it up later

**Landing page (`/`) contents:**
- Centered: a large rotating 3D globe placeholder (just a colored sphere for now, Three.js component we'll fill in next)
- Above globe, serif title: "EchoWander"
- Below globe, italicized tagline: *"you're not alone right now — somewhere, someone feels exactly like you"*
- Single glowing button at the bottom: "Begin" → navigates to `/enter`
- Subtle stars twinkling in the background (CSS animation)

Start by scaffolding this. I'll paste specific screen prompts next.

# Lovable Prompts

Paste these in order into a new Lovable project. Each builds on the previous. The project assumes the env vars listed in the root `.env.example`.

| # | File | Scope |
| - | ---- | ----- |
| 1 | `01-scaffold.md` | Project setup, routes, aesthetic, session UUID |
| 2 | `02-questions.md` | The three onboarding questions → PAD-initial |
| 2b | `02b-mode-toggle.md` | Landing-page Echo/Healing mode toggle + payload wiring |
| 3 | `03-image-rounds.md` | Three image-pair rounds, loads `picture-dataset/bucket_<id>.json`, POSTs intake |
| 4 | `04-waiting-and-match.md` | Match polling loop |
| 5 | `05-chat.md` | Chat view (send + poll + end) |
| 6 | `06-globe-display.md` | Standalone live-match globe display |
| 7 | `07-ending-transition.md` | White-dwarf supernova transition from chat → postcard |

## After pasting

1. In Lovable's code editor, copy the nine `picture-dataset/bucket_*.json` files into `public/picture-dataset/` or equivalent so `fetch("/picture-dataset/bucket_1.json")` works.
2. Set env vars (Lovable project settings) using the values returned by n8n after workflow activation:
   - `VITE_N8N_INTAKE_URL`
   - `VITE_N8N_MATCH_URL`
   - `VITE_N8N_CHAT_SEND_URL`
   - `VITE_N8N_CHAT_POLL_URL`
   - `VITE_N8N_MATCH_END_URL`
   - `VITE_N8N_POSTCARD_URL` (for the ending transition → postcard reveal)
3. Deploy. Test end-to-end from two different browsers to verify matching.

# POF 2828 — Canonical Manifest
## Repo: github.com/YellowKidokc/pof2828
## April 27 2026

---

## THIS IS THE ONE REPO. Everything else is archived.

### pwa-panels/ — Standalone HTML panels
| File | Status | Notes |
|------|--------|-------|
| clipboard3.html | DONE | Pin + voice save fixed April 27 |
| tts-engine.html | NEEDS FIX | Add onchange="saveVoiceConfig()" to voice select |
| prompt_picker.html | DONE | |
| research_links.html | DONE | |
| comms.html | DONE | Built April 27, wires to theophysics-comms D1 |
| nexus-dashboard.html | DONE | |
| theophysics-hub.html | DONE | |
| task-calendar.html | DONE | |
| hub.html | DONE | |
| sw.js + manifest.webmanifest + icon.svg | DONE | |

### src/views/ — React views (Cloudflare PWA)
All 12 views exist. TTSView.tsx patched but NOT YET BUILT.
Run: npm run build

### Live Cloudflare Resources
- clipsync-db D1: e74123eb (9,018 items, 665 prompts)
- theophysics-comms D1: 9ee117a7 (14 channels, 101 messages)
- Worker: clipsync-api-production.davidokc28.workers.dev

### 5 PWA Install URLs
/ = main dashboard
/tts = TTS engine
/clipboard?mode=skinny = narrow clipboard
/prompts = prompts
/research = research links

### Build Order for Next AI
1. npm run build  (compiles TTSView.tsx patch)
2. Fix tts-engine.html: <select id="voice" onchange="saveVoiceConfig()">
3. npx wrangler pages deploy dist
4. DNS: pof.faiththruphysics.com -> Cloudflare Pages

### DO NOT TOUCH
- TTS voice logic in TTSView.tsx beyond existing patch
- Ports: 3456 (sync), 8420 (BIL), 9200 (theophysics hub)

### Previous TTS session context
https://claude.ai/chat/963bf9fb-a50a-4f47-a485-52d75ec6abc9
https://claude.ai/chat/0c55ec1c-6e7b-40b3-bea7-0ccb616385a4

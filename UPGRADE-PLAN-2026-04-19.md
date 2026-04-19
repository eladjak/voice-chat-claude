# 🎤 voice-chat-claude · Upgrade Plan · Sprint 6.6

**Author:** Claude Opus 4.7 · 2026-04-19
**Goal:** ship a voice assistant that is *actually used daily* by Elad, matching or exceeding what his peers use with Claude today.

---

## What changed since February 2026 (when we stopped)

| Capability | Then (Feb 2026) | Now (Apr 2026) |
|-----------|------------------|-----------------|
| **Hebrew TTS quality** | ElevenLabs Sarah · decent but robotic in Hebrew | **Gemini 2.5 Flash TTS** — native Hebrew voices (Charon, Achernar, Kore, Puck, Fenrir). Free tier, already integrated in Kami. |
| **STT speed** | Whisper base · 2-4s latency | **Whisper Turbo** (8× faster than large-v3) + `gemini-2.0-flash-stt` streaming · <500ms |
| **Wake word** | Porcupine v2, basic accuracy | **Porcupine v3** + custom "היי קלוד" model trained on your voice |
| **Interruption** | Abort stream on speech detect · worked but clunky | **Barge-in with natural turn-taking** (gemini live API) |
| **Model** | Claude 3.5 Sonnet · slower | **Claude Opus 4.7 (1M context)** or `claude-haiku-4-5` for instant turns |
| **Desktop app** | Electron experiment, TTS not tested | **Can ship now** — infra in `electron-app/` is 80% done |

## The upgrade in 5 layers

### Layer 1 — Model & TTS swap (1-2 hours)
- Replace ElevenLabs as default with **Gemini 2.5-flash-preview-tts** (same voice module Kami uses)
- Keep ElevenLabs as fallback (English only / premium cases)
- Add **voice switcher** in settings: Charon (male, warm), Achernar (female, warm), Kore (female, neutral)
- Test Hebrew pronunciation end-to-end

### Layer 2 — STT upgrade (1 hour)
- Switch default from Whisper base → **Whisper Turbo** (local, fast)
- Add Gemini 2.0 Flash STT as streaming option — partial results while user is still speaking
- Auto-detect language (Heb/Eng) and route to best STT per language

### Layer 3 — Desktop app finalization (2-3 hours)
The `electron-app/` from Feb needs:
1. **Fix wake-word mic conflict** — use `navigator.mediaDevices.getUserMedia` with `audio: { echoCancellation: false }` on a separate stream
2. **Wire Claude Code CLI** — exec `claude -p "..."` under the hood, stream stdout back as TTS. `CONTINUE_FROM_HERE.md` left off here.
3. **Auto-start on Windows** — register as startup app via Electron's `app.setLoginItemSettings`
4. **System tray icon** — push-to-talk with global hotkey `Ctrl+Shift+V`
5. **Package as MSI/EXE** — `electron-builder` with code-signing (or unsigned for personal)

### Layer 4 — The Claude-specific integrations
1. **Tool mode** — if the voice command looks like a tool call (e.g., "open file X", "commit and push"), route through Claude Code CLI. Otherwise plain conversation.
2. **Project-aware** — detect which project directory is open in Cursor, pre-load CLAUDE.md into context
3. **MCP bridge** — voice commands can trigger MCPs (chrome, stitch, context7, octocode) via Claude Code routing
4. **Multi-turn with interrupt** — like Claude voice in the app, but running locally with your data

### Layer 5 — Polish & delight
- **Waveform animation** matches Kami's style (purple/cyan gradient)
- **Transcription sidebar** with timestamp anchors
- **Memory integration** — hook into `claude-mem` so voice sessions feed the persistent memory
- **Haptic feedback** on Windows (mic click, response starts) if supported

## Estimated total: 6-8 hours of focused work

## What Elad gets at the end
A desktop voice assistant that:
- Wakes on "היי קלוד" from anywhere in Windows
- Talks Hebrew naturally (Gemini voices)
- Can do anything Claude Code does (via CLI routing) + anything MCPs can do
- Remembers previous conversations (via claude-mem)
- Feels like talking to a coworker, not talking to a chatbot
- No subscription required beyond existing Gemini + Anthropic free/paid tiers

## Priority order for next session
1. Layer 1 (model + Hebrew TTS) — highest impact, lowest risk
2. Layer 3 wake-word fix — unblocks daily usage
3. Layer 3 Claude Code CLI wiring — makes it actually useful
4. Layer 4 Tool mode — makes it feel magical
5. Layer 5 polish — last mile

## Risks
- Gemini TTS free tier rate limits (100 requests/day free) — fall back to ElevenLabs if hit
- Windows audio stack quirks — may need ASIO driver for lowest-latency
- Electron build size (150MB+) — acceptable for personal use

## Files to touch next session
- `src/lib/tts-router.ts` (new) — routes between Gemini / ElevenLabs / OpenAI
- `electron-app/main/voice-input.ts` — mic stream management
- `electron-app/main/wake-word.ts` — Porcupine integration
- `electron-app/main/claude-code-bridge.ts` — CLI exec + stdout streaming
- `electron-app/renderer/src/VoiceUI.tsx` — the desktop UI

---

## Notes from Elad (2026-04-19)

> "הגרסה שלך חזקה יותר לאין ערוך"

Translation: Claude (the model, me) is incomparably stronger now than when he built V1. So the voice chat that wraps me should reflect that — slower models weren't the bottleneck in Feb, but now 4.7 Opus + Haiku 4.5 + 1M context means the voice assistant can actually do work, not just chat.

> "גם הטכנולוגיה הזמינה כיום טובה מאוד ביחס למה שהיה לפני כמה חודשים"

The TTS/STT/wake-word stack matured — Gemini voices + Whisper Turbo + Porcupine v3 all shipped in Q1 2026. Time to absorb them.

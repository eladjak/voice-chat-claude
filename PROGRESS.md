# Voice Chat Claude - Progress

> **Last updated:** 2026-02-13
> **Status:** Active - Settings panel, wake word, and error handling improvements added

---

## Current State

### Working Features:

| Component | Status | Main File |
|-----------|--------|-----------|
| **Server (Hono)** | Done | `server/index.ts` |
| **STT - Whisper** | Done | `server/lib/whisper.ts` |
| **LLM - Claude** | Done | `server/lib/claude.ts` |
| **TTS - ElevenLabs** | Done | `server/lib/elevenlabs.ts` |
| **Frontend React** | Done | `src/components/VoiceChat.tsx` |
| **Push-to-Talk** | Done | `src/hooks/useVoiceChat.ts` |
| **VAD (Voice Activity Detection)** | Done | `src/hooks/useVAD.ts` |
| **Continuous conversation** | Done | `src/hooks/useContinuousVoiceChat.ts` |
| **Chat history (persist)** | Done | `server/lib/chat-store.ts` + `src/hooks/useChatHistory.ts` |
| **Settings panel** | Done | `src/components/SettingsPanel.tsx` + `src/hooks/useSettings.ts` |
| **Wake word detection** | Done | `src/hooks/useWakeWord.ts` |
| **Env validation** | Done | `server/lib/env.ts` |
| **TypeScript** | Done | No errors |

### TODO:

| Feature | Priority | Complexity | Notes |
|---------|----------|------------|-------|
| Streaming TTS | Medium | High | Reduce latency |
| Interruption handling | Medium | Medium | Graceful stop of response |
| Wake word integration in UI | Low | Low | Add toggle in settings, connect hook to continuous mode |
| WebSocket streaming | Low | High | Replace SSE with WebSocket for bidirectional |

---

## Project Structure

```
voice-chat-claude/
├── server/
│   ├── index.ts              # Hono server, port 3001, env validation
│   ├── lib/
│   │   ├── claude.ts         # Anthropic API (streaming + non-streaming, settings-aware)
│   │   ├── whisper.ts        # OpenAI Whisper STT (language from settings)
│   │   ├── elevenlabs.ts     # ElevenLabs TTS (voice from settings)
│   │   ├── chat-store.ts     # File-based JSON conversation persistence
│   │   ├── settings-store.ts # File-based settings persistence
│   │   └── env.ts            # Environment variable validation
│   └── routes/
│       ├── chat.ts           # POST /api/chat, /api/chat/stream
│       ├── transcribe.ts     # POST /api/transcribe
│       ├── speak.ts          # POST /api/speak
│       ├── conversations.ts  # GET/POST/PUT/DELETE /api/conversations
│       └── settings.ts       # GET/PUT /api/settings, GET /api/settings/voices
├── src/
│   ├── components/
│   │   ├── VoiceChat.tsx        # Main component with mode toggle + history + settings
│   │   ├── RecordButton.tsx     # Push-to-talk button
│   │   ├── ContinuousButton.tsx # Continuous conversation button
│   │   ├── ConversationLog.tsx  # Conversation log display
│   │   ├── ChatHistory.tsx      # History sidebar panel (right)
│   │   └── SettingsPanel.tsx    # Settings sidebar panel (left)
│   ├── hooks/
│   │   ├── useVoiceChat.ts          # Push-to-talk logic (with persistence)
│   │   ├── useContinuousVoiceChat.ts # Continuous mode (with persistence)
│   │   ├── useVAD.ts                 # Voice Activity Detection
│   │   ├── useAudioRecorder.ts      # Manual recording
│   │   ├── useChatHistory.ts        # Chat history persistence hook
│   │   ├── useSettings.ts           # Settings management hook
│   │   └── useWakeWord.ts           # Wake word detection (VAD + Whisper)
│   └── lib/
│       ├── api.ts             # API calls to server
│       ├── conversations.ts   # Conversations API client
│       ├── settings-api.ts    # Settings API client
│       └── types.ts           # Shared types, models, languages
├── data/
│   ├── conversations/         # JSON files per conversation (gitignored)
│   └── settings.json          # Persisted settings (gitignored)
├── .env                       # API keys (not in git)
├── .env.example               # Template
├── package.json
├── vite.config.ts
└── PROGRESS.md
```

---

## Workflows

### Continuous Conversation (default):
```
Click "Start Conversation"
    |
VAD listening (Silero model)
    |
Speech detected -> state: "speaking"
    |
End of speech -> state: "transcribing"
    |
Whisper STT
    |
Claude API (model from settings) -> state: "thinking"
    |
ElevenLabs TTS (voice from settings) -> state: "responding"
    |
Play audio + auto-save to JSON
    |
Back to VAD listening
```

### Push-to-Talk:
```
Button press -> recording
    |
Button release -> stop recording
    |
Whisper -> Claude -> ElevenLabs -> play + auto-save
```

### Wake Word Detection:
```
VAD listens for any speech
    |
Speech detected -> Whisper transcribes
    |
Check transcript for wake phrases ("hey claude", "hi claude", etc.)
    |
If wake word found -> callback fires with remaining text
If not found -> optionally notify (no action)
```

### Settings:
```
Click gear icon (top left)
    |
Settings panel opens with:
  - Voice selection (from ElevenLabs API)
  - Model selection (Sonnet 4 / Haiku 3.5 / Opus 4)
  - Language selection (Hebrew, English, Arabic, etc.)
  - System prompt editor
    |
Save -> persisted to data/settings.json
    |
All server endpoints read from settings automatically
```

---

## Environment Setup

### Required `.env`:
```env
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=... (optional, uses settings or default Sarah)
```

### Run:
```bash
npm run dev
# Client: http://localhost:5173
# Server: http://localhost:3001
```

---

## Change Log

### 2026-02-13 - Settings Panel, Wake Word, Error Handling
**Added:**
- `src/components/SettingsPanel.tsx` - Left sidebar for voice/model/language/prompt settings
- `src/hooks/useSettings.ts` - Settings state management hook
- `src/lib/settings-api.ts` - Client API for settings endpoints
- `src/lib/types.ts` - Shared types (VoiceOption, ModelOption, AppSettings, etc.)
- `src/hooks/useWakeWord.ts` - Wake word detection using VAD + Whisper
- `server/routes/settings.ts` - GET/PUT settings, GET voices from ElevenLabs
- `server/lib/settings-store.ts` - File-based settings persistence
- `server/lib/env.ts` - Environment variable validation at startup

**Updated:**
- `server/index.ts` - Added settings route, env validation on startup
- `server/lib/claude.ts` - Reads model/system prompt from settings, accepts overrides
- `server/lib/elevenlabs.ts` - Reads voice ID from settings, validates API key
- `server/lib/whisper.ts` - Reads language from settings, supports auto-detect
- `server/routes/chat.ts` - Better error handling, supports model override in request
- `src/components/VoiceChat.tsx` - Integrated settings panel, updated UI text

**Error Handling Improvements:**
- Server validates required env vars before starting (exits with clear message)
- ElevenLabs checks for missing API key before making requests
- Chat streaming endpoint wraps body parsing in try/catch
- Chat endpoint validates non-empty messages array
- Settings API has proper error boundaries

### 2026-02-13 - Chat History + TypeScript Fixes
**Added:**
- `server/lib/chat-store.ts` - File-based JSON storage for conversations
- `server/routes/conversations.ts` - Full CRUD REST API for conversations
- `src/lib/conversations.ts` - Client-side API for conversation endpoints
- `src/hooks/useChatHistory.ts` - Hook for managing conversation persistence
- `src/components/ChatHistory.tsx` - Sidebar panel for browsing/loading past conversations

**Updated:**
- `server/index.ts` - Added conversations route
- `src/components/VoiceChat.tsx` - Integrated chat history sidebar + auto-save
- `src/hooks/useVoiceChat.ts` - Added `initialMessages` + `onMessagesChange` options
- `src/hooks/useContinuousVoiceChat.ts` - Added `initialMessages` + `onMessagesChange` options
- `src/hooks/useVAD.ts` - Fixed TypeScript errors (ms-based API properties)

### 2026-02-02 - VAD + Continuous Conversation
**Added:**
- `@ricky0123/vad-web` - Voice Activity Detection
- `src/hooks/useVAD.ts` - VAD hook with Silero model
- `src/hooks/useContinuousVoiceChat.ts` - Continuous conversation logic
- `src/components/ContinuousButton.tsx` - UI with visual states
- Toggle between "continuous" and "push-to-talk"

### 2026-01-27 - Project Foundation
- Hono server with 3 routes (transcribe, chat, speak)
- React frontend with Vite
- Basic push-to-talk
- Tailwind CSS

---

## Known Issues

| Issue | Status | Notes |
|-------|--------|-------|
| None | - | No known issues |

---

## Future Ideas

1. **WebSocket streaming** - Improve latency
2. **Multi-language support** - Auto language detection
3. **Voice cloning** - Custom voice
4. **Electron app** - Native application
5. **Mobile PWA** - Mobile support
6. **Wake word UI toggle** - Add to settings panel for hands-free activation

---

## Reminder for Next Session

1. **Read this file** - `PROGRESS.md`
2. **Check TypeScript:** `npx tsc --noEmit`
3. **Run:** `npm run dev`
4. **Check browser:** `http://localhost:5173`
5. **Continue from TODO above**

---

*Updated automatically by Claude*

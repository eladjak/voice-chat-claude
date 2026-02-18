# Voice Chat Claude - Progress

> **Last updated:** 2026-02-18
> **Status:** Active - Streaming, interruption, waveform, export, keyboard shortcuts, VAD config

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
| **Streaming responses** | Done | `src/lib/api.ts` (streamMessage with AbortController) |
| **Interruption handling** | Done | Both voice chat hooks support abort + audio stop |
| **Waveform animation** | Done | `src/components/Waveform.tsx` |
| **Conversation export** | Done | `src/components/ConversationLog.tsx` (text + JSON) |
| **Keyboard shortcuts** | Done | `src/hooks/useKeyboardShortcuts.ts` |
| **VAD threshold config** | Done | `src/components/SettingsPanel.tsx` (collapsible VAD section) |
| **TypeScript** | Done | No errors |

### TODO:

| Feature | Priority | Complexity | Notes |
|---------|----------|------------|-------|
| Streaming TTS | Low | High | Stream TTS audio chunks as Claude tokens arrive |
| Wake word integration in UI | Low | Low | Add toggle in settings, connect hook to continuous mode |

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
│   │   ├── settings-store.ts # File-based settings persistence (incl. VAD thresholds)
│   │   └── env.ts            # Environment variable validation
│   └── routes/
│       ├── chat.ts           # POST /api/chat, /api/chat/stream
│       ├── transcribe.ts     # POST /api/transcribe
│       ├── speak.ts          # POST /api/speak
│       ├── conversations.ts  # GET/POST/PUT/DELETE /api/conversations
│       └── settings.ts       # GET/PUT /api/settings, GET /api/settings/voices
├── src/
│   ├── components/
│   │   ├── VoiceChat.tsx        # Main component with mode toggle + history + settings + shortcuts
│   │   ├── RecordButton.tsx     # Push-to-talk button
│   │   ├── ContinuousButton.tsx # Continuous conversation button
│   │   ├── ConversationLog.tsx  # Conversation log + streaming display + export
│   │   ├── ChatHistory.tsx      # History sidebar panel (right)
│   │   ├── SettingsPanel.tsx    # Settings sidebar panel (left) with VAD config
│   │   └── Waveform.tsx         # Visual waveform animation component
│   ├── hooks/
│   │   ├── useVoiceChat.ts          # Push-to-talk logic (streaming + interruption)
│   │   ├── useContinuousVoiceChat.ts # Continuous mode (streaming + interruption)
│   │   ├── useVAD.ts                 # Voice Activity Detection (configurable thresholds)
│   │   ├── useAudioRecorder.ts      # Manual recording
│   │   ├── useChatHistory.ts        # Chat history persistence hook
│   │   ├── useSettings.ts           # Settings management hook
│   │   ├── useWakeWord.ts           # Wake word detection (VAD + Whisper)
│   │   └── useKeyboardShortcuts.ts  # Keyboard shortcuts (Space, Escape)
│   └── lib/
│       ├── api.ts             # API calls (streamMessage with AbortController)
│       ├── conversations.ts   # Conversations API client
│       ├── settings-api.ts    # Settings API client
│       └── types.ts           # Shared types, models, languages, VAD settings
├── data/
│   ├── conversations/         # JSON files per conversation (gitignored)
│   └── settings.json          # Persisted settings incl. VAD (gitignored)
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
VAD listening (Silero model, configurable thresholds)
    |
Speech detected -> state: "speaking"
    |
End of speech -> state: "transcribing"
    |
Whisper STT
    |
Claude API STREAMING (tokens arrive one by one) -> state: "thinking"
    |
Stream complete -> ElevenLabs TTS -> state: "responding"
    |
Play audio + waveform animation + auto-save to JSON
    |
Back to VAD listening
```

### Push-to-Talk:
```
Button press (or Space key) -> recording
    |
Button release (or Space release) -> stop recording
    |
Whisper -> Claude (streaming) -> ElevenLabs -> play + waveform + auto-save
```

### Interruption:
```
During "thinking" or "responding":
  - User speaks (continuous mode) -> aborts stream + stops audio
  - Press Escape -> stops everything
  - Click mic button -> cancels current response
```

### Keyboard Shortcuts:
```
Space (push-to-talk mode) -> hold to record, release to send
Escape -> cancel/stop (both modes)
Note: disabled when focus is in input/textarea/select
```

### Export:
```
Click export button in conversation log
  -> Download as .txt (human-readable)
  -> Download as .json (machine-readable)
```

### Settings:
```
Click gear icon (top left)
    |
Settings panel opens with:
  - Voice selection (from ElevenLabs API)
  - Model selection (Sonnet 4 / Haiku 3.5 / Opus 4 / Opus 4.6)
  - Language selection (Hebrew, English, Arabic, etc.)
  - System prompt editor
  - VAD thresholds (collapsible):
    - Speech detection sensitivity (0.5-0.99)
    - End-of-speech sensitivity (0.1-0.7)
    - Min speech duration (50-500ms)
    - Silence tolerance (100-1000ms)
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

### 2026-02-18 - Streaming, Interruption, Waveform, Export, Shortcuts, VAD Config

**Feature 1: WebSocket/SSE Streaming for Claude Responses**
- `src/lib/api.ts` - Rewrote `streamMessage` from AsyncGenerator to callback-based with AbortController support
- `src/hooks/useVoiceChat.ts` - Uses streaming API, shows tokens as they arrive via `streamingResponse` state
- `src/hooks/useContinuousVoiceChat.ts` - Same streaming integration
- `src/components/ConversationLog.tsx` - Displays streaming response with animated cursor

**Feature 2: Interruption Handling**
- Both hooks now have `streamControllerRef` that can abort the fetch stream mid-response
- `useContinuousVoiceChat.ts` - `interruptResponse()` function aborts stream + stops audio
- `useVoiceChat.ts` - `handleCancel()` now also aborts ongoing streams
- In continuous mode, speaking while Claude is responding automatically interrupts

**Feature 3: Visual Waveform Animation**
- `src/components/Waveform.tsx` - New component with animated bars during processing/speaking
- Shows purple during thinking, green during speaking/responding
- Rendered in `VoiceChat.tsx` between the button and error area

**Feature 4: Conversation Export**
- `src/components/ConversationLog.tsx` - Added export dropdown with hover menu
- Download as `.txt` (human-readable: "You: ... Claude: ...")
- Download as `.json` (structured: messages array with metadata)
- Timestamped filenames

**Feature 5: Keyboard Shortcuts**
- `src/hooks/useKeyboardShortcuts.ts` - New hook for global keyboard event handling
- Space = push-to-talk (hold to record, release to send) in push-to-talk mode
- Escape = cancel/stop in both modes
- Shortcuts disabled when focus is in input/textarea/select elements
- Keyboard hint text shown below header

**Feature 6: VAD Energy Threshold Configuration**
- `src/hooks/useVAD.ts` - Accepts `thresholds` option, exports `DEFAULT_VAD_THRESHOLDS`
- `src/lib/types.ts` - Added `VADSettings` interface and `DEFAULT_VAD_SETTINGS`
- `server/lib/settings-store.ts` - Added VAD settings to server-side persistence
- `src/components/SettingsPanel.tsx` - Collapsible VAD section with range sliders:
  - Speech detection sensitivity (positiveSpeechThreshold)
  - End-of-speech sensitivity (negativeSpeechThreshold)
  - Min speech duration (minSpeechMs)
  - Silence tolerance / pause length (redemptionMs)
  - Reset to defaults button

**Verification:**
- `npx tsc --noEmit` - 0 errors

### 2026-02-14 - Lint Fixes, Accessibility, Error Handling
**Fixed:**
- `VoiceChat.tsx` - Resolved React Compiler memoization dependency issue by destructuring `saveMessages` from `chatHistory`
- `useChatHistory.ts` - Fixed missing `loadConversations` dependency in `useEffect`
- `useContinuousVoiceChat.ts` - Fixed ref access during render (moved `messagesRef.current` sync to `useEffect`)
- `useVoiceChat.ts` - Replaced `setState`-in-effect pattern with React-recommended "setState during render" pattern for derived state
- `useContinuousVoiceChat.ts` - Same derived state pattern fix

**Improved:**
- `chat-store.ts` - Added try/catch around `JSON.parse` in `getConversation` and `listConversations` to gracefully handle corrupted conversation files instead of crashing
- `SettingsPanel.tsx` - Added `role="dialog"`, `aria-label`, and `aria-hidden` attributes for screen reader support
- `ChatHistory.tsx` - Added `role="dialog"`, `aria-label`, and `aria-hidden` attributes for screen reader support
- `index.html` - Updated page title from "voice-chat-claude" to "Voice Chat with Claude"

**Added:**
- `types.ts` - Added Claude Opus 4.6 model to the available models list

**Verification:**
- `npx tsc --noEmit` - 0 errors
- `npx eslint .` - 0 errors, 0 warnings

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

1. **Streaming TTS** - Stream TTS audio chunks as Claude tokens arrive for even lower latency
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

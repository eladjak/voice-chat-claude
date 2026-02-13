# התקדמות הפרויקט - Voice Chat Claude

> **עדכון אחרון:** 2026-02-13
> **סטטוס כללי:** פעיל - היסטוריית שיחות (persist) הושלמה

---

## מצב נוכחי

### מה עובד (מוכן לשימוש):

| רכיב | סטטוס | קובץ ראשי |
|------|-------|-----------|
| **Server (Hono)** | v | `server/index.ts` |
| **STT - Whisper** | v | `server/lib/whisper.ts` |
| **LLM - Claude** | v | `server/lib/claude.ts` |
| **TTS - ElevenLabs** | v | `server/lib/elevenlabs.ts` |
| **Frontend React** | v | `src/components/VoiceChat.tsx` |
| **Push-to-Talk** | v | `src/hooks/useVoiceChat.ts` |
| **VAD (Voice Activity Detection)** | v | `src/hooks/useVAD.ts` |
| **שיחה רציפה** | v | `src/hooks/useContinuousVoiceChat.ts` |
| **היסטוריית שיחות (persist)** | v | `server/lib/chat-store.ts` + `src/hooks/useChatHistory.ts` |
| **TypeScript** | v | ללא שגיאות |

### מה חסר (TODO):

| פיצ'ר | עדיפות | מורכבות | הערות |
|-------|--------|----------|--------|
| Wake word ("היי קלוד") | בינונית | גבוהה | Porcupine / Picovoice |
| Streaming TTS | בינונית | גבוהה | להפחית latency |
| בחירת קול | נמוכה | נמוכה | UI לבחירת voice_id |
| Interruption handling | בינונית | בינונית | עצירה חלקה של תשובה |

---

## מבנה הפרויקט

```
voice-chat-claude/
├── server/
│   ├── index.ts           # Hono server, port 3001
│   ├── lib/
│   │   ├── claude.ts      # Anthropic API (streaming + non-streaming)
│   │   ├── whisper.ts     # OpenAI Whisper STT
│   │   ├── elevenlabs.ts  # ElevenLabs TTS
│   │   └── chat-store.ts  # File-based JSON conversation persistence
│   └── routes/
│       ├── chat.ts           # POST /api/chat, /api/chat/stream
│       ├── transcribe.ts     # POST /api/transcribe
│       ├── speak.ts          # POST /api/speak
│       └── conversations.ts  # GET/POST/PUT/DELETE /api/conversations
├── src/
│   ├── components/
│   │   ├── VoiceChat.tsx       # Main component with mode toggle + history
│   │   ├── RecordButton.tsx    # Push-to-talk button
│   │   ├── ContinuousButton.tsx # Continuous conversation button
│   │   ├── ConversationLog.tsx # Conversation log display
│   │   └── ChatHistory.tsx     # History sidebar panel
│   ├── hooks/
│   │   ├── useVoiceChat.ts          # Push-to-talk logic (with persistence)
│   │   ├── useContinuousVoiceChat.ts # Continuous mode (with persistence)
│   │   ├── useVAD.ts                 # Voice Activity Detection
│   │   ├── useAudioRecorder.ts      # Manual recording
│   │   └── useChatHistory.ts        # Chat history persistence hook
│   └── lib/
│       ├── api.ts             # API calls to server
│       └── conversations.ts   # Conversations API client
├── data/
│   └── conversations/         # JSON files per conversation (gitignored)
├── .env                   # API keys (not in git)
├── .env.example           # Template
├── package.json
├── vite.config.ts         # Includes CORS headers for ONNX
└── PROGRESS.md
```

---

## זרימת העבודה

### מצב שיחה רציפה (ברירת מחדל):
```
לחיצה "התחל שיחה"
    |
VAD מאזין (Silero model)
    |
זיהוי דיבור -> state: "speaking"
    |
זיהוי סוף דיבור -> state: "transcribing"
    |
Whisper STT
    |
Claude API -> state: "thinking"
    |
ElevenLabs TTS -> state: "responding"
    |
נגינת אודיו + auto-save לקובץ JSON
    |
חזרה ל-VAD מאזין
```

### מצב לחץ-לדבר:
```
לחיצה על כפתור -> הקלטה
    |
שחרור כפתור -> עצירת הקלטה
    |
Whisper -> Claude -> ElevenLabs -> נגינה + auto-save
```

### היסטוריית שיחות:
```
לחיצה על אייקון שעון (פינה ימנית עליונה)
    |
פאנל צד נפתח עם רשימת שיחות קודמות
    |
בחירת שיחה -> טעינת הודעות + המשך שיחה
    |
"שיחה חדשה" -> התחלה מחדש
    |
מחיקת שיחה -> כפתור מחיקה בריחוף
```

---

## הגדרות סביבה

### קובץ `.env` נדרש:
```env
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=... (אופציונלי, ברירת מחדל: Sarah)
```

### הפעלה:
```bash
npm run dev
# פותח: http://localhost:5173
# Server: http://localhost:3001
```

---

## היסטוריית שינויים

### 2026-02-13 - היסטוריית שיחות + תיקוני TypeScript
**נוספו:**
- `server/lib/chat-store.ts` - File-based JSON storage for conversations
- `server/routes/conversations.ts` - Full CRUD REST API for conversations
- `src/lib/conversations.ts` - Client-side API for conversation endpoints
- `src/hooks/useChatHistory.ts` - Hook for managing conversation persistence
- `src/components/ChatHistory.tsx` - Sidebar panel for browsing/loading past conversations

**עודכנו:**
- `server/index.ts` - Added conversations route
- `src/components/VoiceChat.tsx` - Integrated chat history sidebar + auto-save
- `src/hooks/useVoiceChat.ts` - Added `initialMessages` + `onMessagesChange` options
- `src/hooks/useContinuousVoiceChat.ts` - Added `initialMessages` + `onMessagesChange` options
- `src/hooks/useVAD.ts` - Fixed TypeScript errors (frame-based -> ms-based API properties)
- `.gitignore` - Added `data/` directory

**תיקוני TypeScript:**
- Fixed `RealTimeVADOptions` import to use `type` import (verbatimModuleSyntax)
- Fixed deprecated VAD options: `minSpeechFrames` -> `minSpeechMs`, `redemptionFrames` -> `redemptionMs`, `preSpeechPadFrames` -> `preSpeechPadMs`

### 2026-02-02 - VAD + שיחה רציפה
**נוספו:**
- `@ricky0123/vad-web` - Voice Activity Detection
- `src/hooks/useVAD.ts` - hook ל-VAD עם Silero model
- `src/hooks/useContinuousVoiceChat.ts` - לוגיקה של שיחה רציפה
- `src/components/ContinuousButton.tsx` - UI עם states
- Toggle בין "שיחה רציפה" ו"לחץ לדבר"

**עודכנו:**
- `src/components/VoiceChat.tsx` - תמיכה בשני מצבים
- `src/lib/api.ts` - תמיכה בפורמט WAV
- `vite.config.ts` - CORS headers ל-SharedArrayBuffer

### 2026-01-27 - בסיס הפרויקט
- Hono server עם 3 routes
- React frontend עם Vite
- Push-to-talk בסיסי
- Tailwind CSS

---

## באגים ידועים

| באג | סטטוס | הערות |
|-----|-------|--------|
| - | - | אין באגים ידועים כרגע |

---

## רעיונות לעתיד

1. **WebSocket streaming** - לשפר latency
2. **Multi-language support** - זיהוי שפה אוטומטי
3. **Voice cloning** - קול מותאם אישית
4. **Electron app** - אפליקציה native
5. **Mobile PWA** - תמיכה במובייל

---

## תזכורת לסשן הבא

כשאני מתחיל סשן חדש:

1. **קרא את הקובץ הזה** - `PROGRESS.md`
2. **בדוק TypeScript:** `npx tsc --noEmit`
3. **הפעל:** `npm run dev`
4. **בדוק ב-browser:** `http://localhost:5173`
5. **המשך מה-TODO למעלה**

### יכולות זמינות (מתיקיית הבית):
- **Skills** - `/commit`, `/review`, `/plan`, `/tdd`, וכו'
- **Agents** - planner, code-reviewer, tdd-guide, security-reviewer
- **MCPs** - Context7, Octocode, Ultracite ל-linting
- **Rules** - LSP navigation, codebase exploration, error handling patterns

---

*עודכן אוטומטית על ידי Claude*

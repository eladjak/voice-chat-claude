# Voice Claude Code - המשך עבודה

## סטטוס נוכחי (27/01/2026)

### מה עובד:
- ✅ הקלטה עם `Ctrl+Shift+V`
- ✅ תמלול עם Whisper (עברית)
- ✅ שליחה ל-Claude Code CLI
- ✅ קבלת תשובות מ-Claude
- ✅ ממשק משתמש עם הגדרות

### מה צריך לתקן:

#### 1. TTS בעברית - הבעיה העיקרית!
- שיניתי ל-OpenAI TTS (`gpt-4o-mini-tts`) עם קול `nova`
- **עדיין לא נבדק** - המשתמש לא הספיק לבדוק
- קובץ: `src/main/index.ts` - פונקציית `text-to-speech`

#### 2. Wake Word "היי קלוד"
- **מושבת זמנית** בגלל conflict עם המיקרופון
- יש שגיאת `PvRecorderStatusIOError` כשגם wake word וגם הקלטה פעילים
- פתרון אפשרי: להשתמש ב-Web Audio API במקום PvRecorder
- קבצים: `src/main/wakeWord.ts`, `src/main/index.ts`

#### 3. זיהוי אוטומטי של סוף דיבור (VAD)
- **מומש** ב-`src/renderer/src/App.tsx`
- עוצר אוטומטית אחרי ~1.5 שניות שקט
- **עדיין לא נבדק**

### הגדרות נוכחיות:
```json
{
  "voiceId": "nova",           // קול OpenAI - טוב לעברית
  "language": "he",
  "wakeWordEnabled": false,    // מושבת זמנית
  "hotkey": "CommandOrControl+Shift+V"
}
```

קובץ הגדרות: `%APPDATA%\voice-claude-code\settings.json`

### מה לעשות כשחוזרים:

1. **לבדוק TTS בעברית:**
   ```
   cd C:\Users\eladj\Documents\_פרויקטים\voice-claude-code
   npm run dev
   ```
   - לחץ `Ctrl+Shift+V`, דבר, לחץ שוב
   - לבדוק אם התשובה מגיעה **בעברית**

2. **אם TTS עדיין לא בעברית:**
   - לבדוק בלוגים מה השגיאה
   - אפשרויות: Google Cloud TTS, Cartesia AI, או לחזור ל-ElevenLabs עם הגדרות שונות

3. **לתקן Wake Word:**
   - ליצור גרסה של wake word שמשתמשת ב-Web Audio API במקום PvRecorder
   - או לוודא שאין conflict עם המיקרופון

### קבצים חשובים:
- `src/main/index.ts` - Main process, IPC handlers, TTS
- `src/main/wakeWord.ts` - Wake word detection
- `src/renderer/src/App.tsx` - UI, recording, VAD
- `src/preload/index.ts` - IPC bridge

### פקודות:
```bash
# להפעיל
npm run dev

# לסגור
taskkill //F //IM electron.exe

# לראות לוגים בזמן אמת
# הלוגים מופיעים בטרמינל שמריץ את npm run dev
```

### מקורות שנחקרו:
- OpenAI gpt-4o-mini-tts - שיפור של 35% בדיוק (דצמבר 2025)
- ElevenLabs eleven_multilingual_v2 - תומך בעברית אבל לא עם language_code
- Cartesia AI - latency נמוך (40-90ms) אבל לא ברור אם תומך בעברית
- Google Cloud TTS - יש קולות עבריים (he-IL) אבל צריך API key נפרד

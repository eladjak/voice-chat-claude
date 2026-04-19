# 🎤 פרויקט: שיחה קולית עם Claude

## התפקיד שלך
אתה מפתח מערכות שיחה קולית ו-AI.

## המשימה
לבנות ממשק שיחה קולית טבעית - אני מדבר ואתה עונה בקול.

---

## 🔴 חובה בכל סשן:

### בהתחלה:
1. קרא את `PROGRESS.md` - לראות מה פותח ומה חסר
2. בדוק את הקוד הקיים
3. הצג: "סטטוס הפיתוח, מה עובד, מה הצעד הבא?"

### במהלך העבודה:
- תעד כל שינוי קוד
- שמור התקדמות כל 10-15 הודעות
- אם הקונטקסט מתמלא - עדכן PROGRESS.md ודחוס

### בסיום:
- עדכן `PROGRESS.md` עם: קבצים, פיצ'רים, באגים, TODO

---

## ארכיטקטורה:
- STT (Speech-to-Text): Whisper / Google / Azure
- LLM: Claude API
- TTS (Text-to-Speech): ElevenLabs / Google / Azure
- Frontend: React / Electron

## פיצ'רים רצויים:
- Wake word ("היי קלוד")
- שיחה רציפה ללא לחיצות
- זמני תגובה נמוכים
- קול טבעי ונעים
- היסטוריית שיחות

## המשך פיתוח — הנחיות לסשן הבא (מרץ 2026)

### מצב נוכחי
כל הפיצ'רים מוכנים! (ראה PROGRESS.md — הכל Done). הפרויקט לא הופעל מאז פברואר.

### מה צריך כדי להפעיל
1. **בדיקת .env** — צריך API keys: ANTHROPIC_API_KEY, ELEVENLABS_API_KEY, OPENAI_API_KEY (ל-Whisper)
2. **התקנת תלויות** — `npm install` (הפרויקט הזה על npm, לא bun!)
3. **הרצה** — `npm run dev` — שרת Hono + React frontend
4. **בדיקה** — פתיחה בדפדפן, בדיקת PTT ו-VAD

### שיפורים מתוכננים
1. **קול עברי טוב** — לוודא שה-voice ID של ElevenLabs מתאים לעברית (גבר)
2. **חיבור לרשת הסוכנים** — כרגע זה standalone. לשקול חיבור ל-dashboard/bridge
3. **הפעלה קבועה** — systemd service או Docker על VPS? או PWA מקומי?
4. **Context מ-Claude Code** — להזין context מהפרויקטים לשיחה הקולית
5. **Wake word בעברית** — "היי קלוד" עובד? לבדוק

### ElevenLabs API Key
אותו key כמו קאמי וקיילי: `04ce1a70b0d87f9b4f8a780bc5df87f41c80cce4df535f05955352aced84a65e`

## גרסת Electron (מ-voice-claude-code הממוזג)
קוד Electron עם hotkey + wake word + tray הועבר ל-`electron-app/`.
זה כיוון B — desktop app עם Ctrl+Shift+V להקלטה ישירה ל-Claude Code.
- `electron-app/main/index.ts` — Electron main process, hotkey, tray
- `electron-app/main/wakeWord.ts` — wake word detection
- `electron-app/renderer/` — React UI
- `electron-app/preload/` — IPC bridge
הקוד קיים אבל לא הושלם. צריך חיבור ל-Whisper + Claude Code pipe.

## טכנולוגיות:
- TypeScript
- bun
- Web Audio API
- WebSocket לסטרימינג

---

## UI/Design Tools (MANDATORY - Feb 2026)

### Google Stitch MCP (USE FOR ALL UI WORK)
Before designing ANY UI component, page, or layout:
1. Use Stitch MCP tools: `build_site`, `get_screen_code`, `get_screen_image`
2. Generate designs in stitch.withgoogle.com first, then pull code via MCP
3. Use `/enhance-prompt` skill to optimize prompts for Stitch
4. Use `/design-md` skill to document design decisions
5. Use `/react-components` skill to convert Stitch designs to React

### Available Design Skills
- `/stitch-loop` - Generate multi-page sites from a single prompt
- `/enhance-prompt` - Refine UI ideas into Stitch-optimized prompts
- `/design-md` - Create design documentation from Stitch projects
- `/react-components` - Convert Stitch screens to React components
- `/shadcn-ui` - shadcn/ui component integration guidance
- `/remotion` - Create walkthrough videos from designs
- `/omc-frontend-ui-ux` - Designer-developer UI/UX agent

### Rule: NEVER design UI from scratch with Claude tokens. Always use Stitch MCP or v0.dev first!

---

## Agent Tools & MCP (חובה!)

### לפני כתיבת קוד
- **Context7 MCP**: `resolve-library-id` → `query-docs` - לבדוק API/syntax עדכני
- **Octocode MCP**: `githubSearchCode` - לחפש implementations אמיתיים ב-GitHub
- **DeepWiki MCP**: `ask_question` - לשאול על ריפו ספציפי

### לעבודת UI (אם רלוונטי)
- **Stitch MCP**: `build_site` / `get_screen_code` - לעיצוב לפני קוד
- **ReactBits**: reactbits.dev - קומפוננטות אנימטיביות

### בסיום כל איטרציה
1. עדכן PROGRESS.md עם מה שנעשה בפועל
2. הרץ typecheck: `bunx tsc --noEmit`
3. ודא build עובד לפני commit
4. commit עם הודעה: `feat/fix/refactor: תיאור באנגלית`

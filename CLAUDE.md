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

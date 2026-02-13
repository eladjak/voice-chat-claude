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

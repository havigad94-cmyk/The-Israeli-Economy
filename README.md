# מפת המשק הישראלי, גרסה 2

מפה אינטראקטיבית של בעלי ההון, החברות, היבואנים, הגופים המוסדיים והמפלגות בישראל, עם מקור לכל קשר.
הגרסה הראשונה (קובץ HTML יחיד) נשארת כפי שהיא ב-https://theisraelieconomy.vercel.app/. זהו פרויקט נפרד.

## מה יש כאן
- **שש תצוגות:** לפי תחומים, מרחב חופשי (עם סרגלי דחייה ואורך קשר), מעגלי השפעה סביב גוף אחד, עץ שליטה, מטריצה (מחזיקים × ענפים) ורשימה נגישה של כל הקשרים.
- **גילוי מדורג:** המפה נפתחת מקובצת. חברה או מותג שנשלטים בידי בעל שליטה אחד (50% ומעלה, או שליטה/זיכיון מוצהרים) מתקפלים לתוכו. לחיצה כפולה פותחת קבוצה.
- **סינון:** לפי סוג, ענף, ישראל/עולם, אחזקה מינימלית וסכום מימון מינימלי.
- **חיפוש וממוקד:** חיפוש עם התאמה חלקית שפותח את הקבוצה, מגדיל ומדגיש.
- **סיפורים מוכנים:** קובץ `public/data/stories.json`.
- **פאנל צד:** תיאור, שרשרת שליטה עם החזקה עקיפה, מחזיקים, אחזקות, קשרים פוליטיים וכל המקורות עם רמת ודאות.
- **קישור לתצוגה:** כל מצב נשמר בכתובת הדף.

## מבנה
```
public/data/
  nodes.json     גופים: id, type, name, sector, geo, abroad, summary, sources
  edges.json     קשרים: id, from, to, kind, share, label, note, former, asOf, confidence, sources, amount, currency
  sources.json   מקורות: id, type, title, publisher, url, published, accessed, needsLink
  sectors.json   ענפים
  stories.json   סיפורים מוכנים
src/
  data.ts        טעינה, אינדקסים, קבוצות ושרשראות שליטה
  state.ts       מצב האפליקציה וסנכרון לכתובת הדף
  model.ts       סינון, קיבוץ ואיחוד קשרים לתצוגה
  graph.ts       Cytoscape: סגנונות ופריסות (תחומים, fcose, concentric, dagre)
  panel.ts       פאנל הצד
  tables.ts      מטריצה ורשימה
  main.ts        בקרות, חיפוש, סיפורים
scripts/
  validate.mjs           בדיקת נתונים (רצה בכל build וב-GitHub Actions)
  import-csv.mjs         ייבוא שורות מגיליון
  migrate-v1.cjs         ההמרה החד-פעמית מגרסה 1 (אין להריץ שוב: היא דורסת את הקבצים)
  wave1-importers.cjs    גל נתונים 1: יבואני רכב ומוצרי צריכה
```

## הרצה
```
npm install
npm run dev        # שרת פיתוח
npm run validate   # בדיקת הנתונים
npm run build      # בדיקה + בנייה לתיקייה dist
```

## עדכון נתונים
1. ערכו את קבצי ה-JSON ב-`public/data`, או ייבאו מגיליון: `node scripts/import-csv.mjs edges my-edges.csv`.
2. לכל קשר חייב להיות מקור אחד לפחות ב-`sources`, ואחרת הבדיקה נכשלת.
3. רמת ודאות: `official` (דיווח רשמי), `press` (עיתונות), `estimate` (הערכה).
4. מקור בלי קישור מסומן `needsLink: true` ומוצג בפאנל כ"חסר קישור ישיר".

## העלאה ל-Vercel
Add New → Project → ייבוא המאגר. ההגדרות כבר ב-`vercel.json`: פקודת build היא `npm run build` ותיקיית הפלט `dist`.

## Supabase (אופציונלי)
לא נדרש כרגע. אם תרצו עריכה דרך ממשק ניהול על ידי כמה אנשים, אפשר להעביר את שלושת הקבצים לטבלאות nodes, edges ו-sources, ולייצא אותן ל-JSON בשלב ה-build, כך שהאתר נשאר סטטי ומהיר.

## דיווח על טעות
הכפתור בפאנל פותח Issue ב-GitHub. כתובת המאגר מוגדרת ב-`src/config.ts`.

קשר במפה אינו טענה לעבירה. המפה אינה ייעוץ השקעות.

## Partnerships

The "שותפויות" view and the "שותפים עסקיים" section in the panel are computed in `src/partners.ts` from the ownership links. Two holders (a person, family, institutional investor, or top-level company) are partners when:
- they hold the same company, directly or through a chain; or
- each holds separate companies in at least two shared sectors.

Nothing is entered by hand, so every partnership rests on links that already have sources.

## Reader feedback (questions, corrections, missing information)

The "לא מצאתם? כתבו לנו" button opens a form. Messages are saved to the `public.feedback` table in the Supabase project `israeli-economy-map`.
- The publishable key in `src/config.ts` can only add rows. Row-level security blocks reading, editing and deleting.
- To read messages, open the Supabase dashboard, then Table Editor, then feedback: https://supabase.com/dashboard/project/nnfoxlxaijlhsjdtpvdi/editor
- You can update each message's `status` column (new / in_progress / done / rejected) and `admin_note` column.

## Opening (hero)

`src/hero.ts` contains the "Converging Currents" generative canvas (rationale in `docs/hero-art-philosophy.md`) and the GSAP ScrollTrigger animations.

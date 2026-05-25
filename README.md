# פורטל סוכנים

פורטל Next.js קטן לניהול לקוחות עבור סוכנים, עם התחברות דרך Supabase והרשאות מבוססות `agent_id`.

## הגדרת Supabase

1. צרו פרויקט חדש ב-Supabase.
2. פתחו את SQL Editor והריצו את הקובץ `supabase/schema.sql`.
3. צרו משתמשים ב-`Authentication > Users`.
4. בזמן יצירת משתמש אפשר להוסיף `user_metadata` כך:

```json
{
  "full_name": "שרה כהן",
  "role": "agent"
}
```

או עבור מנהל:

```json
{
  "full_name": "מנהל מערכת",
  "role": "admin"
}
```

5. העתיקו את `.env.example` ל-`.env.local` והגדירו:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
MONDAY_API_TOKEN=...
MONDAY_OPPORTUNITIES_BOARD_ID=...
MONDAY_LEADS_BOARD_ID=...
MONDAY_LOAN_AMOUNT_COLUMN_ID=...
MONDAY_EXPECTED_COMMISSION_COLUMN_ID=...
MONDAY_MASTER_PAYMENT_COLUMN_ID=...
MONDAY_REFERRING_AGENT_COLUMN_ID=...
```

**סדר טעינת משתני סביבה (Next.js):** אם משתנה כבר קיים ב־`process.env` (למשל `export` בטרמינל, Docker, או סביבת אירוח), **הוא לא ידרס** את הערך מ־`.env.local`. אם תשובת הסנכרון מציגה `referringAgentColumnId` שונה ממה שבקובץ המקומי, בדקו שאין אותו שם גם בחוץ; לדוגמה `unset MONDAY_REFERRING_AGENT_COLUMN_ID` לפני `npm run dev`.

`MONDAY_API_TOKEN` נשמר בצד השרת בלבד ואינו נחשף ללקוח.

## אינטגרציית Monday.com

נוספה שכבת אינטגרציה בסיסית ב-`src/lib/integrations/monday/`:

- `env.ts` טוען את משתני הסביבה של Monday בצד השרת בלבד
- `service.ts` שולח בקשות GraphQL ל-Monday ומחזיר תצוגה ראשונית של לוח
- `src/app/api/integrations/monday/board/route.ts` מספק endpoint מאובטח לקריאה עתידית של נתוני לוח

הבחנה חשובה בין הלוחות:

- `MONDAY_OPPORTUNITIES_BOARD_ID` הוא לוח ההזדמנויות העסקי, והוא מקור האמת של הסנכרון הנוכחי לפורטל ול-`public.clients`
- `MONDAY_LEADS_BOARD_ID` הוא לוח leads עליון למשפך, נשמר לעבודה עתידית של intake / analytics, ולא משמש את סנכרון ה-MVP הנוכחי

ה-endpoint זמין ב-`GET /api/integrations/monday/board?limit=10` ורק משתמש `admin` מחובר יכול לגשת אליו כרגע.

ה-preview הנוכחי קורא רק מ-`MONDAY_OPPORTUNITIES_BOARD_ID`. לוח ה-leads נשמר במבנה הקוד לעבודה עתידית בלבד ואינו בשימוש ב-MVP הנוכחי.

## יצירת נתוני לקוחות

אחרי יצירת המשתמשים, קחו את ה-UUID שלהם מהטבלה `auth.users` או `public.profiles`, והכניסו רשומות לטבלת `public.clients` עם `agent_id` מתאים.

דוגמה:

```sql
insert into public.clients (client_name, status, loan_amount, expected_commission, agent_id, monday_item_id)
values
  ('נועם חדד', 'New', 250000, 5000, '<agent-uuid-1>', 'monday-1001'),
  ('מאיה אזולאי', 'In Review', 420000, 8400, '<agent-uuid-1>', 'monday-1002'),
  ('דניאל בן דוד', 'Approved', 560000, 11200, '<agent-uuid-2>', 'monday-1003');
```

## הרשאות

- סוכן רואה רק שורות שבהן `clients.agent_id = auth.uid()`
- מנהל רואה את כל השורות
- פעולות כתיבה על `clients` מוגבלות כרגע למנהלים

## הרצה מקומית

```bash
npm install
npm run dev
```


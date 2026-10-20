# MULTIBRAWN CHECK — מפת המערכת וההקמה

מערכת שמחליפה את הטלפונים: הלקוח ממלא שאלון אחד, ערדית מאשרת, המקומות המתאימים מקבלים קישור ועונים "פנוי + מחיר" או "לא פנוי".

## המסלול (מה בנוי עכשיו)

```
לקוח: /check (שאלון, 5 שלבים)  →  סיכום אוטומטי על המסך
        ↓
ערדית: מייל עם הסיכום + [אישור] [דחייה]
        ↓ אישור
ערדית: כפתור וואטסאפ ללקוח עם קישור תשלום 50 ₪ (ידני)
        ↓ "שולם ← שליחה למקומות"
מערכת: בוחרת 3–4 מקומות פעילים לפי אזור, קיבולת, הכשר מדויק, סוג מקום, ולא תפוסים בתאריך
ערדית: כפתור וואטסאפ לכל מקום עם קישור אישי (או שליחה אוטומטית דרך n8n)
        ↓
מקום: /check/v/?t=…  →  רואה פרטי אירוע בלבד (בלי שם וטלפון)  →  פנוי + מחיר / לא פנוי
        ↓
ערדית: מייל "אולמי הגן: פנוי · 280 ₪ למנה" + כפתור וואטסאפ ללקוח עם ההצעה (וסיור וירטואלי אם יש)
```

## איפה מה

| חלק | קובץ |
|---|---|
| רשימות הבחירה (הכשרים, אזורים, דרישות) | `public/check/options.js` (מקור אחד לדפדפן ולשרת) |
| שאלון ללקוח | `public/check/index.html` |
| עמוד תשובת המקום | `public/check/v/index.html` |
| קליטת שאלון | `netlify/functions/check-request.js` |
| אישור / דחייה / שליחה למקומות | `netlify/functions/check-admin.js` |
| תשובת מקום | `netlify/functions/check-inquiry.js` |
| סיכום, אימות, התאמה | `netlify/functions/lib/check/` |
| טבלאות | `supabase/check-schema.sql` |
| בדיקות | `test/check.js` (`npm test`) |

## הקמה (כפיר, כ-30 דקות)

1. **Supabase**: להריץ את `supabase/check-schema.sql` ב-SQL Editor של הפרויקט של multibrawn.co.il.
2. **Netlify** (האתר הזה) → Environment variables:
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (מפתח service role, לא anon)
   - `CHECK_SECRET`: מחרוזת אקראית ארוכה (חותמת את קישורי הניהול של ערדית)
   - `CHECK_PAY_LINK`: קישור ביט / GROW ל-50 ₪
   - `CHECK_BASE_URL`: `https://multibrawn.co.il/check` (אחרי שלב 4; עד אז ברירת המחדל היא כתובת האתר הזה)
   - לא חובה: `CHECK_FEE` (ברירת מחדל 50), `CHECK_N8N_WEBHOOK` (שליחת וואטסאפ אוטומטית)
   - כבר קיימים ומשמשים גם כאן: `RESEND_API_KEY`, `FROM_EMAIL`, `ARDIT_EMAIL`
3. **מקומות**: לייבא את 10–15 המקומות של הגל הראשון ל-`check_venues` (Table Editor → Import CSV), עם `area` ו-`kashrut` מתוך הרשימות ב-`options.js`, ו-`active = true`. הטבלה חוסמת יותר מ-10 פעילים באזור.
4. **האתר הראשי** (`multibrawn-2026`, ב-`netlify.toml`) — כלל אחד שמגיש את CHECK תחת הדומיין הראשי:
   ```toml
   [[redirects]]
     from = "/check/*"
     to = "https://guide.multibrawn.co.il/check/:splat"
     status = 200
   ```

## n8n (לא חובה)

כשמוגדר `CHECK_N8N_WEBHOOK`, נשלחים אירועים: `request.created`, `request.dispatched` (כולל לכל מקום: טלפון, קישור והודעה מוכנה, מוכן ל-WAHA), `inquiry.replied`.

## מה עוד לא בנוי

טופס זמינות שבועי למקום, רישום פגישות, תזכורות לפני פגישה ושאלת תוצאה אחריה. הטבלאות `check_availability` ו-`check_meetings` כבר מוכנות לזה.

# מדריך Make — יצירת תשלום GROW דינמי 🌸

המטרה: כשלוחצים "תשלום" באתר, Make יוצר עסקה ב-GROW ומחזיר לינק תשלום, והלקוח עובר לשלם.

**הזרימה:**
```
האתר (create-payment) → Webhook של Make → יצירת עסקה ב-GROW → Webhook Response (מחזיר לינק) → האתר מפנה לתשלום
```
האתר שולח ל-Make: `{ amount, customerName, email, successUrl, cancelUrl }`.
Make צריך להחזיר: `{ "url": "https://…לינק התשלום" }`.

---

## שלב 1 — Webhook (המודול הראשון)
1. ב-Make: **Create a new scenario**.
2. מוסיפים מודול ראשון → מחפשים **Webhooks** → **Custom webhook**.
3. **Add** → שם: `grow-pay` → **Save**. מעתיקים את ה-URL (זה שכבר יש לך: `https://hook.eu2.make.com/…`).
4. לוחצים **Redetermine data structure** — Make עכשיו "מקשיב".
5. שולחים בקשת טסט כדי ש-Make ילמד את מבנה הנתונים — או מהאתר (לחיצת "תשלום" בפריוויו), או ב-curl:
   ```bash
   curl -X POST "https://hook.eu2.make.com/nd1a74zhpe3qh178npsbj385r0bwlq8g" \
     -H "Content-Type: application/json" \
     -d '{"amount":99,"customerName":"בדיקה","email":"test@test.com","successUrl":"https://guide.multibrawn.co.il/thank-you.html?amount=99&product=premium","cancelUrl":"https://guide.multibrawn.co.il/"}'
   ```
   Make יציג "Successfully determined" — עכשיו הוא מכיר את `amount`, `email`, `successUrl`, `cancelUrl`.

---

## שלב 2 — יצירת העסקה ב-GROW (המודול השני)
**בדקי קודם מה GROW נותן לך** (בדשבורד → מפתחים / API). יש שתי דרכים:

### דרך א׳ — מודול GROW/Meshulam מובנה (אם קיים ב-Make)
1. מוסיפים מודול → מחפשים **Grow** או **Meshulam** → פעולה כמו **Create Payment / Create Payment Process**.
2. מתחברים עם ה-Credentials מ-GROW (API key / page code).
3. ממפים את השדות:
   - **Sum / סכום** → `{{amount}}` (מהמודול הראשון)
   - **Success URL** → `{{successUrl}}`
   - **Cancel URL** → `{{cancelUrl}}`
   - **שם / מייל** (אופציונלי) → `{{customerName}}` / `{{email}}`

### דרך ב׳ — מודול HTTP (אם אין מודול GROW מובנה)
1. מוסיפים מודול **HTTP → Make a request**.
2. ממלאים לפי תיעוד ה-API של GROW (למשל Meshulam `createPaymentProcess`):
   - **URL:** ה-endpoint ליצירת עסקה (מ-GROW API docs)
   - **Method:** `POST`
   - **Body type:** `application/x-www-form-urlencoded` (או JSON — לפי GROW)
   - **Fields:** את פרטי ה-API שלך (`pageCode`/`userId`/`apiKey`), ועוד:
     `sum` = `{{amount}}`, `successUrl` = `{{successUrl}}`, `cancelUrl` = `{{cancelUrl}}`,
     `description` = `מדריך שבת חתן`
   - **Parse response:** `Yes`
3. בתשובה של GROW יש שדה עם לינק התשלום (בד"כ `data.url`). זה מה שנחזיר בשלב הבא.

> אם אינך בטוחה בשמות השדות של GROW — הם מופיעים בתיעוד ה-API של GROW / בהגדרות החשבון. הכלל: להעביר סכום + שתי כתובות החזרה, ולקבל בחזרה לינק.

---

## שלב 3 — Webhook Response (המודול השלישי)
1. מוסיפים מודול **Webhooks → Webhook Response**.
2. ממלאים:
   - **Status:** `200`
   - **Body:**
     ```
     {"url":"{{ה-URL מהמודול של GROW}}"}
     ```
     (לוחצים בשדה ה-URL ובוחרים את שדה הלינק מהמודול הקודם — למשל `data.url`)
   - **Custom headers:** `Content-Type` = `application/json`

---

## שלב 4 — הפעלה ובדיקה
1. **Save** את הסינריו.
2. מדליקים את ה-**Scheduling** (המתג למטה-שמאל) ל-**ON** (או "Run once" לבדיקה בודדת).
3. מגדירים ב-**Netlify** → Site settings → Environment variables:
   `MAKE_PAYMENT_WEBHOOK` = כתובת ה-Webhook מ-שלב 1.
4. באתר (החי/פריוויו) לוחצים **"תשלום"** → אמור להיפתח דף התשלום של GROW.

---

## אם GROW החינמי לא נותן API ליצירת עסקה דינמית
לא כל תוכנית GROW כוללת API. אם זה המצב, שתי חלופות:
1. **2 לינקים קבועים** — לינק GROW נפרד ל-50₪ ואחד ל-99₪, בלי Make. פשוט להחליף את הלינקים באתר.
2. **Make ל-lead בלבד** — Make יקבל את הליד וישלח מייל/וואטסאפ, אבל התשלום דרך לינק קבוע.

תגידי לי מה GROW נותן (API מלא? רק לינק קבוע?), ואתאים את האתר בהתאם.

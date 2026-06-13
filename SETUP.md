# Multi Brawn — מדריך הקמת המשפך 🌸

מסמך זה מסביר איך לחבר את כל החלקים שכבר נבנו בקוד לשירותים החיצוניים (Tally, Google Sheets, N8N, WhatsApp, Grow).

## הזרימה
```
index.html  →  טופס Tally  →  N8N #1 (ליד חדש)  →  תשלום Grow  →  N8N #2 (תשלום)  →  thank-you.html → Guide.html (?token)
```

## מה כבר מוכן בריפו
| קובץ | תפקיד |
|------|-------|
| `index.html` | דף נחיתה שיווקי. ה-CTA מפנה לטופס Tally. |
| `Guide.html` | המדריך — מוגן ב-`?token=`. |
| `mgames.html` | 7 משחקי חיבור (מתנה). |
| `thank-you.html` | דף תודה אחרי תשלום. |
| `emails/welcome.html` | תבנית מייל #1 (ליד חדש). |
| `emails/payment-received.html` | תבנית מייל #2 (תשלום התקבל). |
| `n8n/workflow-1-new-lead.json` | Workflow #1 — מוכן לייבוא. |
| `n8n/workflow-2-payment-received.json` | Workflow #2 — מוכן לייבוא. |
| `netlify/functions/verify-token.js` | אופציונלי — אימות token אמיתי בצד שרת. |

---

## שלב 1 — `index.html` (כבר בנוי)
פתחו את `index.html`, בראש בלוק ה-`<script>` בתחתית יש:
```js
const TALLY_URL = "https://tally.so/r/YOUR_FORM_ID";
```
החליפו ב-URL האמיתי של טופס Tally (שלב 2). זה כל מה שצריך.

## שלב 2 — טופס Tally
1. צרו חשבון חינמי ב-[tally.so](https://tally.so).
2. בנו טופס עם השדות: **שם מלא\*, מייל\*, טלפון\*, סוג אירוע** (שבת חתן / בר מצוה / חתונה / אחר), מועד משוער (אופציונלי), מספר אורחים (אופציונלי).
3. **Integrations → Webhooks** → הדביקו את כתובת ה-Webhook של N8N #1 (שלב 4).
4. **After submit → Redirect** → לכתובת `https://guide.multibrawn.co.il` (או דף "תודה על ההרשמה").
5. העתיקו את ה-Share URL של הטופס → הדביקו ב-`TALLY_URL`.

## שלב 3 — Google Sheet
צרו גיליון בשם **"Multi Brawn - Leads"**, לשונית `Leads`, עם הכותרות (שורה 1):
```
תאריך | שם | מייל | טלפון | סוג אירוע | סטטוס | תאריך תשלום | הערות
```
העתיקו את ה-Sheet ID מה-URL (`.../spreadsheets/d/<ID>/edit`).

## שלב 4 — N8N Workflow #1 (ליד חדש)
1. ב-N8N: **Import from File** → `n8n/workflow-1-new-lead.json`.
2. החליפו את ה-placeholders:
   - `YOUR_GOOGLE_SHEET_ID` → ה-ID משלב 3.
   - `YOUR_SHEETS_CRED` / `YOUR_GMAIL_CRED` → בחרו את ה-credentials שלכם בכל node (Google Sheets, Gmail).
   - WhatsApp: `YOUR_WHATSAPP_PHONE_ID` + credential `YOUR_WA_CRED` (שלב 6).
3. פתחו את ה-Webhook node → העתיקו את **Production URL** → הדביקו ב-Tally (שלב 2.3).
4. שמרו והפעילו (Active).

> הקובץ כבר ממפה את שדות Tally בגמישות (לפי תווית השדה בעברית/אנגלית), שולח מייל ללקוח, מייל ל-multibrawn@gmail.com, והודעת WhatsApp עם לינק Grow.

## שלב 5 — N8N Workflow #2 (תשלום התקבל)
1. **Import from File** → `n8n/workflow-2-payment-received.json`.
2. החליפו את אותם placeholders (Sheet ID, credentials, WhatsApp).
3. פתחו את ה-Webhook node → העתיקו את ה-Production URL → הגדירו אותו כ-Webhook ב-Grow (שלב 7).
4. ה-node **"Generate Access Token"** יוצר token תואם ל-`Guide.html` (אל תשנו את האלגוריתם — ראו "אבטחת token").
5. שמרו והפעילו.

> אם ל-Grow אין Webhook זמין בתוכנית שלכם: אפשר להפעיל את Workflow #2 ידנית (Manual trigger) או דרך Zapier/מייל אישור תשלום ל-N8N. הצומת הראשון הוא Webhook אך ניתן להחליפו ב-trigger אחר.

## שלב 6 — WhatsApp API
שתי אפשרויות:
- **WhatsApp Cloud API (מומלץ, חינמי להתחלה):** צרו אפליקציה ב-[Meta for Developers](https://developers.facebook.com), קבלו `Phone Number ID` ו-`Access Token`. ב-N8N הגדירו credential מסוג **Header Auth**: `Authorization = Bearer <TOKEN>`. החליפו `YOUR_WHATSAPP_PHONE_ID` ב-URL.
- **Twilio:** החליפו את ה-HTTP node ב-node של Twilio (WhatsApp), עם `From` = מספר ה-Twilio שלכם.

> הצמתים כבר ממירים מספר ישראלי (`05X...`) לפורמט בינלאומי (`9725X...`).

## שלב 7 — Grow
לינק התשלום הקיים מוטמע כבר בקוד:
```
https://pay.grow.link/6e880b694e3a5cedda22d6f52a6bb84b-MzUyMzAzNA
```
ב-Grow, תחת הגדרות הדף/העסקה, חפשו **Webhook / התראת תשלום** והפנו ל-Production URL של N8N #2. ודאו שה-payload כולל אימייל הלקוח (ה-workflow מנסה כמה שמות שדה נפוצים: `email`, `payerEmail`, `customer.email`).

---

## אבטחת token
- `Guide.html` מאמת את ה-token בצד לקוח (checksum). זה **מרתיע שיתוף מזדמן** אך לא חוסם משתמש טכני — קוד הלקוח גלוי.
- האלגוריתם ב-`Guide.html` חייב להישאר זהה ל-node "Generate Access Token" ב-Workflow #2. אל תשנו אחד בלי השני.
- **לאבטחה אמיתית** (מומלץ אם מוכרים בהיקף): הפעילו את `netlify/functions/verify-token.js` — אימות מול רשימת tokens חתומה בצד שרת. ראו הערות בקובץ עצמו.

## שלב 8 — העלאה (GitHub + Netlify)
1. מזגו את ה-PR הזה ל-`main`.
2. ב-Netlify חברו את הריפו; Publish directory = שורש הריפו (אתר סטטי, אין build).
3. הצביעו את הדומיין `guide.multibrawn.co.il` ל-Netlify.
4. ודאו: `index.html` נטען, ה-CTA פותח את Tally, `Guide.html` ללא token מפנה ל-`index.html`, ועם token תקין נפתח.

## בדיקת End-to-End ✅
- [ ] מילוי טופס Tally → מגיע מייל welcome + WhatsApp + שורה ב-Sheet (סטטוס "ליד חדש").
- [ ] תשלום בדיקה ב-Grow → מגיע מייל "המדריך מוכן" עם לינק token + עדכון Sheet ל"שילם".
- [ ] לחיצה על הלינק → `Guide.html` נפתח, ה-token נשמר ל-localStorage.
- [ ] כניסה ל-`Guide.html` בלי token → הפניה ל-`index.html`.

---

## תמונות
ראו `images/README.md` — הניחו תמונות ייחודיות (אם חסרות, הדפים מציגים רקע גרדיאנט במקום, ללא תמונה שבורה).

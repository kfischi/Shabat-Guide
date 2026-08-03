# Multi Brawn — מדריך הקמת המשפך 🌸

מסמך זה מסביר איך לחבר את כל החלקים שכבר נבנו בקוד לשירותים החיצוניים (Tally, Google Sheets, WAHA, Grow) דרך מנוע אוטומציה.

> **מנוע האוטומציה:** אפשר להשתמש ב-**Make** (מומלץ אם כבר התחלת שם) או ב-**N8N**. ה-token עבר ל-SHA-256 כך ששניהם יכולים לייצר אותו נייטיב. שלבי N8N מפורטים למטה + קבצי JSON מוכנים לייבוא; מתכון ה-token ל-Make נמצא בסעיף "אבטחת token". בשני המקרים ה-webhook, ה-Sheet, המיילים וה-WAHA זהים — רק "הצינור" שמחבר אותם שונה.

> ⚠️ **אבטחה — קראו לפני הכל:** מפתחות וסיסמאות (Tally API key, N8N JWT, סיסמת WAHA, Service Account JSON, Gmail App Password) **לא נשמרים בריפו אף פעם**. הם מוזנים רק ב-UI של N8N (Credentials) או כ-Environment Variables ב-Netlify. אם מפתח נחשף בצ'אט/מסמך — מומלץ להחליף אותו (rotate).

## הזרימה
```
index.html → טופס Tally → thank-you-lead.html
                ↓ webhook
           N8N #1 (ליד חדש) → מייל + WAHA + Google Sheet
                ↓ הלקוח משלם
           תשלום Grow → webhook → N8N #2 (תשלום) → token + מייל + WAHA
                ↓
           thank-you.html → Guide.html?token=…  (+ games.html?token=…)
```

## מה כבר מוכן בריפו
| קובץ | תפקיד |
|------|-------|
| `index.html` | דף נחיתה שיווקי. ה-CTA מפנה לטופס Tally. |
| `Guide.html` | המדריך — מוגן ב-`?token=`. |
| `games.html` | 7 משחקי חיבור (מתנה) — מוגן ב-`?token=`. |
| `thank-you-lead.html` | דף תודה אחרי **מילוי הטופס** (לפני תשלום) — Tally מפנה אליו. |
| `thank-you.html` | דף תודה אחרי **תשלום**. |
| `emails/welcome.html` | תבנית מייל #1 (ליד חדש). |
| `emails/payment-received.html` | תבנית מייל #2 (תשלום התקבל). |
| `n8n/workflow-1-new-lead.json` | Workflow #1 — מוכן לייבוא. |
| `n8n/workflow-2-payment-received.json` | Workflow #2 — מוכן לייבוא. |
| `netlify/functions/verify-token.js` | אופציונלי — אימות token אמיתי בצד שרת. |

### היכן מזינים כל מפתח (לא בקוד!)
| מפתח/סוד | היכן מזינים |
|---|---|
| Tally API Key | רק אם משתמשים ב-API של Tally; אחרת לא נדרש |
| N8N JWT / Webhook secret | בהגדרות N8N עצמו |
| Service Account JSON / Google OAuth | N8N → Credentials (Google Sheets/Gmail) |
| Gmail App Password | N8N → Credentials (אם שולחים דרך SMTP במקום OAuth) |
| סיסמת/מפתח WAHA | N8N → Credentials (Header Auth: `X-Api-Key`) |
| `MB_TOKEN_SECRET` (אופציונלי) | Netlify → Site settings → Environment variables |

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
4. **After submit → Redirect** → לכתובת `https://guide.multibrawn.co.il/thank-you-lead.html`.
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
   - WhatsApp: credential `YOUR_WAHA_CRED` (שלב 6) — ה-URL כבר מוגדר ל-WAHA שלכם.
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

## שלב 6 — WhatsApp דרך WAHA
ה-nodes כבר מוגדרים לשרת ה-WAHA שלכם: `https://waha.multibrawn.co.il/api/sendText`.
1. **סנכרון מכשיר:** היכנסו ל-[dashboard של WAHA](https://waha.multibrawn.co.il/dashboard/), ודאו שה-session (`default`) במצב **WORKING** וסרקו QR מהטלפון של המספר העסקי (972523983394).
2. **Credential ב-N8N:** צרו credential מסוג **Header Auth** בשם `YOUR_WAHA_CRED` עם המפתח של WAHA (בדרך כלל `X-Api-Key`). בחרו אותו בשני ה-WhatsApp nodes.
3. ה-nodes ממירים מספר ישראלי (`05X…`) לפורמט בינלאומי ומוסיפים `@c.us` (פורמט chatId של WAHA) — אין מה לשנות.

> אם ה-API של WAHA לא דורש מפתח — אפשר להשאיר את ה-node ללא authentication. אם הוא מאחורי Basic Auth (admin/סיסמה) — השתמשו ב-credential מסוג **Basic Auth** במקום Header Auth.

## שלב 7 — Grow
לינק התשלום הקיים מוטמע כבר בקוד:
```
https://pay.grow.link/6e880b694e3a5cedda22d6f52a6bb84b-MzUyMzAzNA
```
ב-Grow, תחת הגדרות הדף/העסקה, חפשו **Webhook / התראת תשלום** והפנו ל-Production URL של N8N #2. ודאו שה-payload כולל אימייל הלקוח (ה-workflow מנסה כמה שמות שדה נפוצים: `email`, `payerEmail`, `customer.email`).

---

## אבטחת token (SHA-256 — עובד עם Make, N8N ו-Netlify)
- **פורמט ה-token:** `MB-<payload>-<check>` כאשר `payload` = מחרוזת hex ייחודית, ו-`check` = 8 התווים הראשונים של `SHA-256("MB-" + payload)`.
- `Guide.html` ו-`games.html` מאמתים את זה נייטיב בדפדפן (SHA-256). כל מנוע (Make / N8N / Netlify) יכול לייצר token תואם כי SHA-256 מובנה בכולם.
- זה **מרתיע שיתוף מזדמן** אך לא חוסם משתמש טכני — קוד הלקוח גלוי. **לאבטחה אמיתית** הפעילו את `netlify/functions/verify-token.js` (חתימת HMAC בצד שרת עם סוד שלא נחשף).
- ⚠️ הדפים משתמשים ב-`crypto.subtle` — עובד רק על **HTTPS** (או `localhost`). בפרודקשן (`guide.multibrawn.co.il`) זה תקין; לבדיקה מקומית פִּתחו דרך שרת מקומי ולא כקובץ `file://`.

### יצירת ה-token ב-Make (3 מודולי "Set variable")
| שלב | שם משתנה | ערך |
|---|---|---|
| 1 | `payload` | `{{substring(lower(sha256(concat(email; "|"; formatDate(now; "x")))); 0; 12)}}` |
| 2 | `token`   | `MB-{{payload}}-{{substring(lower(sha256(concat("MB-"; payload))); 0; 8)}}` |

אחר כך בונים את הקישור: `https://guide.multibrawn.co.il/Guide.html?token={{token}}` (וכן `games.html?token={{token}}`).
> ב-N8N זה כבר מובנה ב-node "Generate Access Token" (אותו אלגוריתם בדיוק).

## שלב 8 — העלאה (GitHub + Netlify)
1. מזגו את ה-PR הזה ל-`main`.
2. ב-Netlify חברו את הריפו; Publish directory = שורש הריפו (אתר סטטי, אין build).
3. הצביעו את הדומיין `guide.multibrawn.co.il` ל-Netlify.
4. ודאו: `index.html` נטען, ה-CTA פותח את Tally, `Guide.html` ללא token מפנה ל-`index.html`, ועם token תקין נפתח.

## בדיקת End-to-End ✅
- [ ] מילוי טופס Tally → הפניה ל-`thank-you-lead.html` + מייל welcome + WAHA + שורה ב-Sheet (סטטוס "ליד חדש").
- [ ] תשלום בדיקה ב-Grow → מגיע מייל "המדריך מוכן" עם לינק token + עדכון Sheet ל"שילם".
- [ ] לחיצה על הלינק → `Guide.html` נפתח, ה-token נשמר ל-localStorage.
- [ ] `games.html?token=…` נפתח; וגם דרך הקישור הפנימי מהמדריך (token מ-localStorage).
- [ ] כניסה ל-`Guide.html` או `games.html` בלי token → הפניה ל-`index.html`.

---

## תמונות
ראו `images/README.md` — הניחו תמונות ייחודיות (אם חסרות, הדפים מציגים רקע גרדיאנט במקום, ללא תמונה שבורה).

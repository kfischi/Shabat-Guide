# Multibrawn — הקמת מסירת המדריך אחרי תשלום 🌸

מסמך זה מסביר איך להפעיל את מנגנון המסירה: **לקוח משלם ב-GROW → מקבל את המדריך** בשלוש דרכים עצמאיות (דף תודה, אימייל, וואטסאפ ידני של ערדית), וכל מכירה נרשמת ב-Google Sheets.

> **בלי Twilio ובלי Meta.** וואטסאפ נשלח ידנית מהטלפון של ערדית דרך קישור מוכן. זו החלטה מודעת.

## הזרימה
```
דף נחיתה (public/index.html)
        ↓ טופס (Netlify Forms, חינם) — לכידת ליד לפני תשלום
   thank-you-lead.html → GROW (תשלום 99₪)
        ↓ GROW שולח webhook + מפנה לדף תודה
   grow-webhook  ─┬─ אימייל ללקוח (Resend) עם קישור אישי
                  ├─ אימייל לערדית עם כפתור וואטסאפ מוכן
                  └─ שורה ב-Google Sheet
   public/thank-you.html → /guide?id=…  → guide.js מאמת ומגיש את המדריך
```

## אפליקציה (PWA)
כל המשפך ארוז כ-**אפליקציה מתקינה**: `public/manifest.webmanifest` + `public/sw.js` (Service Worker) + `public/icon.svg`. באתר החי אפשר "הוסף למסך הבית" והכל נפתח במסך מלא כמו אפליקציה, עם **מעברים חלקים בין הדפים** (View Transitions) ועבודה בסיסית **אופליין** לדפים הציבוריים. ה-SW **לא נוגע** ב-`/guide`, `/ai` ו-`/grow-webhook` — הם תמיד מהרשת, כך שהאבטחה והיועץ ממשיכים לעבוד. אין מה להגדיר — עולה אוטומטית עם הפריסה.

## מבנה
| קובץ | תפקיד |
|---|---|
| `public/index.html` | דף נחיתה + טופס הרשמה (Netlify Forms) |
| `public/thank-you-lead.html` | דף אחרי מילוי הטופס (לפני תשלום) — כפתור תשלום GROW |
| `public/thank-you.html` | דף אחרי תשלום (יעד ההפניה של GROW) — קישור למדריך |
| `netlify/functions/grow-webhook.js` | מקבל את התשלום ומפעיל הכל (מפרט §5) |
| `netlify/functions/guide.js` | מגיש את המדריך/המשחקים אחרי אימות |
| `netlify/functions/private/guide.html` | תוכן המדריך — **מחוץ ל-public**, לא נגיש ישירות |
| `netlify/functions/private/games.html` | המשחקים (בונוס) — מוגן באותו אופן |
| `netlify/functions/lib/{token,sheets,mailer,phone}.js` | מודולי עזר |
| `netlify.toml` | publish=public, functions, included_files, redirects |
| `test/run.js` | בדיקות (מריצים `npm test`) — 20 בדיקות כולל כל §12 |

## משתני סביבה
מגדירים ב-**Netlify → Site settings → Environment variables**. **אף אחד לא נמצא בקוד ולא נשלח לדפדפן.** אם משתנה חסר — הפונקציה רושמת שגיאה ברורה וממשיכה, בלי לקרוס.

| משתנה | תוכן |
|---|---|
| `RESEND_API_KEY` | מפתח Resend |
| `FROM_EMAIL` | `noreply@multibrawn.co.il` (חייב דומיין מאומת ב-Resend) |
| `ARDIT_EMAIL` | כתובת ההתראות של ערדית |
| `ARDIT_WHATSAPP` | `972523983394` |
| `GROW_WEBHOOK_SECRET` | סוד לאימות הפנייה מ-GROW |
| `TOKEN_SECRET` | מחרוזת אקראית ארוכה (ליצירת קישורים אישיים) |
| `GOOGLE_SA_EMAIL` | כתובת ה-service account |
| `GOOGLE_SA_PRIVATE_KEY` | המפתח הפרטי (מדביקים as-is; הקוד תומך גם ב-`\n` וגם בשורות אמיתיות) |
| `SHEET_ID` | מזהה הגיליון (מה-URL: `/spreadsheets/d/<ID>/edit`) |
| `ANTHROPIC_API_KEY` | מפתח Anthropic — מפעיל את **היועץ החכם (AI)** במדריך הפרימיום. בלעדיו היועץ פשוט לא זמין (הכלים האחרים עובדים). מקבלים ב-[console.anthropic.com](https://console.anthropic.com) |
| `ANTHROPIC_MODEL` | אופציונלי — ברירת מחדל `claude-opus-5`. אפשר לשנות למודל חסכוני יותר (למשל `claude-haiku-4-5`) כדי להוזיל עלות לכל שאלה |
| `GROW_USER_ID` / `GROW_PAGE_CODE` / `GROW_API_KEY` | **המסלול המומלץ** — חיבור ישיר ל-GROW Light API (`createPaymentProcess`). מעתיקים מהגדרות ה-API ב-GROW. עם אלה, האתר יוצר עסקאות 50/99 ₪ לבד (מחיר דינמי, שם+טלפון מוזנים), בלי Make ובלי לינקים קבועים |
| `GROW_MODE` | אופציונלי — `sandbox` לעבודה מול סביבת הבדיקות של GROW. ברירת מחדל: production |
| `MAKE_PAYMENT_WEBHOOK` | חלופה ל-API הישיר — webhook של **Make** שיוצר עסקת GROW. בלעדיו (ובלי GROW API) — נופלים ללינק GROW קבוע כדי שהמכירה לא תיתקע |
| `SITE_URL` | אופציונלי — כתובת האתר (ברירת מחדל `https://guide.multibrawn.co.il`). משמשת לבניית `successUrl`/`cancelUrl` |
| `GROW_FALLBACK_LINK` | אופציונלי — לינק GROW קבוע לגיבוי אם Make לא זמין |
| `GROW_LINK_50` / `GROW_LINK_99` | **המסלול הפשוט** — לינק GROW קבוע לכל מדרגה (50/99). ראו `GO-LIVE.md` |
| `ALLOW_SELF_TOKEN` | אופציונלי — `false` מכבה את הטוקן-שמאמת-את-עצמו (דף התודה) ומשאיר רק HMAC/גיליון (הקשחת אבטחה) |

### תשלום דרך Make (GROW חינמי)
כשלוחצים "תשלום", האתר קורא ל-`/create-payment` (פונקציית שרת — בלי CORS), שמעבירה ל-Make:
`{ amount, customerName, email, successUrl, cancelUrl }`. **ה-Make scenario צריך:** לקבל את זה ב-Webhook → ליצור עסקה ב-GROW עם הסכום וכתובות החזרה → להחזיר את **לינק התשלום** במודול **Webhook Response** (כ-JSON `{"url":"…"}` או כטקסט עם ה-URL). האתר מקבל את הלינק ומעביר את הלקוח לתשלום.
- `successUrl` שנבנה אוטומטית: `/thank-you.html?amount=<סכום>[&product=premium]` — כך דף התודה פותח את המדריך הנכון (50₪ → בסיסי, 99₪ → פרימיום).
- אם Make לא מוגדר / נכשל — הפונקציה מחזירה לינק GROW קבוע, כך שאפשר למכור גם לפני שסוגרים את Make.

## הקמה — שלב אחר שלב
1. **Google Sheet:** צרו גיליון בשם "Multi Brawn - Leads" עם העמודות: `תאריך | מזהה עסקה | שם | אימייל | טלפון | סכום | קישור אישי | מייל ללקוח | התראה לערדית | וואטסאפ נשלח`. **שתפו אותו עם ה-service account** (הרשאת עריכה).
2. **Google Service Account:** ב-Google Cloud → צרו service account, הפעילו **Google Sheets API**, הורידו JSON. משם: `GOOGLE_SA_EMAIL` (client_email) ו-`GOOGLE_SA_PRIVATE_KEY` (private_key).
3. **Resend:** הירשמו, אמתו את הדומיין `multibrawn.co.il`, צרו API key → `RESEND_API_KEY`.
4. **Netlify:** הריפו כבר מחובר (פרויקט `shabat-guide`). הזינו את כל משתני הסביבה. פרסמו (`publish=public`, functions אוטומטי).
5. **GROW:**
   - **Webhook** → `https://guide.multibrawn.co.il/grow-webhook`.
   - **הפניה אחרי תשלום** → `https://guide.multibrawn.co.il/thank-you.html`.
6. **בדיקה:** תשלום ניסיון → מייל ללקוח, התראה לערדית, שורה בגיליון, והמדריך נפתח.

## שתי מדרגות מוצר (50₪ כניסה · 99₪ פרימיום)
- **50₪** → המדריך הבסיסי (`private/guide.html`). זה מה שדף הנחיתה מוכר.
- **99₪** → מהדורת הפרימיום (`private/premium-guide.html`) — הכלים האינטראקטיביים, התבניות והפלייבוק. נמכרת ב**דף האפסייל** `public/upsell.html`.
- **ניתוב אוטומטי:** `grow-webhook` בוחר את המוצר לפי הסכום — **99₪ ומעלה → פרימיום**, אחרת → המדריך הבסיסי. גם `thank-you.html` מכבד `amount`/`product` בפרמטרים.
- **CTA לאפסייל:** מופיע בתוך המדריך הבסיסי (באנר 👑) ומפנה ל-`/upsell.html`.

### מה צריך להגדיר לשתי המדרגות
1. **שני מוצרים ב-GROW:** לינק תשלום ל-50₪ (קיים) ולינק נפרד ל-99₪.
2. ב-`public/upsell.html` החליפו את `PAY_URL` (בראש ה-`<script>`) בלינק ה-99₪.
3. שני הלינקים יכולים להפנות לאותו `thank-you.html`; ה-webhook מזהה את המוצר לפי הסכום.
   > אם רוצים שדף התודה יפתח ישר את הפרימיום גם בלי מייל — ודאו ש-GROW מעביר `amount` בהפניה, או הוסיפו `?product=premium` ל-URL ההצלחה של מוצר ה-99₪.

## בדיקות (מקומי)
```
npm test
```
מריץ 20 בדיקות עם רשת מדומה (בלי קריאות חיצוניות): טוקן, טלפון, חתימה, מניעת כפילות, כשל Resend, טלפון לא תקין, ואימות ה-guide (טוקן / גיליון / דחייה).

## ⚠️ מה עוד צריך לאשר מול GROW (מסומן `TODO` בקוד)
מבנה ה-payload ושיטת החתימה של GROW אינם ידועים בוודאות. לפני מכירה אמיתית, בקשו מכפיר:
1. **דוגמת payload** מתשלום ניסיון (שקל) → כדי לכוונן את `FIELD_MAP` בראש `grow-webhook.js`.
2. **שיטת החתימה + שם ה-header** של GROW → מעדכנים ב-`verifySignature`. עד אז, אם אין header/סוד — הפנייה מתקבלת ונרשמת אזהרה בלוג (כדי לאפשר בדיקות). **לפני production ודאו ש-`GROW_WEBHOOK_SECRET` מוגדר ושהחתימה מאומתת.**
3. **שם שדה מזהה העסקה** בהפניית דף התודה → מעדכנים את רשימת ה-`keys` ב-`public/thank-you.html`.

בריצה הראשונה, ה-payload הגולמי נרשם ב-Netlify Functions log — משם מתאימים את השמות המדויקים.

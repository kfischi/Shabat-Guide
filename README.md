# Multibrawn — אתר הפרימיום העצמאי

אתר עצמאי שמוכר ומוסר את **מדריך הפרימיום לשבת חתן** (97₪), מחובר ל-GROW,
עם דומיין משלו — נפרד לגמרי מהמשפך הראשי.

## איך זה עובד
1. `public/index.html` — דף המכירה (הבית). כפתור "לשדרוג" יוצר תשלום דרך `/create-payment`.
2. GROW — הלקוח משלם 97₪ בעמוד סליקה קבוע.
3. `public/thank-you.html` — GROW מפנה לכאן אחרי תשלום; הדף מנפיק טוקן ופותח את המדריך.
4. `netlify/functions/guide.js` — מגיש את `private/premium-guide.html` **רק** עם טוקן תקין (מאחורי תשלום).

> התוכן מוגן: אי אפשר להגיע למדריך בלי לעבור דרך תשלום → דף התודה. אין לינק ציבורי לתוכן.

## פריסה ל-Netlify (אתר חדש)
1. **Add new site → Import an existing project** → בחר את הריפו `Shabat-Guide`.
2. **Branch to deploy:** `premium-site`
3. **Publish directory:** `public` · **Functions:** `netlify/functions` (מוגדר ב-netlify.toml)
4. **Deploy**, ואז **Domain management** → חבר דומיין משלך.

## הגדרות GROW (עמוד הסליקה של 97₪ עבור אתר זה)
בטאב "עמוד תודה" של עמוד הסליקה:
- **קישור לעמוד תודה:** `https://<הדומיין-של-אתר-זה>/thank-you.html?amount=97&product=premium`
- **קישור לעדכון מערכות מידע (שרת):** `https://<הדומיין-של-אתר-זה>/grow-webhook`

## משתני סביבה (אופציונליים)
המסירה עובדת גם בלי הגדרות (טוקן עצמי בדף התודה). לשדרוג:
- `SITE_URL` = הדומיין של אתר זה (כדי שקישורי המייל יצביעו לכאן)
- `GROW_LINK_99` = לינק סליקה קבוע ל-97₪ (אם שונה מברירת המחדל)
- `RESEND_API_KEY`, `FROM_EMAIL` = לשליחת מיילים · `ANTHROPIC_API_KEY` = ליועץ ה-AI

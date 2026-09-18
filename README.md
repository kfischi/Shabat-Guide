# מדריך שבת חתן — אתר עצמאי (חינם)

אתר סטטי עצמאי של המדריך החינמי לשבת חתן, מבית **Multibrawn**.
בלי שרת, בלי מסד נתונים, בלי מפתחות API — HTML/CSS/JS בלבד.

## תוכן
- `index.html` — המדריך (30 שלבים) + טעימת יועץ + הובלה לפרימיום
- `games.html` — משחקי חיבור לשבת
- `netlify.toml` — הגדרת פרסום ב-Netlify

## העלאה ל-Netlify (2 דקות)
1. צור ריפו חדש ב-GitHub (למשל `multibrawn-free-guide`) והעלה אליו את הקבצים האלה.
2. ב-**app.netlify.com** → **Add new site** → **Import an existing project** → בחר את הריפו.
3. Publish directory: `.` (ברירת מחדל). לחץ **Deploy**.
4. תחת **Domain management** אפשר לחבר דומיין משלך.

## קישורים
- כפתורי "שדרוג לפרימיום" מפנים לעמוד המכירה בפרימיום שבאתר הראשי:
  `https://shabat-guide.netlify.app/premium`
  (אם תחבר דומיין לאתר הראשי — עדכן קישור זה ב-`index.html`.)

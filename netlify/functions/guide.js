// ============================================================
//  guide — מגיש את המדריך (או המשחקים) רק אחרי אימות.
//  שני מסלולי אימות:
//   1) id + t   → מחשב מחדש את הטוקן ומשווה בבטחה (קישור מהמייל).
//   2) id בלבד  → מאמת מול הגיליון שהעסקה קיימת (הפניית תודה מ-GROW,
//                 שאין לה טוקן כי הסוד לא יוצא מהשרת).
// ============================================================
const fs = require('fs');
const path = require('path');
const { verifyToken, selfTokenValid } = require('./lib/token');
const sheets = require('./lib/sheets');

const PAGES = { guide: 'guide.html', games: 'games.html', premium: 'premium-guide.html' };

function loadPrivate(fileName) {
  const candidates = [
    path.join(__dirname, 'private', fileName),
    path.join(process.cwd(), 'netlify/functions/private', fileName),
    path.join(__dirname, '..', 'private', fileName),
  ];
  for (const p of candidates) {
    try {
      return fs.readFileSync(p, 'utf8');
    } catch (e) {
      /* try next */
    }
  }
  throw new Error('private page not found: ' + fileName);
}

function denied() {
  const wa = 'https://wa.me/972523983394';
  const html = `<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>הקישור לא תקין</title>
<style>body{margin:0;background:#FBF8FF;color:#1A0B2E;font-family:Arial,Helvetica,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;padding:24px}
.box{max-width:440px}h1{font-size:24px;margin:0 0 14px}p{color:#66557E;line-height:1.7;font-size:16px;margin:0 0 22px}
a{display:inline-block;background:#FF0090;color:#fff;text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:8px}</style></head>
<body><div class="box"><h1>הקישור לא תקין</h1>
<p>אם רכשת את המדריך ולא הצלחת להיכנס — דברו איתנו ונפתור את זה מיד.</p>
<a href="${wa}">דברו איתנו בוואטסאפ</a></div></body></html>`;
  return { statusCode: 403, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: html };
}

exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  const id = (q.id || '').trim();
  const t = (q.t || '').trim();
  const page = PAGES[q.page] ? q.page : 'guide';

  if (!id) return denied();

  // מסלול 1 — טוקן HMAC חתום (קישורים מהמייל / Make / N8N)
  let authorized = false;
  if (t) {
    authorized = verifyToken(id, t, process.env.TOKEN_SECRET);
  }

  // מסלול 2 — טוקן שמאמת את עצמו (דף התודה מנפיק אחרי תשלום; מאפשר את המסלול הפשוט
  // בלי backend). כיבוי: ALLOW_SELF_TOKEN=false
  if (!authorized && t && process.env.ALLOW_SELF_TOKEN !== 'false') {
    authorized = selfTokenValid(t);
  }

  // מסלול 3 — אימות מול הגיליון (עסקה קיימת)
  if (!authorized) {
    try {
      authorized = await sheets.hasTransaction(id);
    } catch (e) {
      console.error('[guide] אימות מול הגיליון נכשל:', String(e && e.message));
      authorized = false;
    }
  }

  if (!authorized) return denied();

  // הגשת התוכן + הזרקת קישורים צולבים שנושאים id&t (כדי שהמעבר מדריך↔משחקים יישאר מאומת)
  let html;
  try {
    html = loadPrivate(PAGES[page]);
  } catch (e) {
    console.error('[guide]', String(e && e.message));
    return { statusCode: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: 'שגיאה בטעינת המדריך' };
  }
  const qs = `id=${encodeURIComponent(id)}${t ? `&t=${encodeURIComponent(t)}` : ''}`;
  html = html
    .replace(/__GUIDE_URL__/g, `/guide?${qs}`)
    .replace(/__GAMES_URL__/g, `/guide?${qs}&page=games`)
    .replace(/__HOME_URL__/g, '/');

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex',
    },
    body: html,
  };
};

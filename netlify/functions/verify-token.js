// ============================================================
// אופציונלי — אימות token אמיתי בצד שרת (Netlify Function).
//
// למה: האימות ב-Guide.html הוא צד-לקוח בלבד (checksum) ולכן מרתיע
// שיתוף מזדמן אך לא חוסם משתמש טכני. אם רוצים אבטחה אמיתית, מאמתים
// כאן מול סוד שמור בצד שרת.
//
// איך מפעילים:
//   1. ב-Netlify הגדירו משתנה סביבה  MB_TOKEN_SECRET  (מחרוזת אקראית ארוכה).
//   2. עדכנו את N8N Workflow #2 כך שה-token ייחתם באותו סוד (HMAC) במקום
//      ה-checksum הפשוט — ואת הוֹלידציה ב-Guide.html כך שתקרא ל-endpoint הזה:
//        const r = await fetch('/.netlify/functions/verify-token?token='+t);
//        const ok = (await r.json()).valid;
//   3. כך הסוד לעולם לא נחשף בצד הלקוח.
//
// הפונקציה למטה היא תבנית עובדת לחתימת HMAC-SHA256.
// ============================================================
const crypto = require('crypto');

function sign(payload, secret){
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url').slice(0, 12);
}

exports.handler = async (event) => {
  const secret = process.env.MB_TOKEN_SECRET;
  if (!secret) {
    return { statusCode: 500, body: JSON.stringify({ valid: false, error: 'MB_TOKEN_SECRET not set' }) };
  }
  const token = (event.queryStringParameters && event.queryStringParameters.token) || '';
  // Expected format: MB-<payload>-<sig>
  const m = /^MB-([0-9a-zA-Z]+)-([0-9a-zA-Z_-]{12})$/.exec(token);
  const valid = !!m && sign('MB-' + m[1], secret) === m[2];

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify({ valid })
  };
};

// For the N8N side, generate matching tokens with:
//   const payload = Date.now().toString(36) + Math.random().toString(36).slice(2,8);
//   const sig = crypto.createHmac('sha256', SECRET).update('MB-'+payload).digest('base64url').slice(0,12);
//   const token = 'MB-' + payload + '-' + sig;

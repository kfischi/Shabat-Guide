const crypto = require('crypto');

// יצירה ואימות של טוקן אישי לגישה למדריך.
// token = HMAC-SHA256(transaction_id, TOKEN_SECRET) → base64url → 16 תווים ראשונים.
// הסוד (TOKEN_SECRET) חי רק בשרת ולעולם לא נשלח לדפדפן.

function makeToken(transactionId, secret) {
  if (!secret) throw new Error('TOKEN_SECRET missing');
  return crypto
    .createHmac('sha256', secret)
    .update(String(transactionId))
    .digest('base64url')
    .slice(0, 16);
}

// השוואה בזמן קבוע (timingSafeEqual) כדי למנוע timing attacks.
function verifyToken(transactionId, token, secret) {
  if (!token || !secret) return false;
  let expected;
  try {
    expected = makeToken(transactionId, secret);
  } catch (e) {
    return false;
  }
  const a = Buffer.from(expected);
  const b = Buffer.from(String(token));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

module.exports = { makeToken, verifyToken };

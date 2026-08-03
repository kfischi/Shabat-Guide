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

// Self-validating token (no server secret) — used by the "thank-you grants access"
// flow so the simple no-backend launch works. Format: MB-<hex>-<first 8 hex of
// SHA-256("MB-"+payload)>. Deters casual link-sharing (a random /guide URL 403s);
// for full security, turn it off with ALLOW_SELF_TOKEN=false and use HMAC/sheet.
function selfTokenValid(t) {
  if (!t || typeof t !== 'string') return false;
  const m = t.match(/^MB-([0-9a-f]+)-([0-9a-f]{8})$/i);
  if (!m) return false;
  const h = crypto.createHash('sha256').update('MB-' + m[1].toLowerCase()).digest('hex');
  return h.slice(0, 8) === m[2].toLowerCase();
}

module.exports = { makeToken, verifyToken, selfTokenValid };

// שליחת אימייל דרך Resend (https://resend.com) ב-fetch, בלי תלות ב-npm.
// ניסיון חוזר רק על שגיאה זמנית (5xx / 429 / נפילת רשת): 3 ניסיונות, השהיה 1/2/4 ש'.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function resendFetch(apiKey, payload) {
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    let res;
    try {
      res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (netErr) {
      // נפילת רשת — זמני, ננסה שוב
      lastErr = netErr;
      if (attempt < 2) await sleep(1000 * Math.pow(2, attempt));
      continue;
    }
    if (res.ok) return await res.json().catch(() => ({}));

    const body = await res.text().catch(() => '');
    const transient = res.status >= 500 || res.status === 429;
    lastErr = new Error(`Resend ${res.status}: ${body.slice(0, 200)}`);
    lastErr.status = res.status;
    if (transient && attempt < 2) {
      await sleep(1000 * Math.pow(2, attempt));
      continue;
    }
    throw lastErr; // שגיאה קבועה (4xx) — בלי ניסיון חוזר
  }
  throw lastErr;
}

// מחזיר סיבת כישלון בעברית שערדית מבינה (לרישום בגיליון).
function hebrewReason(err) {
  const s = String((err && err.message) || err || '');
  if (/missing|חסר/i.test(s)) return 'מפתח Resend חסר';
  if (/\b401\b|unauthorized|api key/i.test(s)) return 'מפתח Resend שגוי';
  if (/\b422\b|invalid.*email|not a valid/i.test(s)) return 'כתובת מייל לא תקינה';
  if (/\b429\b/.test(s)) return 'חריגה ממכסת השליחה';
  if (/\b5\d\d\b|ECONN|ENOTFOUND|network|fetch failed/i.test(s)) return 'תקלת רשת זמנית';
  return 'שגיאת שליחה: ' + s.slice(0, 80);
}

async function sendEmail({ apiKey, from, to, subject, html }) {
  if (!apiKey) throw new Error('RESEND_API_KEY missing (מפתח Resend חסר)');
  if (!from) throw new Error('FROM_EMAIL missing (כתובת השולח חסרה)');
  if (!to) throw new Error('נמען חסר');
  return resendFetch(apiKey, { from, to, subject, html });
}

module.exports = { sendEmail, hebrewReason };

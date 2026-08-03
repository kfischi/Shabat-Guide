// ============================================================
//  create-payment — יוצר עסקת GROW דרך Make (התוכנית החינמית של GROW
//  לא נותנת API ישיר, אז Make הוא הגשר). האתר קורא לפונקציה הזו, היא
//  שולחת ל-Make את הסכום + כתובות החזרה, ו-Make מחזיר את לינק התשלום.
//  קריאה שרת-לשרת → בלי CORS. אם Make לא מוגדר — נופלים ללינק GROW קבוע.
// ============================================================

const SITE = (process.env.SITE_URL || 'https://guide.multibrawn.co.il').replace(/\/+$/, '');
const GROW_FALLBACK = process.env.GROW_FALLBACK_LINK || 'https://pay.grow.link/6e880b694e3a5cedda22d6f52a6bb84b-MzUyMzAzNA';

function json(statusCode, obj) {
  return { statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(obj) };
}

// מחלץ URL תשלום מתשובת Make — תומך גם ב-JSON (url/paymentUrl/link…) וגם בטקסט גולמי
function extractUrl(raw) {
  const txt = String(raw || '').trim();
  try {
    const j = JSON.parse(txt);
    const u = j.url || j.paymentUrl || j.payment_url || j.link || j.redirect || (j.data && (j.data.url || j.data.link)) || '';
    if (u) return String(u).trim();
  } catch (e) { /* not JSON */ }
  const m = txt.match(/https?:\/\/[^\s"']+/);
  return m ? m[0] : '';
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (e) { body = {}; }
  const amount = Math.max(0, Math.round(Number(body.amount) || 0));
  const product = body.product === 'premium' ? 'premium' : '';
  const successUrl = `${SITE}/thank-you.html?amount=${amount}${product ? '&product=' + product : ''}`;
  const cancelUrl = `${SITE}/`;

  const hook = process.env.MAKE_PAYMENT_WEBHOOK;
  if (!hook) {
    // Make עדיין לא חובר — מחזירים לינק GROW קבוע כדי שהמכירה לא תיתקע
    console.warn('[create-payment] MAKE_PAYMENT_WEBHOOK חסר — משתמשים בלינק GROW קבוע.');
    return json(200, { url: GROW_FALLBACK, fallback: true });
  }

  try {
    const res = await fetch(hook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, customerName: String(body.name || ''), email: String(body.email || ''), successUrl, cancelUrl }),
    });
    const raw = await res.text().catch(() => '');
    const url = extractUrl(raw);
    if (url) return json(200, { url });
    console.error('[create-payment] Make לא החזיר URL:', res.status, raw.slice(0, 300));
    return json(200, { url: GROW_FALLBACK, fallback: true });
  } catch (e) {
    console.error('[create-payment]', String(e && e.message));
    return json(200, { url: GROW_FALLBACK, fallback: true });
  }
};

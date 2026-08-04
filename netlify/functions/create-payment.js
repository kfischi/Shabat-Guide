// ============================================================
//  create-payment — יוצר עסקת GROW ומחזיר לינק תשלום.
//  שלושה מסלולים, לפי סדר עדיפות (הראשון שמצליח מנצח):
//   1) GROW Light API ישירות (createPaymentProcess) — אם מוגדרים
//      GROW_USER_ID + GROW_PAGE_CODE (+ GROW_API_KEY). מחיר דינמי, בלי Make.
//   2) Make webhook — אם מוגדר MAKE_PAYMENT_WEBHOOK.
//   3) לינק GROW קבוע — נפילה בטוחה כדי שמכירה לא תיתקע.
//  קריאה שרת-לשרת → בלי CORS. GROW חוסם קריאות מהדפדפן.
// ============================================================

function site() {
  return (process.env.SITE_URL || 'https://guide.multibrawn.co.il').replace(/\/+$/, '');
}

// המסלול הפשוט (בלי API/Make): לינק GROW קבוע לפי הסכום. נקרא בזמן ריצה כדי לכבד env.
function fixedLinkFor(amount) {
  const fallback = process.env.GROW_FALLBACK_LINK || 'https://pay.grow.link/6e880b694e3a5cedda22d6f52a6bb84b-MzUyMzAzNA';
  const l50 = process.env.GROW_LINK_50 || fallback; // מדרגת כניסה
  const l99 = process.env.GROW_LINK_99 || fallback; // מדרגת פרימיום
  return amount >= 99 ? l99 : l50;
}

function json(statusCode, obj) {
  return { statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(obj) };
}

// GROW אוסר תווים מיוחדים בפרמטרים — מנקים בעדינות (שומרים עברית, אותיות, ספרות, רווח, נקודה, מקף).
function clean(v) {
  return String(v == null ? '' : v).replace(/[<>"'`\\]/g, ' ').replace(/\s+/g, ' ').trim();
}

// בונה גוף multipart/form-data (GROW דורש form-data, לא JSON). בלי תלויות.
function buildMultipart(fields) {
  const boundary = '----growMB' + Date.now();
  const CRLF = '\r\n';
  let body = '';
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null || v === '') continue;
    body += `--${boundary}${CRLF}`;
    body += `Content-Disposition: form-data; name="${k}"${CRLF}${CRLF}`;
    body += `${v}${CRLF}`;
  }
  body += `--${boundary}--${CRLF}`;
  return { boundary, body };
}

// GROW Light API — createPaymentProcess. מחזיר URL תשלום או '' אם נכשל.
async function growApi({ amount, name, phone, email, description, successUrl, cancelUrl, notifyUrl }) {
  const userId = process.env.GROW_USER_ID;
  const pageCode = process.env.GROW_PAGE_CODE;
  const apiKey = process.env.GROW_API_KEY;
  if (!userId || !pageCode) return ''; // לא מוגדר — לא המסלול הזה

  const host = process.env.GROW_MODE === 'sandbox'
    ? 'https://sandbox.meshulam.co.il'
    : 'https://secure.meshulam.co.il';
  const endpoint = `${host}/api/light/server/1.0/createPaymentProcess/`;

  const { boundary, body } = buildMultipart({
    pageCode,
    userId,
    apiKey,
    sum: String(amount),
    description: clean(description || 'דמי רצינות — שבת חתן'),
    paymentNum: '1',
    maxPaymentNum: '1',
    chargeType: '1',           // תשלום רגיל
    successUrl,
    cancelUrl,
    notifyUrl,
    pageField: undefined,      // מקום שמור אם GROW ידרוש בעתיד
    fullName: clean(name),
    phone: clean(phone),
    email: clean(email),
  });

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body,
  });
  const raw = await res.text().catch(() => '');
  let j;
  try { j = JSON.parse(raw); } catch (e) { j = null; }

  // הצלחה: status==1 ו-data.url
  const ok = j && (j.status === 1 || j.status === '1');
  const url = j && j.data && (j.data.url || j.data.link || j.data.paymentUrl);
  if (ok && url) return String(url).trim();

  const errMsg = j && j.err ? JSON.stringify(j.err) : raw.slice(0, 300);
  console.error('[create-payment] GROW API לא החזיר URL:', res.status, errMsg);
  return '';
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
  const base = site();
  const successUrl = `${base}/thank-you.html?amount=${amount}${product ? '&product=' + product : ''}`;
  const cancelUrl = `${base}/`;
  const notifyUrl = `${base}/grow-webhook`;

  // 1) GROW Light API ישירות (המסלול המועדף)
  try {
    const url = await growApi({
      amount,
      name: body.name || '',
      phone: body.phone || '',
      email: body.email || '',
      description: product === 'premium' ? 'מדריך הפרימיום — שבת חתן' : 'דמי רצינות — שבת חתן',
      successUrl, cancelUrl, notifyUrl,
    });
    if (url) return json(200, { url });
  } catch (e) {
    console.error('[create-payment] GROW API:', String(e && e.message));
  }

  // 2) Make webhook
  const hook = process.env.MAKE_PAYMENT_WEBHOOK;
  if (hook) {
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
    } catch (e) {
      console.error('[create-payment] Make:', String(e && e.message));
    }
  }

  // 3) לינק GROW קבוע — נפילה בטוחה
  return json(200, { url: fixedLinkFor(amount), fallback: true });
};

// חשיפה לבדיקות
exports._internal = { buildMultipart, clean, extractUrl, fixedLinkFor };

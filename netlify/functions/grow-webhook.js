// ============================================================
//  GROW webhook — מקבל אישור תשלום ומפעיל את כל שרשרת המסירה.
//  הסדר קבוע (מפרט §5). אין Twilio ואין Meta — וואטסאפ נשלח ידנית ע"י ערדית.
// ============================================================
const crypto = require('crypto');
const { makeToken } = require('./lib/token');
const { normalizePhone } = require('./lib/phone');
const { sendEmail, hebrewReason } = require('./lib/mailer');
const sheets = require('./lib/sheets');

// כתובת האתר לבניית קישורים אישיים. env קודם (כשמחברים דומיין), אחרת ברירת מחדל שעובדת עכשיו.
const SITE = (process.env.SITE_URL || 'https://shabat-guide.netlify.app').replace(/\/+$/, '');

// מיפוי שדות מה-payload של GROW. מבנה ה-payload אינו ידוע בוודאות —
// בריצה הראשונה ה-payload הגולמי נרשם ללוג (ראו §5.1) כדי להתאים את הרשימות.
const FIELD_MAP = {
  transaction_id: ['transactionId', 'transaction_id', 'asmachta', 'dealId', 'transactionToken', 'paymentId', 'id'],
  customer_name: ['customerName', 'fullName', 'payerName', 'name', 'clientName'],
  customer_email: ['email', 'customerEmail', 'payerEmail', 'clientEmail'],
  customer_phone: ['phone', 'customerPhone', 'payerPhone', 'cellphone', 'mobile'],
  amount: ['amount', 'sum', 'sumToBill', 'paymentSum', 'price', 'total'],
};

function flatten(obj, out = {}) {
  if (!obj || typeof obj !== 'object') return out;
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, out);
    else if (out[k] === undefined) out[k] = v;
  }
  return out;
}

function extract(flat, keys) {
  for (const k of keys) {
    if (flat[k] !== undefined && flat[k] !== null && String(flat[k]).trim() !== '') {
      return String(flat[k]).trim();
    }
  }
  return '';
}

function parseBody(event) {
  const raw = event.body || '';
  const ctype = (event.headers['content-type'] || event.headers['Content-Type'] || '').toLowerCase();
  try {
    if (ctype.includes('application/json')) return JSON.parse(raw);
    if (ctype.includes('application/x-www-form-urlencoded')) {
      return Object.fromEntries(new URLSearchParams(raw));
    }
    // ניסיון: JSON תחילה, אחרת form
    return JSON.parse(raw);
  } catch (e) {
    try {
      return Object.fromEntries(new URLSearchParams(raw));
    } catch (e2) {
      return {};
    }
  }
}

// §5.1 — אימות חתימת GROW מול GROW_WEBHOOK_SECRET.
// שיטת החתימה של GROW אינה ידועה בוודאות (TODO: לאשר מול Grow).
// אם הסוד מוגדר וקיים header חתימה — מאמתים בקפדנות (401 על אי-התאמה).
// אם הסוד לא מוגדר — רושמים אזהרה וממשיכים (כדי לאפשר בדיקות), ומסמנים TODO.
function verifySignature(event, rawBody) {
  const secret = process.env.GROW_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('[grow-webhook] TODO: GROW_WEBHOOK_SECRET לא מוגדר — הפנייה לא מאומתת.');
    return 'unconfigured';
  }
  const h = event.headers || {};
  const sig = h['x-grow-signature'] || h['x-signature'] || h['grow-signature'] || h['x-hmac-signature'] || '';
  if (!sig) {
    console.warn('[grow-webhook] TODO: לא נמצא header חתימה בפנייה מ-GROW.');
    return 'unconfigured';
  }
  const expectedHex = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const expectedB64 = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
  const given = String(sig).replace(/^sha256=/i, '').trim();
  const ok =
    safeEqual(given, expectedHex) || safeEqual(given, expectedB64);
  return ok ? true : false;
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function customerEmailHtml(name, link) {
  return `<!doctype html><html dir="rtl" lang="he"><body style="margin:0;background:#FBF8FF;">
<div style="max-width:560px;margin:0 auto;padding:32px 24px;font-family:Arial,Helvetica,sans-serif;color:#1A0B2E;">
  <p style="font-size:18px;margin:0 0 16px;">היי ${escapeHtml(name || '')},</p>
  <p style="font-size:16px;line-height:1.7;margin:0 0 20px;">התשלום התקבל. המדריך התפעולי לשבת חתן מחכה לך כאן:</p>
  <p style="margin:0 0 20px;"><a href="${link}" style="display:inline-block;background:#FF0090;color:#fff;text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:8px;">פתיחת המדריך</a></p>
  <p style="font-size:15px;line-height:1.7;color:#66557E;margin:0 0 20px;">הקישור אישי ושמור עבורך — אפשר לחזור אליו מתי שתרצה.</p>
  <p style="font-size:15px;margin:0;">בהצלחה,<br>Multibrawn</p>
</div></body></html>`;
}

function arditEmailHtml({ name, phone, email, amount, link, waUrl, phoneOk }) {
  const waBtn = phoneOk
    ? `<p style="margin:0 0 20px;"><a href="${waUrl}" style="display:inline-block;background:#FF0090;color:#fff;text-decoration:none;font-weight:bold;padding:16px 32px;border-radius:8px;font-size:17px;">שליחת המדריך בוואטסאפ ←</a></p>`
    : `<p style="margin:0 0 20px;color:#66557E;">⚠️ מספר הטלפון לא תקין — לא ניתן לפתוח וואטסאפ אוטומטית (${escapeHtml(phone || 'ריק')}).</p>`;
  return `<!doctype html><html dir="rtl" lang="he"><body style="margin:0;background:#FBF8FF;">
<div style="max-width:560px;margin:0 auto;padding:32px 24px;font-family:Arial,Helvetica,sans-serif;color:#1A0B2E;">
  <h2 style="font-size:20px;margin:0 0 16px;">מכירה חדשה · ${escapeHtml(name || '')}</h2>
  <table style="font-size:15px;line-height:1.9;border-collapse:collapse;margin:0 0 20px;">
    <tr><td style="color:#66557E;padding-left:12px;">שם</td><td>${escapeHtml(name || '')}</td></tr>
    <tr><td style="color:#66557E;padding-left:12px;">טלפון</td><td>${escapeHtml(phone || '')}</td></tr>
    <tr><td style="color:#66557E;padding-left:12px;">אימייל</td><td>${escapeHtml(email || '')}</td></tr>
    <tr><td style="color:#66557E;padding-left:12px;">סכום</td><td>${escapeHtml(amount || '')} ₪</td></tr>
  </table>
  ${waBtn}
  <p style="font-size:14px;color:#66557E;margin:0;">הקישור האישי: <a href="${link}" style="color:#A06BFF;">${link}</a></p>
</div></body></html>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  const rawBody = event.body || '';

  // §5.1 — לוג גולמי (לפעם הראשונה, כדי להתאים את FIELD_MAP) + אימות חתימה.
  console.log('[grow-webhook] raw payload:', rawBody.slice(0, 2000));
  const sigResult = verifySignature(event, rawBody);
  if (sigResult === false) {
    console.warn('[grow-webhook] חתימה לא תקינה — נדחה (401).');
    return { statusCode: 401, body: 'Invalid signature' };
  }

  // חילוץ שדות
  const flat = flatten(parseBody(event));
  const transactionId = extract(flat, FIELD_MAP.transaction_id);
  const name = extract(flat, FIELD_MAP.customer_name);
  const email = extract(flat, FIELD_MAP.customer_email);
  const rawPhone = extract(flat, FIELD_MAP.customer_phone);
  const amount = extract(flat, FIELD_MAP.amount);

  if (!transactionId) {
    console.error('[grow-webhook] TODO: transaction_id לא נמצא ב-payload. עדכנו את FIELD_MAP.');
    // אין מזהה עסקה — אין מה לרשום/למנוע כפילות. מחזירים 200 כדי ש-GROW לא יציף ניסיונות.
    return { statusCode: 200, body: 'ok (no transaction id — see logs)' };
  }

  // §5.2 — מניעת כפילות
  try {
    if (await sheets.hasTransaction(transactionId)) {
      console.log(`[grow-webhook] עסקה ${transactionId} כבר טופלה — דילוג.`);
      return { statusCode: 200, body: 'ok (duplicate)' };
    }
  } catch (e) {
    // לא הצלחנו לבדוק כפילות (בעיית גיליון). ממשיכים — עדיף לשלוח מאשר לחסום מכירה.
    console.error('[grow-webhook] בדיקת כפילות נכשלה:', hebrewReason(e));
  }

  // §5.3 — קישור אישי. המוצר נגזר מהסכום: 90₪+ → מדריך הפרימיום (97₪), אחרת → מדריך הכניסה (50₪).
  const phone = normalizePhone(rawPhone);
  const secret = process.env.TOKEN_SECRET;
  const amtNum = parseFloat(String(amount).replace(/[^\d.]/g, '')) || 0;
  const pageParam = amtNum >= 90 ? '&page=premium' : '';
  const productName = amtNum >= 90 ? 'מהדורת הפרימיום' : 'המדריך';
  let link;
  try {
    const token = makeToken(transactionId, secret);
    link = `${SITE}/guide?id=${encodeURIComponent(transactionId)}&t=${token}${pageParam}`;
  } catch (e) {
    // TOKEN_SECRET חסר → קישור מגובה שמאמת מול הגיליון (בלי טוקן).
    console.error('[grow-webhook] TOKEN_SECRET חסר — קישור ללא טוקן.');
    link = `${SITE}/guide?id=${encodeURIComponent(transactionId)}${pageParam}`;
  }

  // §5.4 — שתי שליחות עצמאיות במקביל
  const arditEmail = process.env.ARDIT_EMAIL;
  const arditWa = process.env.ARDIT_WHATSAPP || '972523983394';
  const waMsg = `היי ${name || ''}, מדברים מ-Multibrawn.\nהתשלום התקבל והמדריך התפעולי לשבת חתן מחכה לך כאן:\n${link}\nהקישור אישי ושמור עבורך. בהצלחה!`;
  const waUrl = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(waMsg)}` : '';

  // מסירת המדריך במייל דרך Apps Script (Gmail) — גיבוי שלא תלוי בהפניה של GROW.
  const HOOK = process.env.LEAD_WEBHOOK;
  if (HOOK && email) {
    try {
      await fetch(HOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'mb-lead-2026-a7k9x2', action: 'guideEmail', email, name, link }),
      });
    } catch (e) {
      console.error('[grow-webhook] guide email webhook:', String(e && e.message));
    }
  }

  const [custRes, arditRes] = await Promise.allSettled([
    sendEmail({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.FROM_EMAIL,
      to: email,
      subject: 'המדריך התפעולי לשבת חתן — הקישור שלך',
      html: customerEmailHtml(name, link),
    }),
    sendEmail({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.FROM_EMAIL,
      to: arditEmail,
      subject: `מכירה חדשה · ${name || ''}`,
      html: arditEmailHtml({ name, phone: phone || rawPhone, email, amount, link, waUrl, phoneOk: !!phone }),
    }),
  ]);

  const custStatus = custRes.status === 'fulfilled' ? 'נשלח' : 'נכשל: ' + hebrewReason(custRes.reason);
  let arditStatus = arditRes.status === 'fulfilled' ? 'נשלח' : 'נכשל: ' + hebrewReason(arditRes.reason);
  if (!phone) arditStatus += ' · טלפון לא תקין';

  // §5.5 — רישום בגיליון (כתיבה אחת, לא חוסמת, לא מפילה). מיושר לעמודות העיצוב;
  // מזהה העסקה נשאר בעמודה B לצורך מניעת כפילות (hasTransaction סורק אותה).
  try {
    const stamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const waCell = phone ? `=HYPERLINK("https://wa.me/${phone}","שליחה")` : '';
    await sheets.appendRow([
      stamp, transactionId, name, email, phone || rawPhone || '', amount, '', 'נסגר',
      `שילם ${amount}₪ · ${link}`, waCell,
    ]);
  } catch (e) {
    console.error('[grow-webhook] רישום בגיליון נכשל:', hebrewReason(e));
  }

  // §5.6 — תמיד 200 אחרי שהתשלום אומת
  return { statusCode: 200, body: 'ok' };
};

// חשיפה לבדיקות
exports._internal = { flatten, extract, FIELD_MAP, verifySignature, parseBody };

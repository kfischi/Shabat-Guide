// ============================================================
//  lead — לוכד ליד מהטופס בדף הנחיתה:
//   • רושם את הפרטים ב-Google Sheet
//   • שולח לערדית מייל עם הפרטים + כפתור וואטסאפ מוכן (שליחה ידנית)
//  הכל best-effort — אף פעם לא קורס ולא חוסם את המשתמש.
// ============================================================
const sheets = require('./lib/sheets');
const { sendEmail } = require('./lib/mailer');
const { normalizePhone } = require('./lib/phone');

const GROW = process.env.GROW_LINK_50 || process.env.GROW_FALLBACK_LINK || 'https://pay.grow.link/6e880b694e3a5cedda22d6f52a6bb84b-MzUyMzAzNA';

function json(statusCode, obj) {
  return { statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(obj) };
}
function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let b;
  try { b = JSON.parse(event.body || '{}'); } catch (e) { b = {}; }
  const name = String(b.name || '').trim();
  const email = String(b.email || '').trim();
  const phone = String(b.phone || '').trim();
  const ev = String(b.event || b.event_type || '').trim();
  if (!name && !email && !phone) return json(200, { ok: false });

  const stamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
  const norm = normalizePhone(phone);

  // 1) רישום ב-Google Sheet (best-effort)
  try {
    await sheets.appendRow([stamp, 'LEAD', name, email, norm || phone, '', ev, 'ליד חדש', '', '']);
  } catch (e) {
    console.error('[lead] רישום בגיליון נכשל:', String(e && e.message));
  }

  // 2) מייל לערדית עם כפתור וואטסאפ מוכן (שליחה ידנית — בלי Twilio/Meta)
  const waMsg = `שלום ${name || ''}, מדברים מ-Multibrawn 🌸\nראינו שנרשמת למדריך שבת חתן. אפשר להשלים את התשלום כאן:\n${GROW}`;
  const waUrl = norm ? `https://wa.me/${norm}?text=${encodeURIComponent(waMsg)}` : '';
  const waBtn = waUrl
    ? `<p style="margin:0 0 16px"><a href="${waUrl}" style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:8px">שליחת וואטסאפ ללקוח ←</a></p>`
    : `<p style="margin:0 0 16px;color:#66557E">⚠️ מספר הטלפון לא תקין — לא ניתן לפתוח וואטסאפ אוטומטית (${esc(phone || 'ריק')}).</p>`;

  try {
    await sendEmail({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.FROM_EMAIL,
      to: process.env.ARDIT_EMAIL || 'multibrawn@gmail.com',
      subject: `ליד חדש · ${name || email || phone}`,
      html: `<div dir="rtl" style="font-family:Arial;max-width:520px;color:#1A0B2E">
        <h2 style="font-size:20px">ליד חדש נכנס 🌸</h2>
        <table style="font-size:15px;line-height:1.9">
          <tr><td style="color:#66557E;padding-left:12px">שם</td><td>${esc(name)}</td></tr>
          <tr><td style="color:#66557E;padding-left:12px">טלפון</td><td>${esc(norm || phone)}</td></tr>
          <tr><td style="color:#66557E;padding-left:12px">אימייל</td><td>${esc(email)}</td></tr>
          <tr><td style="color:#66557E;padding-left:12px">סוג אירוע</td><td>${esc(ev)}</td></tr>
          <tr><td style="color:#66557E;padding-left:12px">מתי</td><td>${esc(stamp)}</td></tr>
        </table>
        <p style="margin:16px 0 10px">כדי לשלוח לו/ה וואטסאפ עם לינק לתשלום:</p>
        ${waBtn}
      </div>`,
    });
  } catch (e) {
    console.error('[lead] מייל לערדית נכשל:', String(e && e.message));
  }

  return json(200, { ok: true });
};

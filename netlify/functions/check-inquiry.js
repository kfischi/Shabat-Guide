// ============================================================
//  check-inquiry — תשובת המקום לפנייה (מחליף את הטלפון):
//   GET  ?t=TOKEN → פרטי האירוע בלבד (בלי שם/טלפון של הלקוח)
//   POST {t, available, price, price_type, note} → שומר תשובה ומודיע לערדית
//  הטוקן אקראי ואישי לכל פנייה (מקום × בקשה), ולכן הקישור הוא ההרשאה.
// ============================================================
const db = require('./lib/check/db');
const { venueBrief } = require('./lib/check/brief');
const { json, esc, wa, notifyN8n } = require('./lib/check/util');
const { sendEmail } = require('./lib/mailer');

const CLOSED = ['rejected', 'closed'];

function view(inq) {
  const r = inq.request || {};
  return {
    ok: true,
    venue: (inq.venue && inq.venue.name) || '',
    brief: venueBrief(r),
    status: inq.status,
    price: inq.price,
    price_type: inq.price_type,
    note: inq.venue_note || '',
    closed: CLOSED.includes(r.status),
  };
}

function clientMessage(r, inq) {
  const v = inq.venue || {};
  const price = inq.price ? `, במחיר ${Number(inq.price).toLocaleString('en-US')} ₪ ${inq.price_type === 'total' ? 'סה"כ' : 'למנה'}` : '';
  return `שלום ${r.name}, כאן ערדית מ-MULTIBRAWN.\nיש תשובה ממקום שמתאים לבקשה שלך: ${v.name}${v.city ? ` (${v.city})` : ''} פנוי בתאריך שביקשתם${price}.`
    + (v.virtual_tour_url ? `\nסיור וירטואלי: ${v.virtual_tour_url}` : '')
    + '\nרוצים שאתאם לכם פגישה במקום?';
}

exports.handler = async (event) => {
  const method = event.httpMethod;
  if (method !== 'GET' && method !== 'POST') return json(405, { ok: false });

  let b = {};
  if (method === 'POST') {
    try { b = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { ok: false, error: 'בקשה לא תקינה' }); }
  }
  const token = method === 'GET' ? (event.queryStringParameters || {}).t : b.t;

  let inq;
  try { inq = await db.inquiryByToken(token); } catch (e) {
    console.error('[check-inquiry]', String(e && e.message));
    return json(500, { ok: false, error: 'תקלה זמנית. אפשר לנסות שוב בעוד רגע.' });
  }
  if (!inq || !inq.request) return json(404, { ok: false, error: 'הקישור לא תקין' });
  if (method === 'GET') return json(200, view(inq));

  if (CLOSED.includes(inq.request.status)) return json(409, { ok: false, error: 'הפנייה הזו כבר סגורה. תודה!' });

  const available = b.available === true || b.available === 'true';
  const price = parseInt(String(b.price == null ? '' : b.price).replace(/[^\d]/g, ''), 10);
  if (available && !(price > 0)) return json(400, { ok: false, error: 'נא לציין מחיר' });
  const patch = {
    status: available ? 'available' : 'unavailable',
    price: available ? price : null,
    price_type: available ? (b.price_type === 'total' ? 'total' : 'per_guest') : null,
    venue_note: String(b.note || '').trim().slice(0, 300) || null,
    replied_at: new Date().toISOString(),
  };

  try { inq = { ...inq, ...(await db.updateInquiry(inq.id, patch)) }; } catch (e) {
    console.error('[check-inquiry] עדכון נכשל:', String(e && e.message));
    return json(500, { ok: false, error: 'תקלה זמנית בשמירה. אפשר לנסות שוב בעוד רגע.' });
  }

  const r = inq.request;
  const v = inq.venue || {};
  const line = available
    ? `פנוי · ${price.toLocaleString('en-US')} ₪ ${patch.price_type === 'total' ? 'סה"כ' : 'למנה'}`
    : 'לא פנוי';
  try {
    await sendEmail({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.FROM_EMAIL,
      to: process.env.ARDIT_EMAIL || 'multibrawn@gmail.com',
      subject: `CHECK · ${v.name}: ${line}`,
      html: `<div dir="rtl" style="font-family:Arial;max-width:580px;color:#2C1A3D">
        <p style="font-size:12px;letter-spacing:2px;color:#7C3AED;margin:0">MULTIBRAWN CHECK · תשובת מקום</p>
        <p style="font-size:18px;font-weight:bold;margin:8px 0">${esc(v.name)}: ${esc(line)}</p>
        ${patch.venue_note ? `<p style="margin:0 0 8px">הערת המקום: ${esc(patch.venue_note)}</p>` : ''}
        <p style="border-right:4px solid #D946EF;padding-right:12px;line-height:1.6">${esc(r.summary)}<br><span style="color:#715B85">${esc(r.name)} · ${esc(r.phone)}</span></p>
        ${available ? `<a href="${esc(wa(r.phone, clientMessage(r, inq)))}" style="display:inline-block;background:#1F9D55;color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:10px">וואטסאפ ללקוח עם ההצעה ←</a>` : ''}
      </div>`,
    });
  } catch (e) {
    console.error('[check-inquiry] מייל לערדית נכשל:', String(e && e.message));
  }

  await notifyN8n('inquiry.replied', { request_id: r.id, venue: v.name, status: patch.status, price: patch.price, price_type: patch.price_type });

  return json(200, view(inq));
};

exports._internal = { clientMessage };

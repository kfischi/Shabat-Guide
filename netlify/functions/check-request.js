// ============================================================
//  check-request — קליטת שאלון MULTIBRAWN CHECK:
//   • אימות ושמירה ב-Supabase (check_requests)
//   • מייל לערדית עם הסיכום + כפתורי אישור / דחייה (קישורים חתומים)
//   • מחזיר ללקוח את הסיכום האוטומטי של הבקשה
// ============================================================
const db = require('./lib/check/db');
const { validate, summary } = require('./lib/check/brief');
const { adminLink, esc, json, notifyN8n } = require('./lib/check/util');
const { sendEmail } = require('./lib/mailer');
const { normalizePhone } = require('./lib/phone');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'Method Not Allowed' });

  let b;
  try { b = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { ok: false, error: 'בקשה לא תקינה' }); }

  // honeypot — בוטים ממלאים שדה מוסתר; עונים "הצלחה" בלי לשמור
  if (b.company_website) return json(200, { ok: true, summary: '' });

  const v = validate(b, normalizePhone);
  if (!v.ok) return json(400, v);
  const d = v.data;
  const sum = summary(d);

  let saved;
  try {
    saved = await db.insertRequest({ ...d, summary: sum, source: String(b.source || 'site').slice(0, 40) });
  } catch (e) {
    console.error('[check-request] שמירה נכשלה:', String(e && e.message));
    return json(500, { ok: false, error: 'תקלה זמנית בשמירה. אפשר לנסות שוב בעוד רגע.' });
  }

  const rows = [
    ['פונה', d.who], ['שם', d.name], ['טלפון', d.phone], ['אימייל', d.email],
    ['גמישות בתאריך', d.date_flexible ? d.flex_note || 'כן' : ''], ['סוג מקום', d.venue_types.join(', ')], ['הערות', d.notes],
  ].filter(([, val]) => val)
    .map(([k, val]) => `<tr><td style="color:#715B85;padding:3px 12px 3px 0;vertical-align:top">${esc(k)}</td><td style="padding:3px 0">${esc(val)}</td></tr>`).join('');

  const btn = (href, label, bg) => `<a href="${href}" style="display:inline-block;background:${bg};color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:10px;margin:0 0 8px 8px">${label}</a>`;

  try {
    await sendEmail({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.FROM_EMAIL,
      to: process.env.ARDIT_EMAIL || 'multibrawn@gmail.com',
      subject: `CHECK · ${d.event_type} · ${d.guests} אורחים · ${d.name}`,
      html: `<div dir="rtl" style="font-family:Arial;max-width:580px;color:#2C1A3D">
        <p style="font-size:12px;letter-spacing:2px;color:#7C3AED;margin:0">MULTIBRAWN CHECK · בקשה חדשה</p>
        <p style="font-size:17px;font-weight:bold;border-right:4px solid #D946EF;padding-right:12px;line-height:1.6">${esc(sum)}</p>
        <table style="font-size:14.5px;line-height:1.7;border-collapse:collapse;margin-bottom:16px">${rows}</table>
        ${btn(adminLink(saved.id, 'approve'), 'אישור ← שליחת קישור תשלום', '#7C3AED')}
        ${btn(adminLink(saved.id, 'reject'), 'דחייה', '#9B8AA8')}
      </div>`,
    });
  } catch (e) {
    console.error('[check-request] מייל לערדית נכשל:', String(e && e.message));
  }

  await notifyN8n('request.created', { request_id: saved.id, summary: sum, name: d.name, phone: d.phone });

  return json(200, { ok: true, summary: sum });
};

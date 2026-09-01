// ============================================================
//  lead — לוכד ליד/בקשת אפיון מהטופס:
//   • רושם ב-Google Sheet
//   • שולח לערדית מייל עם *כל* הפרטים + כפתור וואטסאפ מוכן (שליחה ידנית)
//  best-effort — לא קורס ולא חוסם. פועל כשמוגדרים Sheets + Resend.
// ============================================================
const sheets = require('./lib/sheets');
const { sendEmail } = require('./lib/mailer');
const { normalizePhone } = require('./lib/phone');

// תוויות עבריות לשדות האפיון (לתצוגה במייל לערדית)
const LABELS = {
  contact_name: 'איש קשר', name: 'שם', phone: 'טלפון', email: 'אימייל', couple_names: 'החתן והכלה',
  shabbat_date: 'תאריך שבת', alt_date: 'תאריך חלופי', guests: 'אורחים', rooms: 'חדרים',
  area: 'אזור', kashrut: 'כשרות', nusach: 'נוסח', synagogue: 'בית כנסת', private_dining: 'חדר אוכל פרטי',
  extra_reqs: 'דרישות נוספות', gifts_rooms: 'מתנות לחדרים', branding: 'מיתוג', gifts_budget: 'תקציב מתנות',
  catering: 'קייטרינג', service: 'שירות', music: 'מוזיקה', kashrut_supervisor: 'משגיח כשרות',
  side_events: 'אירועים נלווים', budget: 'תקציב מתחם', priority: 'הכי חשוב', deadline: 'דדליין',
  notes: 'הערות', event: 'סוג אירוע', event_type: 'סוג אירוע',
};

function json(statusCode, obj) {
  return { statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(obj) };
}
function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let b;
  try { b = JSON.parse(event.body || '{}'); } catch (e) { b = {}; }

  const name = String(b.contact_name || b.name || '').trim();
  const email = String(b.email || '').trim();
  const phone = String(b.phone || '').trim();
  if (!name && !email && !phone) return json(200, { ok: false });

  const stamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
  const norm = normalizePhone(phone);

  // תקציר קצר לעמודת ההערות בגיליון
  const summary = [b.couple_names, b.shabbat_date, b.area, b.guests && b.guests + ' אורחים', b.budget]
    .filter(Boolean).join(' · ');

  // 1) רישום ב-Google Sheet (best-effort). עמודות: תאריך·מקור·שם·אימייל·טלפון·תקציב·אזור·סטטוס·תקציר·וואטסאפ
  const src = b.source === 'whatsapp' ? 'וואטסאפ' : 'אתר';
  const waCell = norm ? `=HYPERLINK("https://wa.me/${norm}","שליחה")` : '';
  try {
    await sheets.appendRow([stamp, src, name, email, norm || phone, b.budget || '', b.area || '', 'ליד חדש', summary, waCell]);
  } catch (e) {
    console.error('[lead] רישום בגיליון נכשל:', String(e && e.message));
  }

  // 1b) Apps Script Web App — כותב ישירות לגיליון (חלופה ל-Service Account, בלי Google Cloud).
  //     מוגדר עם LEAD_WEBHOOK (כתובת ה-/exec). הטוקן חייב להתאים לזה שבסקריפט.
  const HOOK = process.env.LEAD_WEBHOOK;
  if (HOOK) {
    try {
      await fetch(HOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'mb-lead-2026-a7k9x2', source: src, name, email,
          phone: norm || phone, budget: b.budget || '', area: b.area || '', summary,
        }),
      });
    } catch (e) {
      console.error('[lead] webhook לגיליון נכשל:', String(e && e.message));
    }
  }

  // 2) מייל לערדית עם כל הפרטים + כפתור וואטסאפ מוכן
  const GROW = process.env.GROW_LINK_50 || process.env.GROW_FALLBACK_LINK || 'https://pay.grow.link/MTAxNDc1~46e74b5eb5e243744df1ddecf1b36e44-MzkyOTMyOQ';
  const waMsg = `שלום ${name || ''}, מדברים מ-Multibrawn 🌸\nקיבלנו את בקשת האפיון שלך לשבת חתן ונחזור עם הצעות. לפתיחת התהליך (דמי רצינות 50₪, מקוזזים מהעסקה):\n${GROW}`;
  const waUrl = norm ? `https://wa.me/${norm}?text=${encodeURIComponent(waMsg)}` : '';
  const waBtn = waUrl
    ? `<p style="margin:4px 0 16px"><a href="${waUrl}" style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:8px">שליחת וואטסאפ ללקוח ←</a></p>`
    : `<p style="margin:4px 0 16px;color:#66557E">⚠️ מספר הטלפון לא תקין — לא ניתן לפתוח וואטסאפ אוטומטית (${esc(phone || 'ריק')}).</p>`;

  const rows = Object.keys(b)
    .filter((k) => LABELS[k] && String(b[k]).trim() && k !== 'source')
    .map((k) => `<tr><td style="color:#66557E;padding:3px 12px 3px 0;vertical-align:top">${esc(LABELS[k])}</td><td style="padding:3px 0">${esc(b[k])}</td></tr>`)
    .join('');

  try {
    await sendEmail({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.FROM_EMAIL,
      to: process.env.ARDIT_EMAIL || 'multibrawn@gmail.com',
      subject: `בקשת אפיון · ${name || email || phone}`,
      html: `<div dir="rtl" style="font-family:Arial;max-width:560px;color:#1A0B2E">
        <h2 style="font-size:20px">בקשת אפיון חדשה 🌸</h2>
        ${waBtn}
        <table style="font-size:14.5px;line-height:1.7;border-collapse:collapse">${rows}
          <tr><td style="color:#66557E;padding:3px 12px 3px 0">מתי</td><td style="padding:3px 0">${esc(stamp)}</td></tr>
        </table>
      </div>`,
    });
  } catch (e) {
    console.error('[lead] מייל לערדית נכשל:', String(e && e.message));
  }

  return json(200, { ok: true });
};

// ============================================================
//  check-admin — פעולות ערדית על בקשה, מקישורים חתומים במייל:
//   approve  → מסמן "אושר" ומכין וואטסאפ ללקוח עם קישור תשלום
//   reject   → מסמן "נדחה"
//   dispatch → (אחרי תשלום) מתאים 3–4 מקומות, יוצר פניות ומכין וואטסאפ לכל מקום
//  GET מציג אישור/מצב, POST מבצע — כדי שסורקי קישורים במייל לא יפעילו פעולות בטעות.
// ============================================================
const db = require('./lib/check/db');
const { adminLink, adminOk, venueLink, wa, esc, page, notifyN8n } = require('./lib/check/util');
const { normalizePhone } = require('./lib/phone');

const ACTIONS = { approve: 'אישור הבקשה', reject: 'דחיית הבקשה', dispatch: 'שליחה למקומות' };
const fee = () => process.env.CHECK_FEE || '50';

function payMessage(r) {
  const link = process.env.CHECK_PAY_LINK;
  return `שלום ${r.name}, כאן ערדית מ-MULTIBRAWN.\nקיבלתי את הבקשה שלך:\n${r.summary}\n\n`
    + `כדי שאתחיל לבדוק זמינות ומחירים מול המקומות המתאימים, דמי השירות הם ${fee()} ₪ (לא מוחזרים), ומקבלים מדריך במתנה.`
    + (link ? `\nלתשלום: ${link}` : '');
}

function venueMessage(r, inq) {
  const v = inq.venue || {};
  return `שלום${v.contact_name ? ' ' + v.contact_name : ''}, כאן ערדית מ-MULTIBRAWN.\nיש לי פנייה לאירוע:\n${r.summary}\n\n`
    + `אפשר לענות בלחיצה אחת אם התאריך פנוי ומה המחיר:\n${venueLink(inq.token)}\nתודה!`;
}

function inquiryStatus(i) {
  if (i.status === 'available') return `פנוי${i.price ? ` · ${Number(i.price).toLocaleString('en-US')} ₪ ${i.price_type === 'total' ? 'סה"כ' : 'למנה'}` : ''}`;
  if (i.status === 'unavailable') return 'לא פנוי';
  return 'ממתין לתשובה';
}

const sumCard = (r) => `<div class="card"><div class="sum">${esc(r.summary)}</div><p class="muted" style="margin:10px 0 0">${esc(r.name)} · ${esc(r.phone)} · ${esc(r.who)}</p></div>`;

function viewApproved(r) {
  return page('הבקשה אושרה', `<h1>הבקשה אושרה</h1>${sumCard(r)}
    <div class="card"><b>1. שליחת קישור תשלום ללקוח</b><br>
      <a class="btn wa" href="${esc(wa(r.phone, payMessage(r)))}">וואטסאפ ללקוח ←</a>
      ${process.env.CHECK_PAY_LINK ? '' : '<p class="muted">לא הוגדר קישור תשלום (CHECK_PAY_LINK). ההודעה תישלח בלי קישור.</p>'}</div>
    <div class="card"><b>2. אחרי שהתשלום התקבל</b><br>
      <a class="btn" href="${esc(adminLink(r.id, 'dispatch'))}">שולם ← שליחה למקומות</a></div>`);
}

function viewRejected(r) {
  const msg = `שלום ${r.name}, כאן ערדית מ-MULTIBRAWN. תודה על הפנייה. כרגע אין לי מקומות שמתאימים לבקשה הזו, ולכן לא אגבה דמי שירות. אם משהו בדרישות משתנה, אשמח שתמלאו את השאלון מחדש.`;
  return page('הבקשה נדחתה', `<h1>הבקשה נדחתה</h1>${sumCard(r)}
    <div class="card"><a class="btn sec" href="${esc(wa(r.phone, msg))}">הודעה מנומסת ללקוח (לא חובה)</a></div>`);
}

function viewDispatched(r, inqs) {
  if (!inqs.length) {
    return page('אין התאמות', `<h1>לא נמצאו מקומות מתאימים</h1>${sumCard(r)}
      <div class="card">אין כרגע מקומות פעילים שמתאימים לאזור, לכמות האורחים ולהכשר שנבחרו (או שהם סימנו את התאריך כתפוס).
      <p class="muted">אפשר להוסיף או להפעיל מקומות בטבלת check_venues ולחזור לקישור הזה.</p></div>`);
  }
  const list = inqs.map((i) => {
    const v = i.venue || {};
    const phone = normalizePhone(String(v.phone || ''));
    const tags = [v.city, v.kashrut, v.kashrut && !v.kashrut_verified ? 'הכשר לא אומת' : '', v.capacity_max ? `עד ${v.capacity_max}` : '']
      .filter(Boolean).map((t) => `<span class="tag">${esc(t)}</span>`).join(' ');
    const action = phone
      ? `<a class="btn wa" href="${esc(wa(phone, venueMessage(r, i)))}">וואטסאפ למקום</a>`
      : `<span class="muted">טלפון לא תקין</span>`;
    return `<div class="v"><div><b>${esc(v.name)}</b> ${tags}<br><span class="muted">${esc(inquiryStatus(i))}</span></div>${action}</div>`;
  }).join('');
  return page('שליחה למקומות', `<h1>הבקשה יצאה למקומות</h1>${sumCard(r)}
    <div class="card">${list}</div>
    <p class="muted">המקומות רואים את פרטי האירוע בלבד, בלי שם ובלי טלפון של הלקוח. אפשר לחזור לקישור הזה כדי לראות מי ענה.</p>`);
}

function confirmView(r, action, qs) {
  return page(ACTIONS[action], `<h1>${esc(ACTIONS[action])}?</h1>${sumCard(r)}
    <form method="post" action="?${esc(qs)}"><button class="btn" style="border:0;font:inherit;font-weight:700;cursor:pointer">${esc(ACTIONS[action])} ←</button></form>`);
}

exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  const { id, a: action, s } = q;
  if (!ACTIONS[action] || !id || !adminOk(id, action, s)) return page('קישור לא תקין', '<h1>הקישור לא תקין או שפג תוקפו</h1>', 403);

  let r;
  try { r = await db.getRequest(id); } catch (e) {
    console.error('[check-admin]', String(e && e.message));
    return page('תקלה', '<h1>תקלה זמנית</h1><p>נסי שוב בעוד רגע.</p>', 500);
  }
  if (!r) return page('לא נמצא', '<h1>הבקשה לא נמצאה</h1>', 404);

  const post = event.httpMethod === 'POST';
  const qs = `id=${encodeURIComponent(id)}&a=${action}&s=${encodeURIComponent(s)}`;
  const now = new Date().toISOString();

  try {
    if (action === 'approve') {
      if (r.status === 'new' && post) r = await db.updateRequest(id, { status: 'approved', approved_at: now });
      if (r.status === 'new') return confirmView(r, action, qs);
      if (r.status === 'rejected') return viewRejected(r);
      return viewApproved(r);
    }

    if (action === 'reject') {
      if (['new', 'approved'].includes(r.status) && post) r = await db.updateRequest(id, { status: 'rejected' });
      if (r.status === 'rejected') return viewRejected(r);
      if (['new', 'approved'].includes(r.status)) return confirmView(r, action, qs);
      return page('לא ניתן', '<h1>הבקשה כבר נשלחה למקומות</h1>', 409);
    }

    // dispatch
    if (r.status === 'rejected') return viewRejected(r);
    let inqs = await db.inquiriesFor(id);
    if (!inqs.length && !post) return confirmView(r, action, qs);
    if (!inqs.length) {
      inqs = await db.createInquiries(id, await db.matchVenues(r));
      const patch = { payment_status: 'paid' };
      if (inqs.length) Object.assign(patch, { status: 'dispatched', dispatched_at: now });
      r = (await db.updateRequest(id, patch)) || r;
      if (inqs.length) {
        await notifyN8n('request.dispatched', {
          request_id: id,
          summary: r.summary,
          inquiries: inqs.map((i) => ({ venue: i.venue && i.venue.name, phone: normalizePhone(String((i.venue && i.venue.phone) || '')), link: venueLink(i.token), message: venueMessage(r, i) })),
        });
      }
    }
    return viewDispatched(r, inqs);
  } catch (e) {
    console.error('[check-admin]', action, String(e && e.message));
    return page('תקלה', '<h1>תקלה זמנית</h1><p>נסי שוב בעוד רגע.</p>', 500);
  }
};

exports._internal = { payMessage, venueMessage, inquiryStatus };

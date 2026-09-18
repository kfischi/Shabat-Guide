// ============================================================
//  capi — Meta Conversions API (שרת-לשרת). שולח אירועים ישירות למטא,
//  עוקף חוסמי פרסומות/iOS ומשפר דיוק מדידה. משלים את הפיקסל בדפדפן.
//  דדופ: אותו event_id משמש גם בפיקסל וגם כאן → מטא מאחדת ולא סופרת פעמיים.
//
//  רדום עד שמוגדרים משתני הסביבה (best-effort, לעולם לא קורס):
//   • META_DATASET_ID   — מזהה ה-Dataset/Pixel (ברירת מחדל: META_PIXEL_ID)
//   • META_CAPI_TOKEN   — טוקן ה-Conversions API (סוד)
//   • META_TEST_EVENT_CODE — אופציונלי, לבדיקה ב-Events Manager
//   • META_GRAPH_VERSION   — אופציונלי, ברירת מחדל v21.0
// ============================================================
const crypto = require('crypto');

// מטא דורשת SHA-256 על נתונים אישיים, אחרי נרמול (lowercase/trim).
function hash(v) {
  const s = String(v == null ? '' : v).trim().toLowerCase();
  if (!s) return undefined;
  return crypto.createHash('sha256').update(s).digest('hex');
}
// טלפון: רק ספרות (עם קידומת מדינה), ואז hash.
function hashPhone(v) {
  const digits = String(v == null ? '' : v).replace(/\D/g, '');
  if (!digits) return undefined;
  return crypto.createHash('sha256').update(digits).digest('hex');
}

function enabled() {
  const id = process.env.META_DATASET_ID || process.env.META_PIXEL_ID;
  return !!(id && process.env.META_CAPI_TOKEN);
}

// שולח אירוע יחיד. best-effort: מחזיר {ok} ולא זורק.
async function sendEvent({
  eventName, eventId, email, phone, name,
  value, currency = 'ILS', sourceUrl, clientIp, userAgent, fbp, fbc, extra,
}) {
  const datasetId = process.env.META_DATASET_ID || process.env.META_PIXEL_ID;
  const token = process.env.META_CAPI_TOKEN;
  if (!datasetId || !token) return { ok: false, skipped: 'unconfigured' };

  const version = process.env.META_GRAPH_VERSION || 'v21.0';
  const user_data = {};
  const em = hash(email); if (em) user_data.em = [em];
  const ph = hashPhone(phone); if (ph) user_data.ph = [ph];
  if (name) {
    const parts = String(name).trim().split(/\s+/);
    const fn = hash(parts[0]); if (fn) user_data.fn = [fn];
    const ln = hash(parts.slice(1).join(' ')); if (ln) user_data.ln = [ln];
  }
  if (clientIp) user_data.client_ip_address = clientIp;
  if (userAgent) user_data.client_user_agent = userAgent;
  if (fbp) user_data.fbp = fbp;   // קוקי _fbp מהדפדפן — משפר התאמה
  if (fbc) user_data.fbc = fbc;   // קליק-איידי (_fbc / fbclid)

  const custom_data = {};
  if (value != null && value !== '') custom_data.value = Number(value) || 0;
  if (custom_data.value != null) custom_data.currency = currency;
  Object.assign(custom_data, extra || {});

  const event = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    action_source: 'website',
    event_id: eventId || crypto.randomBytes(12).toString('hex'),
    user_data,
  };
  if (sourceUrl) event.event_source_url = sourceUrl;
  if (Object.keys(custom_data).length) event.custom_data = custom_data;

  const body = { data: [event] };
  if (process.env.META_TEST_EVENT_CODE) body.test_event_code = process.env.META_TEST_EVENT_CODE;

  const url = `https://graph.facebook.com/${version}/${datasetId}/events?access_token=${encodeURIComponent(token)}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      console.error('[capi] מטא דחתה אירוע:', res.status, t.slice(0, 300));
      return { ok: false, status: res.status };
    }
    return { ok: true };
  } catch (e) {
    console.error('[capi] שליחה נכשלה:', String(e && e.message));
    return { ok: false, error: String(e && e.message) };
  }
}

module.exports = { sendEvent, enabled, _hash: hash, _hashPhone: hashPhone };

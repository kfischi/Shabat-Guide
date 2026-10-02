// MULTIBRAWN CHECK — אימות השאלון ובניית הסיכום.
// הסיכום נבנה רק כאן (בשרת), והדפדפן מציג את מה שחוזר — כך הלקוח, ערדית והמקום רואים אותו נוסח.
const O = require('../../../../public/check/options');

const str = (v, max = 120) => String(v == null ? '' : v).trim().slice(0, max);
const list = (v, allowed) => (Array.isArray(v) ? v : []).map((x) => str(x)).filter((x, i, a) => allowed.includes(x) && a.indexOf(x) === i);
const int = (v) => {
  const n = parseInt(String(v == null ? '' : v).replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
};

function todayIL() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date()); // YYYY-MM-DD
}

// מחזיר { ok, data } או { ok:false, error } — הודעת השגיאה מוצגת ללקוח כמו שהיא.
function validate(b, normalizePhone) {
  b = b || {};
  const d = {
    who: O.who.includes(str(b.who)) ? str(b.who) : '',
    event_type: O.eventTypes.includes(str(b.event_type)) ? str(b.event_type) : '',
    event_date: /^\d{4}-\d{2}-\d{2}$/.test(str(b.event_date)) ? str(b.event_date) : null,
    time_of_day: O.timeOfDay.includes(str(b.time_of_day)) ? str(b.time_of_day) : null,
    date_flexible: b.date_flexible === true || b.date_flexible === 'true',
    flex_note: str(b.flex_note, 120) || null,
    guests: int(b.guests),
    areas: list(b.areas, O.areas),
    venue_types: list(b.venue_types, O.venueTypes),
    budget_type: O.budgetTypes[str(b.budget_type)] ? str(b.budget_type) : null,
    budget_amount: int(b.budget_amount),
    kashrut: list(b.kashrut, O.kashrut),
    must_haves: list(b.must_haves, O.mustHaves),
    notes: str(b.notes, O.limits.notesMax) || null,
    name: str(b.name, 80),
    phone: normalizePhone(str(b.phone, 30)),
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str(b.email)) ? str(b.email) : null,
  };

  if (!d.who) return { ok: false, error: 'נא לבחור מי פונה' };
  if (!d.event_type) return { ok: false, error: 'נא לבחור סוג אירוע' };
  if (!d.event_date) return { ok: false, error: 'נא לבחור תאריך' };
  if (d.event_date < todayIL()) return { ok: false, error: 'התאריך שנבחר כבר עבר' };
  if (!d.guests || d.guests < O.limits.guestsMin || d.guests > O.limits.guestsMax) {
    return { ok: false, error: `נא למלא כמות אורחים (${O.limits.guestsMin}–${O.limits.guestsMax})` };
  }
  if (!d.areas.length) return { ok: false, error: 'נא לבחור לפחות אזור אחד' };
  if (!d.kashrut.length) return { ok: false, error: 'נא לבחור הכשר (או "לא משנה")' };
  if (d.kashrut.includes('לא משנה')) d.kashrut = ['לא משנה'];
  if (!d.budget_amount) { d.budget_amount = null; d.budget_type = null; }
  else if (!d.budget_type) d.budget_type = 'per_guest';
  if (!d.name) return { ok: false, error: 'נא למלא שם' };
  if (!d.phone) return { ok: false, error: 'נא למלא מספר טלפון תקין' };
  if (b.consent !== true && b.consent !== 'true') return { ok: false, error: 'נא לאשר את תנאי השירות' };
  return { ok: true, data: d };
}

// 2026-11-19 → "חמישי 19.11.2026"
function hebDate(iso) {
  const [y, m, dd] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, dd, 12));
  const day = new Intl.DateTimeFormat('he-IL', { weekday: 'long', timeZone: 'UTC' }).format(dt).replace(/^יום\s+/, '');
  return `${day} ${dd}.${m}.${y}`;
}

function budgetText(d) {
  if (!d.budget_amount) return '';
  const n = d.budget_amount.toLocaleString('en-US');
  return d.budget_type === 'total' ? `עד ${n} ₪ סה"כ` : `עד ${n} ₪ למנה`;
}

function dateText(d) {
  let s = hebDate(d.event_date);
  if (d.time_of_day) s += `, ${d.time_of_day}`;
  if (d.date_flexible) s += ' (גמיש)';
  return s;
}

// שורת הסיכום — בלי פרטים אישיים, כך שאפשר לשלוח אותה גם למקומות.
// "בר מצווה | 180 אורחים | חמישי 19.11.2026, ערב | מרכז | עד 300 ₪ למנה | הכשר: בד"ץ בית יוסף | חובה: חניה, נגישות"
function summary(d) {
  return [
    d.event_type,
    `${d.guests} אורחים`,
    dateText(d),
    d.areas.join(' / '),
    budgetText(d),
    `הכשר: ${d.kashrut.join(' / ')}`,
    d.must_haves.length ? `חובה: ${d.must_haves.join(', ')}` : '',
  ].filter(Boolean).join(' | ');
}

// הבריף שהמקום רואה: שורות תווית/ערך, בלי שם, טלפון, אימייל והערות חופשיות (שעלולות לכלול פרטים מזהים).
function venueBrief(d) {
  return [
    ['סוג אירוע', d.event_type],
    ['תאריך', dateText(d) + (d.date_flexible && d.flex_note ? ` · ${d.flex_note}` : '')],
    ['אורחים', String(d.guests)],
    ['אזור', d.areas.join(', ')],
    ['תקציב', budgetText(d) || 'לא צוין'],
    ['הכשר נדרש', d.kashrut.join(' / ')],
    ['חובה', d.must_haves.join(', ') || '—'],
    ['פונה', d.who],
  ];
}

module.exports = { validate, summary, venueBrief, hebDate, todayIL };

// בדיקות MULTIBRAWN CHECK מקצה לקצה עם Supabase מדומה בזיכרון (בלי רשת אמיתית).
const assert = require('assert');

let pass = 0, fail = 0;
async function t(name, fn) {
  try { await fn(); pass++; console.log('  ✓ ' + name); } catch (e) { fail++; console.log('  ✗ ' + name + '\n      ' + (e && e.message)); }
}

process.env.SUPABASE_URL = 'https://sb.test';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
process.env.CHECK_SECRET = 'check-secret-xyz';
process.env.RESEND_API_KEY = 're_test';
process.env.FROM_EMAIL = 'noreply@multibrawn.co.il';
process.env.ARDIT_EMAIL = 'ardit@multibrawn.co.il';
process.env.CHECK_BASE_URL = 'https://multibrawn.co.il/check';
process.env.CHECK_PAY_LINK = 'https://bit.test/pay';

// --- Supabase מדומה ---
const db = { requests: [], inquiries: [], emails: [], venueQueries: [], n8n: [] };
const VENUES = [
  { id: 'v1', name: 'אולמי הגן', city: 'ראשון לציון', area: 'מרכז', capacity_max: 400, kashrut: 'בד"ץ בית יוסף', kashrut_verified: true, contact_name: 'משה', phone: '050-1111111', virtual_tour_url: 'https://tour.test/1' },
  { id: 'v2', name: 'יקב ההר', city: 'מודיעין', area: 'מרכז', capacity_max: 250, kashrut: 'בד"ץ בית יוסף', kashrut_verified: false, phone: '0502222222' },
  { id: 'v3', name: 'מלון החוף', city: 'בת ים', area: 'מרכז', capacity_max: 600, kashrut: 'בד"ץ בית יוסף', kashrut_verified: true, phone: '0503333333' },
];
let blocked = [];
let idSeq = 0;
const res = (obj, status = 200) => ({ ok: status < 400, status, text: async () => (obj == null ? '' : JSON.stringify(obj)), json: async () => obj });
const qp = (url, key) => { const m = url.match(new RegExp('[?&]' + key + '=eq\\.([^&]+)')); return m && decodeURIComponent(m[1]); };
const withEmbeds = (i) => ({ ...i, venue: VENUES.find((v) => v.id === i.venue_id), request: db.requests.find((r) => r.id === i.request_id) });

global.fetch = async (url, opts = {}) => {
  url = String(url);
  const method = opts.method || 'GET';
  const body = opts.body ? JSON.parse(opts.body) : null;
  if (url.includes('api.resend.com')) { db.emails.push(body); return res({ id: 'e1' }); }
  if (url.includes('n8n.test')) { db.n8n.push(body); return res({}); }
  if (!url.startsWith('https://sb.test/rest/v1/')) throw new Error('unexpected fetch ' + url);
  assert.strictEqual(opts.headers.apikey, 'service-key');
  const path = url.slice('https://sb.test/rest/v1/'.length);

  if (path.startsWith('check_requests')) {
    if (method === 'POST') { const row = { id: 'r' + ++idSeq, status: 'new', payment_status: 'pending', ...body }; db.requests.push(row); return res([row], 201); }
    const r = db.requests.find((x) => x.id === qp(path, 'id'));
    if (method === 'PATCH') { Object.assign(r, body); return res([r]); }
    return res(r ? [r] : []);
  }
  if (path.startsWith('check_venues')) { db.venueQueries.push(decodeURIComponent(path)); return res(VENUES); }
  if (path.startsWith('check_availability')) return res(blocked);
  if (path.startsWith('check_inquiries')) {
    if (method === 'POST') { body.forEach((row) => db.inquiries.push({ id: 'i' + ++idSeq, status: 'sent', created_at: idSeq, ...row })); return res(null, 201); }
    if (method === 'PATCH') { const i = db.inquiries.find((x) => x.id === qp(path, 'id')); Object.assign(i, body); return res([i]); }
    const tok = qp(path, 'token');
    if (tok) return res(db.inquiries.filter((i) => i.token === tok).map(withEmbeds));
    return res(db.inquiries.filter((i) => i.request_id === qp(path, 'request_id')).map(withEmbeds));
  }
  throw new Error('unexpected path ' + path);
};

const brief = require('../netlify/functions/lib/check/brief');
const { normalizePhone } = require('../netlify/functions/lib/phone');
const { adminLink } = require('../netlify/functions/lib/check/util');
const { _internal: { inList } } = require('../netlify/functions/lib/check/db');
const request = require('../netlify/functions/check-request');
const admin = require('../netlify/functions/check-admin');
const inquiry = require('../netlify/functions/check-inquiry');

const future = (() => { const d = new Date(); d.setFullYear(d.getFullYear() + 1); return d.toISOString().slice(0, 10); })();
const FORM = {
  who: 'לקוח פרטי', event_type: 'בר מצווה', guests: '180', event_date: future, time_of_day: 'ערב',
  areas: ['מרכז'], kashrut: ['בד"ץ בית יוסף'], budget_amount: '300', budget_type: 'per_guest',
  must_haves: ['חניה', 'נגישות', 'רחבת ריקודים'], name: 'דנה כהן', phone: '052-398-3394', consent: true,
};
const post = (fn, body, qs) => fn.handler({ httpMethod: 'POST', body: JSON.stringify(body), queryStringParameters: qs || {} });
const get = (fn, qs) => fn.handler({ httpMethod: 'GET', queryStringParameters: qs });
const qsOf = (link) => Object.fromEntries(new URL(link).searchParams);

(async function main() {
  console.log('\nCHECK · BRIEF');
  await t('summary matches the brief format', () => {
    const d = brief.validate({ ...FORM, event_date: '2099-11-19' }, normalizePhone).data;
    assert.strictEqual(brief.summary(d), 'בר מצווה | 180 אורחים | חמישי 19.11.2099, ערב | מרכז | עד 300 ₪ למנה | הכשר: בד"ץ בית יוסף | חובה: חניה, נגישות, רחבת ריקודים');
  });
  await t('validation: past date, missing kashrut, bad phone, no consent', () => {
    assert.ok(!brief.validate({ ...FORM, event_date: '2020-01-01' }, normalizePhone).ok);
    assert.ok(!brief.validate({ ...FORM, kashrut: [] }, normalizePhone).ok);
    assert.ok(!brief.validate({ ...FORM, phone: '123' }, normalizePhone).ok);
    assert.ok(!brief.validate({ ...FORM, consent: false }, normalizePhone).ok);
  });
  await t('validation drops unknown option values and collapses "לא משנה"', () => {
    const d = brief.validate({ ...FORM, areas: ['מרכז', 'מאדים'], kashrut: ['רבנות', 'לא משנה'] }, normalizePhone).data;
    assert.deepStrictEqual(d.areas, ['מרכז']);
    assert.deepStrictEqual(d.kashrut, ['לא משנה']);
  });
  await t('venue brief carries no client name/phone/notes', () => {
    const d = brief.validate({ ...FORM, notes: 'הטלפון של סבתא 050' }, normalizePhone).data;
    const flat = JSON.stringify(brief.venueBrief(d));
    assert.ok(!flat.includes('דנה') && !flat.includes('972') && !flat.includes('סבתא'));
  });
  await t('PostgREST in-list quotes geresh in kashrut names', () => {
    assert.strictEqual(decodeURIComponent(inList(['בד"ץ בית יוסף'])), '("בד\\"ץ בית יוסף")');
  });

  console.log('CHECK · FLOW');
  let reqId;
  await t('client submits → saved, summary returned, Ardit emailed with signed links', async () => {
    const r = await post(request, FORM);
    const body = JSON.parse(r.body);
    assert.strictEqual(r.statusCode, 200);
    assert.ok(body.summary.startsWith('בר מצווה | 180 אורחים'));
    reqId = db.requests[0].id;
    assert.strictEqual(db.requests[0].phone, '972523983394');
    assert.strictEqual(db.emails.length, 1);
    assert.ok(db.emails[0].html.includes('a=approve') && db.emails[0].html.includes('a=reject'));
  });
  await t('honeypot → fake success, nothing saved', async () => {
    const r = await post(request, { ...FORM, company_website: 'spam.biz' });
    assert.strictEqual(r.statusCode, 200);
    assert.strictEqual(db.requests.length, 1);
  });
  await t('invalid form → 400 with Hebrew error', async () => {
    const r = await post(request, { ...FORM, areas: [] });
    assert.strictEqual(r.statusCode, 400);
    assert.ok(/אזור/.test(JSON.parse(r.body).error));
  });
  await t('tampered admin link → 403', async () => {
    const qs = qsOf(adminLink(reqId, 'approve'));
    const r = await get(admin, { ...qs, a: 'dispatch' });
    assert.strictEqual(r.statusCode, 403);
  });
  await t('approve: GET only confirms, POST approves and shows WhatsApp pay message', async () => {
    const qs = qsOf(adminLink(reqId, 'approve'));
    let r = await get(admin, qs);
    assert.strictEqual(db.requests[0].status, 'new');
    assert.ok(r.body.includes('<form method="post"'));
    r = await post(admin, {}, qs);
    assert.strictEqual(db.requests[0].status, 'approved');
    assert.ok(r.body.includes('wa.me/972523983394') && r.body.includes(encodeURIComponent('https://bit.test/pay')));
  });
  await t('dispatch: matches by area/capacity/exact kashrut, skips blocked date, creates inquiries', async () => {
    blocked = [{ venue_id: 'v3' }];
    process.env.CHECK_N8N_WEBHOOK = 'https://n8n.test/hook';
    const qs = qsOf(adminLink(reqId, 'dispatch'));
    const r = await post(admin, {}, qs);
    const q = db.venueQueries[0];
    assert.ok(q.includes('active=is.true') && q.includes('capacity_max=gte.180') && q.includes('area=in.("מרכז")') && q.includes('kashrut=in.("בד\\"ץ בית יוסף")'));
    assert.strictEqual(db.inquiries.length, 2);
    assert.ok(!db.inquiries.some((i) => i.venue_id === 'v3'));
    assert.strictEqual(db.requests[0].status, 'dispatched');
    assert.strictEqual(db.requests[0].payment_status, 'paid');
    assert.ok(r.body.includes('wa.me/972501111111') && r.body.includes('הכשר לא אומת'));
    assert.strictEqual(db.n8n[0].type, 'request.dispatched');
    assert.ok(db.n8n[0].inquiries[0].link.startsWith('https://multibrawn.co.il/check/v/?t='));
    delete process.env.CHECK_N8N_WEBHOOK;
  });
  await t('dispatch again is idempotent (no duplicate inquiries)', async () => {
    await post(admin, {}, qsOf(adminLink(reqId, 'dispatch')));
    assert.strictEqual(db.inquiries.length, 2);
  });
  await t('reject after dispatch → 409', async () => {
    const r = await post(admin, {}, qsOf(adminLink(reqId, 'reject')));
    assert.strictEqual(r.statusCode, 409);
  });

  console.log('CHECK · VENUE REPLY');
  const tok = () => db.inquiries[0].token;
  await t('venue opens link → event details only, no client PII', async () => {
    const r = await get(inquiry, { t: tok() });
    const d = JSON.parse(r.body);
    assert.strictEqual(d.venue, 'אולמי הגן');
    assert.strictEqual(d.status, 'sent');
    assert.ok(!r.body.includes('דנה') && !r.body.includes('972523983394'));
  });
  await t('bad token → 404', async () => {
    assert.strictEqual((await get(inquiry, { t: 'nope' })).statusCode, 404);
    assert.strictEqual((await get(inquiry, { t: 'A'.repeat(22) })).statusCode, 404);
  });
  await t('"available" without price → 400', async () => {
    const r = await post(inquiry, { t: tok(), available: true });
    assert.strictEqual(r.statusCode, 400);
  });
  await t('venue answers available + price → saved, Ardit emailed with WhatsApp offer to client', async () => {
    const before = db.emails.length;
    const r = await post(inquiry, { t: tok(), available: true, price: '280', price_type: 'per_guest', note: 'כולל בר' });
    const d = JSON.parse(r.body);
    assert.strictEqual(d.status, 'available');
    assert.strictEqual(db.inquiries[0].price, 280);
    const mail = db.emails[before];
    assert.ok(mail.subject.includes('פנוי · 280 ₪ למנה'));
    assert.ok(mail.html.includes('wa.me/972523983394') && mail.html.includes(encodeURIComponent('https://tour.test/1')));
  });
  await t('venue answers unavailable → saved, price cleared', async () => {
    await post(inquiry, { t: db.inquiries[1].token, available: false });
    assert.strictEqual(db.inquiries[1].status, 'unavailable');
    assert.strictEqual(db.inquiries[1].price, null);
  });
  await t('closed request → venue cannot change answer', async () => {
    db.requests[0].status = 'closed';
    const r = await post(inquiry, { t: tok(), available: false });
    assert.strictEqual(r.statusCode, 409);
  });

  console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
  process.exit(fail ? 1 : 0);
})();

// בדיקות מקצה-לקצה עם רשת מדומה (בלי קריאות חיצוניות אמיתיות).
// מכסה את בדיקות המסירה של §12 + מודולי הליבה.
const crypto = require('crypto');
const assert = require('assert');
const path = require('path');

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); ok(name); } catch (e) { bad(name, e); }
}
async function testAsync(name, fn) {
  try { await fn(); ok(name); } catch (e) { bad(name, e); }
}
function ok(n) { pass++; console.log('  ✓ ' + n); }
function bad(n, e) { fail++; console.log('  ✗ ' + n + '\n      ' + (e && e.message)); }

// --- מפתח RSA לבדיקה (חתימת JWT של Service Account) ---
const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const PEM = privateKey.export({ type: 'pkcs8', format: 'pem' });

// --- env לבדיקה ---
process.env.TOKEN_SECRET = 'test-token-secret-123456';
process.env.GROW_WEBHOOK_SECRET = 'grow-secret-abc';
process.env.RESEND_API_KEY = 're_test';
process.env.FROM_EMAIL = 'noreply@multibrawn.co.il';
process.env.ARDIT_EMAIL = 'ardit@multibrawn.co.il';
process.env.ARDIT_WHATSAPP = '972523983394';
process.env.GOOGLE_SA_EMAIL = 'sa@project.iam.gserviceaccount.com';
process.env.GOOGLE_SA_PRIVATE_KEY = PEM.replace(/\n/g, '\\n'); // כמו ב-Netlify env
process.env.SHEET_ID = 'sheet123';

// --- רשת מדומה ---
const state = { rows: [], appended: [], emails: [], resendFail: false };
function jsonRes(obj, status = 200) { return { ok: status < 400, status, json: async () => obj, text: async () => JSON.stringify(obj) }; }
function textRes(status, txt) { return { ok: false, status, json: async () => ({}), text: async () => txt }; }
global.fetch = async (url, opts) => {
  url = String(url);
  if (url.includes('hook.make.test')) {
    if (state.makeFail) return textRes(500, 'err');
    return jsonRes({ url: 'https://pay.grow.link/DYNAMIC-123' });
  }
  if (url.includes('meshulam.co.il')) {
    state.growReq = { url, body: opts && opts.body, ctype: opts && opts.headers && opts.headers['Content-Type'] };
    if (state.growFail) return jsonRes({ status: 0, err: { message: 'invalid' } });
    return jsonRes({ status: 1, data: { url: 'https://meshulam.co.il/pay/PROC-777', processToken: 'tok' } });
  }
  if (url.includes('api.anthropic.com')) {
    if (state.anthropicFail) return textRes(500, 'overloaded');
    state.anthropicCalls = (state.anthropicCalls || 0) + 1;
    return jsonRes({ content: [{ type: 'text', text: 'צריך בערך 15 חלות ל-60 איש.' }], stop_reason: 'end_turn' });
  }
  if (url.includes('oauth2.googleapis.com/token')) return jsonRes({ access_token: 'tok', expires_in: 3600 });
  if (url.includes('sheets.googleapis.com') && /:append/.test(url)) { state.appended.push(JSON.parse(opts.body).values[0]); return jsonRes({}); }
  if (url.includes('sheets.googleapis.com')) return jsonRes({ values: state.rows });
  if (url.includes('api.resend.com')) {
    if (state.resendFail) return textRes(401, 'unauthorized api key');
    state.emails.push(JSON.parse(opts.body));
    return jsonRes({ id: 'email_1' });
  }
  throw new Error('unexpected fetch ' + url);
};
function reset() { state.rows = []; state.appended = []; state.emails = []; state.resendFail = false; state.anthropicFail = false; state.anthropicCalls = 0; }

// --- מודולים נבדקים ---
const { makeToken, verifyToken } = require('../netlify/functions/lib/token');
const { normalizePhone } = require('../netlify/functions/lib/phone');
const { hebrewReason } = require('../netlify/functions/lib/mailer');
const webhook = require('../netlify/functions/grow-webhook');
const guide = require('../netlify/functions/guide');
const ai = require('../netlify/functions/ai');
const cpay = require('../netlify/functions/create-payment');
const lead = require('../netlify/functions/lead');
process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
process.env.GROW_LINK_50 = 'https://pay.grow.link/L50';
process.env.GROW_LINK_99 = 'https://pay.grow.link/L99';

function signedEvent(bodyObj, secret = process.env.GROW_WEBHOOK_SECRET) {
  const body = JSON.stringify(bodyObj);
  return {
    httpMethod: 'POST',
    body,
    headers: { 'content-type': 'application/json', 'x-grow-signature': crypto.createHmac('sha256', secret).update(body).digest('hex') },
  };
}

(async function main() {
  console.log('\nTOKEN');
  test('makeToken deterministic, 16 chars base64url', () => {
    const t = makeToken('TX1', process.env.TOKEN_SECRET);
    assert.strictEqual(t.length, 16);
    assert.strictEqual(t, makeToken('TX1', process.env.TOKEN_SECRET));
    assert.ok(/^[A-Za-z0-9_-]{16}$/.test(t));
  });
  test('verifyToken accepts correct, rejects wrong/empty', () => {
    const t = makeToken('TX1', process.env.TOKEN_SECRET);
    assert.ok(verifyToken('TX1', t, process.env.TOKEN_SECRET));
    assert.ok(!verifyToken('TX1', t + 'x', process.env.TOKEN_SECRET));
    assert.ok(!verifyToken('TX2', t, process.env.TOKEN_SECRET));
    assert.ok(!verifyToken('TX1', '', process.env.TOKEN_SECRET));
  });

  console.log('PHONE');
  test('05X -> 972X', () => assert.strictEqual(normalizePhone('052-398-3394'), '972523983394'));
  test('already 972', () => assert.strictEqual(normalizePhone('972523983394'), '972523983394'));
  test('spaces/(+) stripped', () => assert.strictEqual(normalizePhone('+972 52 398 3394'), '972523983394'));
  test('junk -> null', () => assert.strictEqual(normalizePhone('hello'), null));
  test('empty -> null', () => assert.strictEqual(normalizePhone(''), null));

  console.log('FIELD EXTRACTION');
  test('extract from nested GROW-like payload', () => {
    const flat = webhook._internal.flatten({ data: { transactionId: 'A1', payerEmail: 'x@y.com' }, fullName: 'דנה', sum: '99' });
    assert.strictEqual(webhook._internal.extract(flat, webhook._internal.FIELD_MAP.transaction_id), 'A1');
    assert.strictEqual(webhook._internal.extract(flat, webhook._internal.FIELD_MAP.customer_email), 'x@y.com');
    assert.strictEqual(webhook._internal.extract(flat, webhook._internal.FIELD_MAP.customer_name), 'דנה');
  });

  console.log('SIGNATURE');
  test('valid signature -> true', () => {
    const ev = signedEvent({ transactionId: 'S1' });
    assert.strictEqual(webhook._internal.verifySignature(ev, ev.body), true);
  });
  test('invalid signature -> false', () => {
    const ev = signedEvent({ transactionId: 'S1' }, 'wrong-secret');
    assert.strictEqual(webhook._internal.verifySignature(ev, ev.body), false);
  });

  console.log('WEBHOOK (§12)');
  await testAsync('1. valid payment -> 200, two emails sent, row appended (aligned columns)', async () => {
    reset();
    const res = await webhook.handler(signedEvent({ transactionId: 'TX1', fullName: 'ישראל', email: 'a@b.com', phone: '0501234567', amount: '99' }));
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(state.emails.length, 2, 'expected 2 emails');
    assert.strictEqual(state.appended.length, 1, 'expected 1 sheet row');
    const row = state.appended[0];
    assert.strictEqual(row[1], 'TX1');            // מזהה עסקה (למניעת כפילות)
    assert.strictEqual(row[4], '972501234567');   // normalized phone
    assert.strictEqual(row[7], 'נסגר');           // סטטוס = שילם
    assert.ok(row[8].includes('/guide?id=TX1&t=')); // קישור אישי בעמודת התקציר
  });
  await testAsync('2. same transaction twice -> sent only once', async () => {
    reset();
    state.rows = [['2026-01-01', 'TX1', 'ישראל', 'a@b.com', '972501234567', '99', 'link', 'נשלח', 'נשלח', '']];
    const res = await webhook.handler(signedEvent({ transactionId: 'TX1', fullName: 'ישראל', email: 'a@b.com', phone: '0501234567', amount: '99' }));
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(state.emails.length, 0, 'no email on duplicate');
    assert.strictEqual(state.appended.length, 0, 'no new row on duplicate');
  });
  await testAsync('3. invalid signature -> 401, nothing sent', async () => {
    reset();
    const ev = signedEvent({ transactionId: 'TX9' }, 'wrong');
    const res = await webhook.handler(ev);
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(state.emails.length, 0);
  });
  await testAsync('4. Resend fails -> still 200, row still appended', async () => {
    reset();
    state.resendFail = true;
    const res = await webhook.handler(signedEvent({ transactionId: 'TX2', fullName: 'רון', email: 'r@b.com', phone: '0521111111', amount: '99' }));
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(state.appended.length, 1);
    assert.strictEqual(state.appended[0][1], 'TX2');
  });
  await testAsync('5. invalid phone -> customer email still sent, no wa hyperlink', async () => {
    reset();
    const res = await webhook.handler(signedEvent({ transactionId: 'TX3', fullName: 'נועה', email: 'n@b.com', phone: 'not-a-phone', amount: '99' }));
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(state.emails.length, 2);
    assert.strictEqual(state.appended[0][9], ''); // עמודת וואטסאפ ריקה כשהטלפון לא תקין
  });

  console.log('GUIDE (§12)');
  await testAsync('6a. valid token -> 200 html', async () => {
    reset();
    const t = makeToken('TXG', process.env.TOKEN_SECRET);
    const res = await guide.handler({ queryStringParameters: { id: 'TXG', t } });
    assert.strictEqual(res.statusCode, 200);
    assert.ok(/text\/html/.test(res.headers['Content-Type']));
    assert.ok(res.body.includes('שבת') && res.body.length > 1000);
    assert.ok(!res.body.includes('__GAMES_URL__'), 'placeholder should be injected');
  });
  await testAsync('6b. no token but transaction in sheet -> 200 (thank-you path)', async () => {
    reset();
    state.rows = [['2026', 'TXS', 'x', 'x@x.com', '972', '99', 'l', 'נשלח', 'נשלח', '']];
    const res = await guide.handler({ queryStringParameters: { id: 'TXS' } });
    assert.strictEqual(res.statusCode, 200);
  });
  await testAsync('6c. no token, not in sheet -> 403', async () => {
    reset();
    const res = await guide.handler({ queryStringParameters: { id: 'NOPE', t: 'bad' } });
    assert.strictEqual(res.statusCode, 403);
  });
  await testAsync('6d. games page served with valid token', async () => {
    reset();
    const t = makeToken('TXG', process.env.TOKEN_SECRET);
    const res = await guide.handler({ queryStringParameters: { id: 'TXG', t, page: 'games' } });
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body.includes('משחקי'));
  });
  await testAsync('6e. premium guide served with valid token', async () => {
    reset();
    const t = makeToken('TXP', process.env.TOKEN_SECRET);
    const res = await guide.handler({ queryStringParameters: { id: 'TXP', t, page: 'premium' } });
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body.includes('מהדורת הפרימיום'));
    assert.ok(res.body.includes('מחשבון כמויות אוכל'));
    assert.ok(!res.body.includes('__GAMES_URL__'));
  });

  await testAsync('6f. self-validating token -> 200 (thank-you grant, no backend)', async () => {
    reset();
    const payload = crypto.createHash('sha256').update('mb|test').digest('hex').slice(0, 12);
    const t = 'MB-' + payload + '-' + crypto.createHash('sha256').update('MB-' + payload).digest('hex').slice(0, 8);
    const res = await guide.handler({ queryStringParameters: { id: 'buyer', t } });
    assert.strictEqual(res.statusCode, 200);
    const res2 = await guide.handler({ queryStringParameters: { id: 'buyer', t: t.slice(0, -1) + 'x' } }); // tampered
    assert.strictEqual(res2.statusCode, 403);
  });

  console.log('PRODUCT ROUTING (§ two-tier)');
  await testAsync('99₪ payment -> premium link; 50₪ -> free guide link', async () => {
    reset();
    await webhook.handler(signedEvent({ transactionId: 'P99', fullName: 'א', email: 'a@a.com', phone: '0501112222', amount: '99' }));
    const prem = state.appended[0][8];
    reset();
    await webhook.handler(signedEvent({ transactionId: 'P50', fullName: 'ב', email: 'b@b.com', phone: '0501112222', amount: '50' }));
    const free = state.appended[0][8];
    assert.ok(/page=premium/.test(prem), 'expected premium link for 99');
    assert.ok(!/page=premium/.test(free), 'expected free link for 50');
  });

  console.log('AI ASSISTANT');
  await testAsync('authorized (token) -> 200 with reply', async () => {
    reset();
    const t = makeToken('TXAI', process.env.TOKEN_SECRET);
    const res = await ai.handler({ httpMethod: 'POST', body: JSON.stringify({ id: 'TXAI', t, messages: [{ role: 'user', content: 'כמה חלות ל-60 איש?' }] }) });
    assert.strictEqual(res.statusCode, 200);
    const b = JSON.parse(res.body);
    assert.ok(b.reply && b.reply.includes('חלות'));
    assert.strictEqual(state.anthropicCalls, 1);
  });
  await testAsync('authorized via sheet (no token) -> 200', async () => {
    reset();
    state.rows = [['2026', 'TXS2', 'x', 'x@x.com', '972', '99', 'l', 'נשלח', 'נשלח', '']];
    const res = await ai.handler({ httpMethod: 'POST', body: JSON.stringify({ id: 'TXS2', question: 'טיפ לחיבור המשפחות?' }) });
    assert.strictEqual(res.statusCode, 200);
  });
  await testAsync('unauthorized -> 403, no Anthropic call', async () => {
    reset();
    const res = await ai.handler({ httpMethod: 'POST', body: JSON.stringify({ id: 'NOPE', t: 'bad', question: 'hi' }) });
    assert.strictEqual(res.statusCode, 403);
    assert.ok(!state.anthropicCalls);
  });
  await testAsync('Anthropic error -> graceful 200 (no crash)', async () => {
    reset();
    state.anthropicFail = true;
    const t = makeToken('TXAI', process.env.TOKEN_SECRET);
    const res = await ai.handler({ httpMethod: 'POST', body: JSON.stringify({ id: 'TXAI', t, question: 'שאלה' }) });
    assert.strictEqual(res.statusCode, 200);
    assert.ok(JSON.parse(res.body).reply.length > 0);
  });

  console.log('CREATE PAYMENT (Make → GROW)');
  await testAsync('with Make webhook -> returns dynamic payment url', async () => {
    process.env.MAKE_PAYMENT_WEBHOOK = 'https://hook.make.test/abc';
    const res = await cpay.handler({ httpMethod: 'POST', body: JSON.stringify({ amount: 99, product: 'premium' }) });
    assert.strictEqual(res.statusCode, 200);
    const b = JSON.parse(res.body);
    assert.ok(/pay\.grow\.link/.test(b.url) && !b.fallback);
  });
  await testAsync('Make error -> graceful GROW fallback link', async () => {
    process.env.MAKE_PAYMENT_WEBHOOK = 'https://hook.make.test/abc';
    state.makeFail = true;
    const res = await cpay.handler({ httpMethod: 'POST', body: JSON.stringify({ amount: 99 }) });
    const b = JSON.parse(res.body);
    assert.ok(b.url && b.fallback === true);
    state.makeFail = false;
  });
  await testAsync('no Make -> fixed GROW link routed by amount (50 vs 99)', async () => {
    delete process.env.MAKE_PAYMENT_WEBHOOK;
    const r50 = JSON.parse((await cpay.handler({ httpMethod: 'POST', body: JSON.stringify({ amount: 50 }) })).body);
    const r99 = JSON.parse((await cpay.handler({ httpMethod: 'POST', body: JSON.stringify({ amount: 99 }) })).body);
    assert.strictEqual(r50.url, 'https://pay.grow.link/L50');
    assert.strictEqual(r99.url, 'https://pay.grow.link/L99');
    assert.ok(r50.fallback && r99.fallback);
  });
  await testAsync('GROW API configured -> uses createPaymentProcess (multipart) and returns data.url', async () => {
    process.env.GROW_USER_ID = 'u123';
    process.env.GROW_PAGE_CODE = 'pc456';
    process.env.GROW_API_KEY = 'key789';
    process.env.MAKE_PAYMENT_WEBHOOK = 'https://hook.make.test/abc'; // גם עם Make — ה-API מנצח
    state.growReq = null;
    const res = await cpay.handler({ httpMethod: 'POST', body: JSON.stringify({ amount: 50, name: 'דנה כהן', phone: '0501234567', email: 'd@x.com' }) });
    const b = JSON.parse(res.body);
    assert.strictEqual(b.url, 'https://meshulam.co.il/pay/PROC-777');
    assert.ok(!b.fallback);
    assert.ok(/multipart\/form-data/.test(state.growReq.ctype), 'content-type multipart');
    assert.ok(state.growReq.body.includes('pc456') && state.growReq.body.includes('u123') && state.growReq.body.includes('0501234567'));
    delete process.env.MAKE_PAYMENT_WEBHOOK;
  });
  await testAsync('GROW API error -> falls back to fixed link (sale never stuck)', async () => {
    state.growFail = true;
    const res = await cpay.handler({ httpMethod: 'POST', body: JSON.stringify({ amount: 50, name: 'דנה', phone: '0501234567' }) });
    const b = JSON.parse(res.body);
    assert.strictEqual(b.url, 'https://pay.grow.link/L50');
    assert.ok(b.fallback);
    state.growFail = false;
    delete process.env.GROW_USER_ID; delete process.env.GROW_PAGE_CODE; delete process.env.GROW_API_KEY;
  });

  console.log('LEAD (Sheet + Ardit WhatsApp)');
  await testAsync('lead -> writes Sheet row + emails Ardit with normalized phone', async () => {
    reset();
    const res = await lead.handler({ httpMethod: 'POST', body: JSON.stringify({ name: 'דנה', email: 'd@x.com', phone: '0501234567', event_type: 'שבת חתן' }) });
    assert.strictEqual(res.statusCode, 200);
    assert.ok(JSON.parse(res.body).ok);
    assert.strictEqual(state.appended.length, 1);
    assert.strictEqual(state.appended[0][2], 'דנה');       // name
    assert.strictEqual(state.appended[0][4], '972501234567'); // normalized phone
    assert.strictEqual(state.emails.length, 1);            // Ardit notified
  });
  await testAsync('lead empty -> ok:false, nothing written/sent', async () => {
    reset();
    const res = await lead.handler({ httpMethod: 'POST', body: '{}' });
    assert.strictEqual(JSON.parse(res.body).ok, false);
    assert.strictEqual(state.appended.length, 0);
    assert.strictEqual(state.emails.length, 0);
  });

  console.log('MAILER reasons');
  test('hebrewReason maps 401', () => assert.ok(/שגוי/.test(hebrewReason(new Error('Resend 401: unauthorized api key')))));

  console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
  process.exit(fail ? 1 : 0);
})();

// ============================================================
//  send-guide — מבקש מ-Apps Script Web App לשלוח ללקוח מייל עם קישור המדריך.
//  המייל נשלח מה-Gmail של multibrawn (דרך MailApp), בלי שירות חיצוני.
//  קורא ל-LEAD_WEBHOOK (אותו Web App של הלידים) עם action=guideEmail.
//  best-effort — לא קורס. נקרא מדף התודה אחרי תשלום.
// ============================================================

function json(statusCode, obj) {
  return { statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(obj) };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let b;
  try { b = JSON.parse(event.body || '{}'); } catch (e) { b = {}; }
  const email = String(b.email || '').trim();
  const link = String(b.link || '').trim();
  const name = String(b.name || '').trim();
  if (!email || !link) return json(200, { ok: false });

  const HOOK = process.env.LEAD_WEBHOOK;
  if (!HOOK) return json(200, { ok: false, reason: 'no webhook' });

  try {
    await fetch(HOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'mb-lead-2026-a7k9x2', action: 'guideEmail', email, name, link }),
    });
    return json(200, { ok: true });
  } catch (e) {
    console.error('[send-guide]', String(e && e.message));
    return json(200, { ok: false });
  }
};

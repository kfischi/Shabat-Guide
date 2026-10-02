// MULTIBRAWN CHECK — עזרים משותפים: כתובות, חתימת קישורי ניהול, וואטסאפ, n8n ועמודי HTML קצרים.
const { makeToken, verifyToken } = require('../token');

const baseUrl = () => (process.env.CHECK_BASE_URL || (process.env.SITE_URL || 'https://guide.multibrawn.co.il').replace(/\/$/, '') + '/check').replace(/\/$/, '');
const secret = () => process.env.CHECK_SECRET || process.env.TOKEN_SECRET;

// קישור ניהול חתום לערדית (אישור / דחייה / שליחה למקומות) — לא ניתן לנחש או לשנות פעולה.
function adminLink(id, action) {
  const sig = makeToken(`${id}:${action}`, secret());
  return `${baseUrl()}/api/admin?id=${encodeURIComponent(id)}&a=${action}&s=${sig}`;
}
const adminOk = (id, action, sig) => verifyToken(`${id}:${action}`, sig, secret());

const venueLink = (token) => `${baseUrl()}/v/?t=${token}`;
const wa = (phone, text) => `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function json(statusCode, obj) {
  return { statusCode, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, body: JSON.stringify(obj) };
}

// אירוע ל-n8n (לשליחת וואטסאפ אוטומטית דרך WAHA). רדום עד שמוגדר CHECK_N8N_WEBHOOK.
async function notifyN8n(type, data) {
  const url = process.env.CHECK_N8N_WEBHOOK;
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Source': 'multibrawn-check' },
      body: JSON.stringify({ type, at: new Date().toISOString(), ...data }),
    });
  } catch (e) {
    console.error('[check] n8n:', String(e && e.message));
  }
}

// עמוד HTML קצר וממותג (לפעולות ניהול). body כבר מוברח.
function page(title, body, status = 200) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
    body: `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${esc(title)} · MULTIBRAWN CHECK</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@700&family=Heebo:wght@400;500;700&display=swap" rel="stylesheet">
<style>
:root{--bg:#F4ECF9;--card:#fff;--ink:#2C1A3D;--muted:#715B85;--line:#E3CFEE;--purple:#7C3AED;--fuchsia:#D946EF;--turq:#40E0D0;--ok:#0F8A7E;--no:#9B2C5A}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 Heebo,Arial,sans-serif}
main{max-width:620px;margin:0 auto;padding:28px 16px 48px}
.brand{font:700 13px Heebo;letter-spacing:.18em;color:var(--purple)}
h1{font:700 26px/1.25 'Frank Ruhl Libre',serif;margin:6px 0 14px}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px;margin:14px 0}
.sum{font-weight:500;border-inline-start:4px solid var(--fuchsia);padding-inline-start:12px}
.muted{color:var(--muted);font-size:14px}
.btn{display:inline-block;min-height:44px;padding:11px 20px;border-radius:12px;text-decoration:none;font-weight:700;color:#fff;background:linear-gradient(90deg,var(--purple),var(--fuchsia));margin:6px 0}
.btn.sec{background:#fff;color:var(--purple);border:1.5px solid var(--purple)}
.btn.wa{background:#1F9D55}
.v{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap;border-top:1px solid var(--line);padding:12px 0}
.v:first-child{border-top:0}.tag{font-size:12px;padding:2px 8px;border-radius:99px;background:#EFE4F7;color:var(--muted)}
</style></head><body><main><div class="brand">MULTIBRAWN CHECK</div>${body}</main></body></html>`,
  };
}

module.exports = { baseUrl, adminLink, adminOk, venueLink, wa, esc, json, notifyN8n, page };

// ============================================================
//  social-post — מפרסם פוסט לעמוד פייסבוק ולאינסטגרם עסקי
//  דרך Meta Graph API. שרת-לשרת (בלי CORS, בלי חשיפת טוקן בדפדפן).
//
//  דורש משתני סביבה (מוגדרים ב-Netlify → Site settings → Environment):
//   • META_ACCESS_TOKEN  — טוקן גישה של העמוד (Page Access Token / System User)
//                          עם ההרשאות pages_manage_posts + instagram_content_publish
//   • META_PAGE_ID       — מזהה עמוד הפייסבוק
//   • META_IG_USER_ID    — מזהה חשבון האינסטגרם העסקי המקושר לעמוד
//   • SOCIAL_POST_TOKEN  — סוד פנימי; חובה להעביר בגוף הבקשה כדי להפעיל (מונע פרסום ע"י זרים)
//   • META_GRAPH_VERSION — אופציונלי, ברירת מחדל v21.0
//
//  קריאה: POST { token, text, imageUrl?, targets? }
//   targets = ["facebook","instagram"] (ברירת מחדל: שניהם)
//  הערה: אינסטגרם *מחייב* תמונה (imageUrl) — טקסט בלבד עולה רק לפייסבוק.
// ============================================================

const GRAPH = () => `https://graph.facebook.com/${process.env.META_GRAPH_VERSION || 'v21.0'}`;

function json(statusCode, obj) {
  return { statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(obj) };
}

// בונה גוף application/x-www-form-urlencoded (Graph API מקבל form fields)
function form(fields) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined && v !== null && v !== '') p.append(k, String(v));
  }
  return p.toString();
}

async function graphPost(pathId, fields) {
  const res = await fetch(`${GRAPH()}/${pathId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form(fields),
  });
  const raw = await res.text().catch(() => '');
  let j; try { j = JSON.parse(raw); } catch (e) { j = null; }
  if (!res.ok || (j && j.error)) {
    const msg = j && j.error ? j.error.message : raw.slice(0, 300);
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return j || {};
}

// פרסום לפייסבוק: עם תמונה → /photos, אחרת → /feed (טקסט בלבד מותר)
async function postFacebook({ text, imageUrl, token }) {
  const pageId = process.env.META_PAGE_ID;
  if (!pageId) throw new Error('META_PAGE_ID לא מוגדר');
  if (imageUrl) {
    const r = await graphPost(`${pageId}/photos`, { url: imageUrl, caption: text || '', access_token: token });
    return { id: r.post_id || r.id };
  }
  const r = await graphPost(`${pageId}/feed`, { message: text || '', access_token: token });
  return { id: r.id };
}

// פרסום לאינסטגרם: שני שלבים — יצירת מיכל מדיה ואז פרסום. חובה תמונה.
async function postInstagram({ text, imageUrl, token }) {
  const igId = process.env.META_IG_USER_ID;
  if (!igId) throw new Error('META_IG_USER_ID לא מוגדר');
  if (!imageUrl) throw new Error('אינסטגרם דורש תמונה (imageUrl) — לא ניתן לפרסם טקסט בלבד');
  const container = await graphPost(`${igId}/media`, { image_url: imageUrl, caption: text || '', access_token: token });
  if (!container.id) throw new Error('יצירת מיכל המדיה נכשלה');
  const published = await graphPost(`${igId}/media_publish`, { creation_id: container.id, access_token: token });
  return { id: published.id };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let b; try { b = JSON.parse(event.body || '{}'); } catch (e) { b = {}; }

  // שער סוד — רק מי שמחזיק ב-SOCIAL_POST_TOKEN יכול לפרסם
  const gate = process.env.SOCIAL_POST_TOKEN;
  if (!gate || b.token !== gate) return json(401, { ok: false, error: 'unauthorized' });

  const token = process.env.META_ACCESS_TOKEN;
  if (!token) return json(500, { ok: false, error: 'META_ACCESS_TOKEN לא מוגדר' });

  const text = String(b.text || '').trim();
  const imageUrl = String(b.imageUrl || '').trim();
  const targets = Array.isArray(b.targets) && b.targets.length
    ? b.targets.map((t) => String(t).toLowerCase())
    : ['facebook', 'instagram'];

  if (!text && !imageUrl) return json(400, { ok: false, error: 'חסר תוכן — text או imageUrl' });

  const results = {};
  let anyOk = false;

  if (targets.includes('facebook')) {
    try { results.facebook = { ok: true, ...(await postFacebook({ text, imageUrl, token })) }; anyOk = true; }
    catch (e) { results.facebook = { ok: false, error: String(e && e.message) }; }
  }
  if (targets.includes('instagram')) {
    try { results.instagram = { ok: true, ...(await postInstagram({ text, imageUrl, token })) }; anyOk = true; }
    catch (e) { results.instagram = { ok: false, error: String(e && e.message) }; }
  }

  return json(anyOk ? 200 : 502, { ok: anyOk, results });
};

// חשיפה לבדיקות
exports._internal = { form, GRAPH, postFacebook, postInstagram };

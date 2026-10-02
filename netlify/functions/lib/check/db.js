// MULTIBRAWN CHECK — גישה ל-Supabase דרך REST (PostgREST), בלי תלות ב-npm.
// מפתח service role חי רק בשרת (משתני סביבה ב-Netlify) — הטבלאות סגורות לגישה מהדפדפן (RLS בלי policies).
const crypto = require('crypto');

function cfg() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('הגדרות Supabase חסרות (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
  return { url: url.replace(/\/$/, ''), key };
}

async function sb(path, { method = 'GET', body, prefer } = {}) {
  const { url, key } = cfg();
  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  if (prefer) headers.Prefer = prefer;
  const res = await fetch(`${url}/rest/v1/${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text().catch(() => '');
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

// ערך בודד לפילטר PostgREST
const enc = (v) => encodeURIComponent(String(v));
// רשימה לפילטר in.(...) — כל ערך במירכאות, כי בהכשרים יש גרשיים ופסיקים (בד"ץ)
const inList = (arr) => enc('(' + arr.map((v) => '"' + String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"').join(',') + ')');

const one = (rows) => (Array.isArray(rows) && rows.length ? rows[0] : null);

async function insertRequest(row) {
  return one(await sb('check_requests', { method: 'POST', body: row, prefer: 'return=representation' }));
}
async function getRequest(id) {
  return one(await sb(`check_requests?id=eq.${enc(id)}&select=*`));
}
async function updateRequest(id, patch) {
  return one(await sb(`check_requests?id=eq.${enc(id)}`, { method: 'PATCH', body: patch, prefer: 'return=representation' }));
}

const VENUE_FIELDS = 'id,name,venue_type,city,area,capacity_max,kashrut,kashrut_verified,contact_name,phone,virtual_tour_url';

// מקומות פעילים שמתאימים לבקשה: אזור, קיבולת, הכשר מדויק, סוג מקום — ולא חסומים בתאריך.
async function matchVenues(r, limit = 4) {
  let q = `check_venues?select=${VENUE_FIELDS}&active=is.true`
    + `&capacity_max=gte.${r.guests}`
    + `&or=${enc(`(capacity_min.is.null,capacity_min.lte.${r.guests})`)}`
    + `&area=in.${inList(r.areas)}`;
  if (!r.kashrut.includes('לא משנה')) q += `&kashrut=in.${inList(r.kashrut)}`;
  if (r.venue_types && r.venue_types.length) q += `&venue_type=in.${inList(r.venue_types)}`;
  q += '&order=kashrut_verified.desc,capacity_max.asc&limit=' + (limit + 10);

  const venues = (await sb(q)) || [];
  if (!venues.length) return [];

  const blocked = (await sb(`check_availability?select=venue_id&date=eq.${enc(r.event_date)}&is_available=is.false`)) || [];
  const no = new Set(blocked.map((b) => b.venue_id));
  return venues.filter((v) => !no.has(v.id)).slice(0, limit);
}

async function inquiriesFor(requestId) {
  return (await sb(`check_inquiries?request_id=eq.${enc(requestId)}&select=*,venue:check_venues(${VENUE_FIELDS})&order=created_at.asc`)) || [];
}

async function createInquiries(requestId, venues) {
  const rows = venues.map((v) => ({ request_id: requestId, venue_id: v.id, token: crypto.randomBytes(16).toString('base64url') }));
  if (!rows.length) return [];
  await sb('check_inquiries', { method: 'POST', body: rows, prefer: 'return=minimal' });
  return inquiriesFor(requestId);
}

async function inquiryByToken(token) {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(String(token || ''))) return null;
  return one(await sb(`check_inquiries?token=eq.${enc(token)}&select=*,venue:check_venues(${VENUE_FIELDS}),request:check_requests(*)`));
}

async function updateInquiry(id, patch) {
  return one(await sb(`check_inquiries?id=eq.${enc(id)}`, { method: 'PATCH', body: patch, prefer: 'return=representation' }));
}

module.exports = { sb, insertRequest, getRequest, updateRequest, matchVenues, inquiriesFor, createInquiries, inquiryByToken, updateInquiry, _internal: { inList } };

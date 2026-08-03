// כתיבה וקריאה מ-Google Sheets דרך REST API עם Service Account.
// חתימת JWT מתבצעת עם crypto המובנה — בלי תלות ב-npm.
// כל הסודות (GOOGLE_SA_EMAIL / GOOGLE_SA_PRIVATE_KEY / SHEET_ID) מ-env בלבד.

const crypto = require('crypto');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b64url = (buf) => Buffer.from(buf).toString('base64url');

function requireEnv() {
  const email = process.env.GOOGLE_SA_EMAIL;
  const rawKey = process.env.GOOGLE_SA_PRIVATE_KEY;
  const sheetId = process.env.SHEET_ID;
  if (!email || !rawKey || !sheetId) {
    throw new Error('הגדרות Google Sheets חסרות (Service Account / SHEET_ID)');
  }
  // תמיכה גם ב-\n אמיתיים וגם ב-\\n שמגיע ממשתני סביבה
  const key = rawKey.replace(/\\n/g, '\n');
  return { email, key, sheetId };
}

// fetch עם ניסיון חוזר על זמני בלבד (5xx/429/רשת): 3 ניסיונות, 1/2/4 ש'.
async function fetchRetry(url, opts) {
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    let res;
    try {
      res = await fetch(url, opts);
    } catch (netErr) {
      lastErr = netErr;
      if (attempt < 2) await sleep(1000 * Math.pow(2, attempt));
      continue;
    }
    if (res.ok) return res;
    const body = await res.text().catch(() => '');
    const transient = res.status >= 500 || res.status === 429;
    lastErr = new Error(`Sheets ${res.status}: ${body.slice(0, 200)}`);
    lastErr.status = res.status;
    if (transient && attempt < 2) {
      await sleep(1000 * Math.pow(2, attempt));
      continue;
    }
    throw lastErr;
  }
  throw lastErr;
}

let cachedToken = null; // { token, exp }
async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp > now + 60) return cachedToken.token;

  const { email, key } = requireEnv();
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(
    JSON.stringify({
      iss: email,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })
  );
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${header}.${claim}`);
  let signature;
  try {
    signature = b64url(signer.sign(key));
  } catch (e) {
    throw new Error('מפתח Service Account של Google לא תקין');
  }
  const jwt = `${header}.${claim}.${signature}`;

  const res = await fetchRetry('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const json = await res.json();
  cachedToken = { token: json.access_token, exp: now + 3500 };
  return cachedToken.token;
}

async function apiCall(path, opts = {}) {
  const { sheetId } = requireEnv();
  const token = await getAccessToken();
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}${path}`;
  const res = await fetchRetry(url, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  return res.json().catch(() => ({}));
}

// מוסיף שורה אחת בסוף הגיליון (עמודות A..J).
async function appendRow(values) {
  return apiCall(
    `/values/A:J:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    { method: 'POST', body: JSON.stringify({ values: [values] }) }
  );
}

// מחזיר את השורה שבה עמודה B == transactionId, או null.
async function findRowByTransaction(transactionId) {
  const id = String(transactionId);
  const data = await apiCall(`/values/A:J`);
  const rows = (data && data.values) || [];
  for (const row of rows) {
    if (String(row[1] || '').trim() === id.trim()) return row;
  }
  return null;
}

async function hasTransaction(transactionId) {
  const row = await findRowByTransaction(transactionId);
  return !!row;
}

module.exports = { appendRow, findRowByTransaction, hasTransaction };

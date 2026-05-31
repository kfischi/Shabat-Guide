// ============================================================
//  אימות קוד גישה (Multi Brawn)
//  - מקבל POST עם { code }
//  - מאמת מול משתנה הסביבה VALID_CODES (קודים מופרדים בפסיק)
//  - מחזיר { ok: true } אם הקוד תקין, אחרת 401
//
//  הגדרה ב-Netlify:  Site settings → Environment variables → VALID_CODES
//  לדוגמה:  VALID_CODES = AB12CD, 7K9P2Q, MULTI2026
// ============================================================

export default async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let code = "";
  try {
    const body = await request.json();
    code = String(body.code || "").trim().toLowerCase();
  } catch {
    return json({ error: "בקשה לא תקינה" }, 400);
  }

  const valid = (process.env.VALID_CODES || "")
    .split(",")
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);

  if (!code) return json({ error: "נא להזין קוד גישה." }, 400);
  if (valid.length === 0) return json({ error: "המערכת לא הוגדרה (VALID_CODES חסר)." }, 503);

  if (valid.includes(code)) return json({ ok: true }, 200);
  return json({ error: "קוד שגוי. בדקי שוב או פני אלינו בוואטסאפ." }, 401);
};

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

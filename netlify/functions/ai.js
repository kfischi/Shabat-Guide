// ============================================================
//  ai — "היועץ החכם" של Multibrawn (מבוסס Claude / Anthropic).
//  נגיש רק לקונים (אותו אימות כמו guide.js: טוקן או גיליון).
//  המפתח ANTHROPIC_API_KEY חי בצד שרת ולעולם לא נשלח לדפדפן.
// ============================================================
const { verifyToken } = require('./lib/token');
const sheets = require('./lib/sheets');

// ברירת מחדל: המודל המתקדם. ניתן לשנות דרך משתנה סביבה ANTHROPIC_MODEL.
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5';

const SYSTEM = [
  'אתה "היועץ של Multibrawn", יועץ מומחה ומנוסה לתכנון שבת חתן, שבת בר מצוה וחתונה.',
  'ענה בעברית, בפנייה חמה ומכבדת, בקצרה ולעניין (2-6 משפטים או רשימה קצרה).',
  'תן עצות מעשיות ומספרים קונקרטיים כשאפשר (כמויות, זמנים, תקציב).',
  'בנושאי כשרות והלכה — תן כיוון כללי והמלץ תמיד לאשר מול הרב של המשפחה.',
  'אל תמציא עובדות. אם חסר מידע, בקש פרט אחד קצר. הישאר בתחום תכנון השבת/האירוע.',
].join(' ');

async function authorized(id, t) {
  if (!id) return false;
  if (t && verifyToken(id, t, process.env.TOKEN_SECRET)) return true;
  try { return await sheets.hasTransaction(id); } catch (e) { return false; }
}

function json(statusCode, obj) {
  return { statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(obj) };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (e) { body = {}; }
  const id = String(body.id || '').trim();
  const t = String(body.t || '').trim();

  if (!(await authorized(id, t))) return json(403, { error: 'unauthorized' });

  // בונים היסטוריית שיחה (עד 10 הודעות אחרונות) או שאלה בודדת
  let msgs = Array.isArray(body.messages) && body.messages.length
    ? body.messages
    : [{ role: 'user', content: String(body.question || '') }];
  msgs = msgs
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-10)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
  if (!msgs.length || msgs[msgs.length - 1].role !== 'user') return json(400, { error: 'bad request' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('[ai] ANTHROPIC_API_KEY חסר');
    return json(200, { reply: 'היועץ אינו זמין כרגע. אפשר לפנות אלינו בוואטסאפ ל-052-398-3394 🌸' });
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 700,
        system: SYSTEM,
        output_config: { effort: 'low' }, // תשובות מהירות וחסכוניות לשאלות קצרות
        messages: msgs,
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      console.error('[ai] Anthropic', res.status, txt.slice(0, 300));
      return json(200, { reply: 'הייתה תקלה זמנית ביועץ. נסו שוב עוד רגע 🌸' });
    }

    const data = await res.json();
    if (data.stop_reason === 'refusal') {
      return json(200, { reply: 'אני כאן בשביל תכנון שבת חתן/אירוע. אפשר לנסח מחדש את השאלה?' });
    }
    const text = (data.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    return json(200, { reply: text || 'לא הצלחתי לנסח תשובה. נסו לשאול קצת אחרת.' });
  } catch (e) {
    console.error('[ai]', String(e && e.message));
    return json(200, { reply: 'הייתה תקלה זמנית ביועץ. נסו שוב עוד רגע 🌸' });
  }
};

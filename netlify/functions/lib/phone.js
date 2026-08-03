// נרמול מספר טלפון ישראלי לפורמט בינלאומי 972XXXXXXXXX.
// מחזיר את המספר המנורמל, או null אם לא ניתן לנרמל.
function normalizePhone(input) {
  if (!input || typeof input !== 'string') return null;
  // הסרת רווחים, מקפים, סוגריים ו-+
  const s = input.replace(/[\s\-()+.]/g, '');
  // 05XXXXXXXX (טלפון ישראלי מקומי) → 9725XXXXXXXX
  if (/^0\d{8,9}$/.test(s)) return '972' + s.slice(1);
  // כבר בפורמט בינלאומי 972XXXXXXXXX
  if (/^972\d{8,9}$/.test(s)) return s;
  // כל דבר אחר — לא תקין
  return null;
}

module.exports = { normalizePhone };

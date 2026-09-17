// ============================================================
//  free-guide — לינק פתוח למדריך החינמי (בלי טוקן ובלי תשלום).
//  עוקף תלות בהעברת query ב-redirect של Netlify: מוסיף open=1 בעצמו
//  ומאציל ל-guide.handler (כל הלוגיקה והאבטחה נשארות שם — פרימיום עדיין חסום).
// ============================================================
const guide = require('./guide');

exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  // מאפשרים page=games; לעולם לא premium (guide עצמו דוחה open ל-premium).
  const page = q.page === 'games' ? 'games' : 'guide';
  return guide.handler({ ...event, queryStringParameters: { open: '1', page } });
};

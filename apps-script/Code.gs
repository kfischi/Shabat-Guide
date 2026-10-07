// ============================================================
//  Multibrawn — Google Apps Script Web App
//  שולח מיילים ישירות מה-Gmail של multibrawn (MailApp) — בלי שירות חיצוני,
//  בלי אימות דומיין, בלי עלות. גם רושם לידים בגיליון (אם משתמשים בזה).
//
//  התקנה (פעם אחת):
//   1. פותחים את ה-Google Sheet של הלידים → תפריט Extensions → Apps Script.
//   2. מוחקים את מה שיש ומדביקים את כל הקובץ הזה. שומרים (💾).
//   3. Deploy → New deployment → ⚙️ → Web app.
//        Execute as:      Me  (multibrawn@gmail.com)
//        Who has access:  Anyone
//      Deploy → מאשרים הרשאות (Authorize) → מעתיקים את כתובת ה-/exec.
//   4. ב-Netlify (Site settings → Environment variables) מוסיפים:
//        LEAD_WEBHOOK = כתובת ה-/exec שהעתקתם
//      ומפעילים Deploy מחדש לאתר.
//
//  בדיקה: תשלום ניסיון → הלקוח מקבל מייל עם קישור, ואתם מקבלים התראה
//          עם כפתור וואטסאפ מוכן.
// ============================================================

var TOKEN       = 'mb-lead-2026-a7k9x2';   // חייב להתאים לקוד באתר — לא לשנות
var SENDER_NAME = 'Multibrawn';            // שם השולח שהלקוח רואה
var SHEET_NAME  = 'Leads';                 // שם הלשונית בגיליון (לרישום לידים)

function doPost(e) {
  try {
    var b = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (b.token !== TOKEN) return _json({ ok: false, reason: 'bad token' });

    if (b.action === 'guideEmail') return _json(sendGuideEmails(b));
    return _json(appendLead(b));              // ברירת מחדל — רישום ליד
  } catch (err) {
    return _json({ ok: false, error: String(err) });
  }
}

// --- שליחת המדריך ללקוח + התראה לערדית (בלחיצת וואטסאפ) ---
function sendGuideEmails(b) {
  var email = String(b.email || '').trim();
  var name  = String(b.name  || '').trim();
  var link  = String(b.link  || '').trim();
  if (!email || !link) return { ok: false, reason: 'missing email/link' };

  // 1) מייל ללקוח — קישור אישי למדריך
  var custHtml =
    '<div dir="rtl" style="font-family:Arial;max-width:560px;color:#2C1A3D">' +
      '<p style="font-size:18px">היי ' + _esc(name) + ',</p>' +
      '<p style="font-size:16px;line-height:1.7">התשלום התקבל 🎉 המדריך התפעולי לשבת חתן מחכה לך כאן:</p>' +
      '<p><a href="' + link + '" style="display:inline-block;background:#D946EF;color:#fff;' +
        'text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:8px">פתיחת המדריך ←</a></p>' +
      '<p style="font-size:14px;color:#715B85">הקישור אישי ושמור עבורך — אפשר לחזור אליו מתי שתרצה.</p>' +
      '<p style="font-size:14px">בהצלחה,<br>' + SENDER_NAME + '</p>' +
    '</div>';
  MailApp.sendEmail({ to: email, subject: 'המדריך התפעולי לשבת חתן — הקישור שלך',
                      htmlBody: custHtml, name: SENDER_NAME });

  // 2) התראה לערדית — עם כפתור וואטסאפ מוכן ללקוח (אם נשלחה כתובת)
  var ardit = String(b.arditEmail || '').trim();
  if (ardit) {
    var waBtn = b.waUrl
      ? '<p><a href="' + b.waUrl + '" style="display:inline-block;background:#25D366;color:#fff;' +
          'text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:8px">שליחת המדריך בוואטסאפ ←</a></p>'
      : '<p style="color:#715B85">⚠️ טלפון לא תקין — אין כפתור וואטסאפ (' + _esc(b.phone) + ')</p>';
    var arditHtml =
      '<div dir="rtl" style="font-family:Arial;max-width:560px;color:#2C1A3D">' +
        '<h2 style="font-size:20px">מכירה חדשה · ' + _esc(name) + '</h2>' +
        '<p style="font-size:15px;line-height:1.9">טלפון: ' + _esc(b.phone) + '<br>' +
          'אימייל: ' + _esc(email) + '<br>סכום: ' + _esc(b.amount) + ' ₪</p>' +
        waBtn +
        '<p style="font-size:13px;color:#715B85">קישור אישי: <a href="' + link + '">' + link + '</a></p>' +
      '</div>';
    MailApp.sendEmail({ to: ardit, subject: 'מכירה חדשה · ' + (name || email),
                        htmlBody: arditHtml, name: SENDER_NAME });
  }
  return { ok: true };
}

// --- רישום ליד בגיליון (נקרא מ-lead.js; לא חובה אם כבר רושמים דרך Service Account) ---
function appendLead(b) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return { ok: false, reason: 'no bound spreadsheet' };
    var sh = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
    var stamp = Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'yyyy-MM-dd HH:mm');
    var wa = b.phone ? '=HYPERLINK("https://wa.me/' + b.phone + '","שליחה")' : '';
    sh.appendRow([stamp, b.source || 'אתר', b.name || '', b.email || '',
                  b.phone || '', b.budget || '', b.area || '', 'ליד חדש', b.summary || '', wa]);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

function _json(o) {
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}
function _esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  });
}

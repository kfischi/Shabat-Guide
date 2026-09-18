// ============================================================
//  px — מגיש את קוד ה-Meta Pixel לדפדפן, עם המזהה ממשתני הסביבה.
//  הדפים כוללים <script src="/px"></script>. רדום עד שמוגדר META_PIXEL_ID:
//  אז mbTrack הוא no-op ושום דבר לא נשבר.
//
//  חושף לדפים:
//   • window.mbTrack(eventName, params, eventId)  — שולח אירוע פיקסל (עם eventID לדדופ מול CAPI)
//   • window.mbEventId()                          — מזהה אירוע ייחודי לשיתוף עם השרת
//   • window.mbCookies()                          — { fbp, fbc } לשיפור התאמה ב-CAPI
//   • window.MB_PIXEL_ON                          — האם הפיקסל פעיל
// ============================================================

function js(body) {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*', // כדי שגם אתרים בדומיין נפרד יטענו את אותו פיקסל
    },
    body,
  };
}

const HELPERS = `
window.mbEventId=function(){return 'mb.'+Date.now()+'.'+Math.random().toString(16).slice(2,10)};
window.mbCookies=function(){try{var c=document.cookie||'';function g(n){var m=c.match(new RegExp('(?:^|; )'+n+'=([^;]*)'));return m?decodeURIComponent(m[1]):undefined;}
  var fbp=g('_fbp'),fbc=g('_fbc');
  if(!fbc){try{var p=new URLSearchParams(location.search),cid=p.get('fbclid');if(cid)fbc='fb.1.'+Date.now()+'.'+cid;}catch(e){}}
  return {fbp:fbp,fbc:fbc};}catch(e){return {};}};
`;

exports.handler = async () => {
  const id = (process.env.META_PIXEL_ID || '').trim();

  if (!id) {
    // רדום — no-op, כדי שהדפים לא ישברו לפני שמגדירים פיקסל.
    return js(`${HELPERS}
window.MB_PIXEL_ON=false;
window.mbTrack=function(){};
`);
  }

  // קוד ה-Meta Pixel הרשמי + עטיפת mbTrack עם תמיכה ב-eventID (דדופ מול CAPI).
  return js(`
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${id}');fbq('track','PageView');
${HELPERS}
window.MB_PIXEL_ON=true;
window.mbTrack=function(name,params,eventId){try{fbq('track',name,params||{},eventId?{eventID:eventId}:undefined);}catch(e){}};
`);
};

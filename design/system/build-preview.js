// پیش‌نمایش لایهٔ سیستم طراحی روی خود نرم‌افزار، بی‌آنکه index.html تغییر کند.
// node design/system/build-preview.js <خروجی.html> [--artifact]
// خروجی = index.html فعلی + tokens.css + refine.css (پیش از </head>) + یک کلید «قبل/بعد».
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', '..');
const out = process.argv[2] || path.join(__dirname, 'preview.html');
const artifact = process.argv.includes('--artifact');

let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const layer = fs.readFileSync(path.join(__dirname, 'tokens.css'), 'utf8') + '\n' + fs.readFileSync(path.join(__dirname, 'refine.css'), 'utf8');
const toggle = `
<div id="hkDsToggle" role="group" aria-label="مقایسه" style="position:fixed;z-index:2147483000;left:max(8px,env(safe-area-inset-left,0px));top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:4px;padding:4px;border-radius:12px;background:rgba(20,20,22,.88);box-shadow:0 4px 14px rgba(0,0,0,.35);font:600 11px Vazirmatn,Tahoma,sans-serif;direction:rtl">
  <button type="button" data-v="after" style="all:unset;cursor:pointer;padding:7px 9px;border-radius:9px;color:#fff;text-align:center">بعد</button>
  <button type="button" data-v="before" style="all:unset;cursor:pointer;padding:7px 9px;border-radius:9px;color:#fff;text-align:center">قبل</button>
</div>
<script>
(function () {
  var st = document.getElementById('hkDsLayer'), box = document.getElementById('hkDsToggle');
  function set(v) { st.disabled = v === 'before'; box.querySelectorAll('button').forEach(function (b) { b.style.background = b.dataset.v === v ? '#0090d4' : 'transparent'; }); }
  box.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) set(b.dataset.v); });
  set('after');
})();
</script>
`;
const headEnd = html.indexOf('</head>');
const bodyEnd = html.lastIndexOf('</body>');
if (headEnd < 0 || bodyEnd < 0) throw new Error('head/body not found');
html = html.slice(0, bodyEnd) + toggle + html.slice(bodyEnd);
html = html.slice(0, headEnd) + '<style id="hkDsLayer">\n' + layer + '\n</style>\n' + html.slice(headEnd);
html = html.replace('<title>حساب کتاب</title>', '<title>حساب‌کتاب سیستم طراحی</title>');
if (artifact) html = html.replace(/^<!DOCTYPE html>\s*/i, '');
fs.writeFileSync(out, html);
console.log('preview:', out, (html.length / 1048576).toFixed(2) + ' MB');

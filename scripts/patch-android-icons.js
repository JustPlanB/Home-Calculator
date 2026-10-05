// آیکن و صفحهٔ شروع اختصاصی اپ (به‌جای آیکن پیش‌فرض Capacitor) — idempotent
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const src = path.join(root, 'resources/android');
const res = path.join(root, 'android/app/src/main/res');
if (!fs.existsSync(res) || !fs.existsSync(src)) { console.log('[icons] skipped'); process.exit(0); }
let n = 0;
(function copy(dir) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (e) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return copy(p);
    const rel = path.relative(src, p), dst = path.join(res, rel);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(p, dst); n++;
  });
})(src);
const bg = path.join(res, 'values/ic_launcher_background.xml');
fs.mkdirSync(path.dirname(bg), { recursive: true });
fs.writeFileSync(bg, '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#1B1B1B</color>\n</resources>\n');
console.log('[icons] ' + n + ' files copied');

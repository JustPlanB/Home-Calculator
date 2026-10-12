// در متن‌های نرم‌افزار و یادداشت‌های بروزرسانی کلمهٔ «اپ» نباید بیاید (به‌جایش «نرم‌افزار»).
// فقط الگوهای تشخیص پیامک تبلیغاتی و تبدیل خودکار پیام‌ها مجازند.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', '..');
let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const WORD = /(?<![؀-ۿ‌])اپ(?![؀-ۿ])/;
const ALLOW = ['نصب\\s*(?:اپ', "m.replace(/(^|[^\\u0600-\\u06FF])اپ", 'متن پیام‌ها: «اپ» → «نرم‌افزار»'];
for (const f of ['index.html', 'scripts/patch-android.js', 'version.json']) {
  const lines = fs.readFileSync(path.join(root, f), 'utf8').split('\n');
  const bad = [];
  lines.forEach((l, i) => { if (WORD.test(l) && !ALLOW.some(a => l.includes(a))) bad.push((i + 1) + ': ' + l.trim().slice(0, 80)); });
  ok(bad.length === 0, f + ': بدون «اپ»' + (bad.length ? ' — ' + bad.slice(0, 3).join(' | ') : ''));
}
const notes = JSON.parse(fs.readFileSync(path.join(root, 'version.json'), 'utf8')).notes || [];
ok(notes.length >= 1 && notes.length <= 4 && notes.every(n => !WORD.test(n)), 'یادداشت‌های بروزرسانی (حداکثر ۴) بدون «اپ»');
console.log('\nno-app-word: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);

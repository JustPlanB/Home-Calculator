// ۱.۳.۸۴: کد بومی اندروید در android-src/*.java است؛ تست‌هایی که قبلاً متن patch-android.js را می‌خواندند، همه را با هم می‌خوانند.
const fs = require('fs');
const path = require('path');
module.exports = function androidSource() {
  const root = path.join(__dirname, '..', '..');
  let s = fs.readFileSync(path.join(root, 'scripts', 'patch-android.js'), 'utf8');
  const dir = path.join(root, 'android-src');
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.java')).sort()) s += '\n// ==== ' + f + '\n' + fs.readFileSync(path.join(dir, f), 'utf8');
  return s;
};

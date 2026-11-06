#!/usr/bin/env node
/* ۱.۳.۸۵: index.html از بخش‌های src/ (به ترتیب src/parts.txt) دقیقاً پشت‌سرهم ساخته می‌شود — بی هیچ افزوده یا تغییر.
   منبع ویرایش src/ است؛ بعد از هر تغییر:  node scripts/assemble-index.js
   بررسی هم‌خوانی (در تست‌ها):           node scripts/assemble-index.js --check */
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
function assemble() {
  const list = fs.readFileSync(path.join(root, 'src', 'parts.txt'), 'utf8').split('\n').map(x => x.trim()).filter(Boolean);
  return list.map(f => fs.readFileSync(path.join(root, 'src', f), 'utf8')).join('');
}
if (require.main === module) {
  const out = assemble(), dst = path.join(root, 'index.html');
  if (process.argv.includes('--check')) {
    const cur = fs.readFileSync(dst, 'utf8');
    if (cur !== out) { console.error('index.html با src/ یکی نیست — node scripts/assemble-index.js را اجرا کنید'); process.exit(1); }
    console.log('index.html = src/ ✓');
  } else { fs.writeFileSync(dst, out); console.log('index.html ساخته شد (' + out.length + ' نویسه)'); }
}
module.exports = { assemble };

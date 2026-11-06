// ۱.۳.۸۵: index.html فقط از بخش‌های src/ ساخته می‌شود و باید دقیقاً با آن‌ها یکی باشد (ویرایش مستقیم index.html ممنوع).
const fs = require('fs');
const path = require('path');
const { assemble } = require('../../scripts/assemble-index.js');
const root = path.join(__dirname, '..', '..');
let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const list = fs.readFileSync(path.join(root, 'src', 'parts.txt'), 'utf8').split('\n').filter(Boolean);
ok(list.length >= 20 && list.every(f => fs.existsSync(path.join(root, 'src', f))), 'همهٔ بخش‌های src/parts.txt موجودند (' + list.length + ')');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
ok(assemble() === html, 'index.html دقیقاً همان کنار هم گذاشتن بخش‌های src/ است');
ok(list[0].startsWith('html/') && list[list.length - 1].startsWith('html/') && list.some(f => f.startsWith('css/')) && list.some(f => f.startsWith('js/')), 'ترتیب: سر HTML، استایل‌ها، بدنه، کدها، ته HTML');
const all = fs.readdirSync(path.join(root, 'src'), { recursive: true }).filter(f => /\.(css|js|html)$/.test(f)).map(f => f.split(path.sep).join('/'));
ok(all.every(f => list.includes(f)), 'هیچ فایل بخشی بیرون از فهرست نمانده');
console.log('\nsplit-integrity: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);

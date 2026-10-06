/* ساخت فایل بروزرسانی (version.json) برای هر بیلد امضاشده روی main.
   ورودی: version.json مخزن (notes و پیوند استورها) + package.json (نام نسخه) + HK_VERSION_CODE (شمارهٔ بیلد).
   خروجی: مسیر داده‌شده در آرگومان اول. اپ این فایل را از شاخهٔ update-feed می‌خواند. */
const fs = require('fs');
const path = require('path');

const out = process.argv[2];
if (!out) { console.error('usage: node make-update-feed.js <out.json>'); process.exit(1); }

const root = path.join(__dirname, '..');
const base = JSON.parse(fs.readFileSync(path.join(root, 'version.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const code = parseInt(process.env.HK_VERSION_CODE || '0', 10) || 0;
const repo = process.env.GITHUB_REPOSITORY || 'JustPlanB/Home-Calculator';

const feed = {
  versionCode: code,
  versionName: pkg.version || base.versionName || '',
  notes: Array.isArray(base.notes) ? base.notes : [],
  stores: base.stores || {},
  /* critical: بروزرسانی ضروری — اپ تا نصب نسخهٔ جدید قفل می‌ماند (دکمهٔ «بعداً» ندارد)
     minVersionCode: هر نسخهٔ پایین‌تر از این عدد هم اجباری حساب می‌شود */
  critical: base.critical === true,
  minVersionCode: parseInt(base.minVersionCode, 10) || 0,
  apk: `https://github.com/${repo}/releases/latest/download/hesab-ketab.apk`,
  publishedAt: new Date().toISOString()
};
fs.writeFileSync(out, JSON.stringify(feed, null, 2) + '\n');
console.log('update feed:', JSON.stringify(feed));

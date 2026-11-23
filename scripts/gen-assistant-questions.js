// سند خوانای سؤال‌هایی که دستیار می‌فهمد، از روی tests/lib/assistant-corpus.js؛ اجرا: node scripts/gen-assistant-questions.js
'use strict';
const fs = require('fs'), path = require('path');
const { build } = require('../tests/lib/assistant-corpus');
const items = build();
const TITLE = {
  sum: 'جمع هزینه و درآمد', count: 'تعداد', cat: 'دسته‌ها', search: 'پیدا کردن', amount: 'مبلغ (بالا، زیر، بین)', max: 'بیشترین', min: 'کمترین', avg: 'میانگین',
  compare: 'مقایسه', group: 'گروه‌بندی', meta: 'دربارهٔ داده‌ها (دسته‌ها، حساب‌ها، پروژه‌ها، ماه‌ها)', insights: 'تحلیل و پیشنهاد', goal: 'هدف پس‌انداز', chat: 'گفتگوی عادی و درخواست تغییر', year: 'سال کوتاه (۴۰۳ ← ۱۴۰۳)'
};
const by = {}; items.forEach((i) => { (by[i.kind] = by[i.kind] || []).push(i); });
let md = '# سؤال‌هایی که دستیار می‌فهمد\n\nاین سند را `node scripts/gen-assistant-questions.js` از روی `tests/lib/assistant-corpus.js` می‌سازد؛ آزمون `batch-1426` همهٔ ' + items.length + ' سؤال را خودکار می‌سنجد. برای گسترش، عبارت یا نیت تازه به همان فایل اضافه کن.\n\n';
Object.keys(by).forEach((k) => {
  const list = by[k], seen = {}, pick = [];
  for (let i = 0; i < list.length && pick.length < 14; i += Math.max(1, Math.floor(list.length / 14))) { if (!seen[list[i].q]) { seen[list[i].q] = 1; pick.push(list[i].q); } }
  md += '## ' + (TITLE[k] || k) + ' (' + list.length + ' سؤال)\n' + pick.map((q) => '- ' + q).join('\n') + '\n\n';
});
fs.mkdirSync(path.join(__dirname, '..', 'docs'), { recursive: true });
fs.writeFileSync(path.join(__dirname, '..', 'docs', 'assistant-questions-fa.md'), md);
console.log('docs/assistant-questions-fa.md —', items.length, 'سؤال');

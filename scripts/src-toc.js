#!/usr/bin/env node
/* فهرست مطالب src/ (README-fa.md): برای هر بخش، شمار خط و سرفصل‌های بخش‌ها (توضیح‌های «=====» / «——») */
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const list = fs.readFileSync(path.join(root, 'src', 'parts.txt'), 'utf8').split('\n').filter(Boolean);
let out = '# بخش‌های index.html\n\n`index.html` از این فایل‌ها، به همین ترتیب، دقیقاً پشت‌سرهم ساخته می‌شود. ویرایش فقط در `src/`؛ بعد از هر تغییر:\n\n```\nnode scripts/assemble-index.js\nnode scripts/src-toc.js   # همین فهرست\n```\n\n';
for (const f of list) {
  const lines = fs.readFileSync(path.join(root, 'src', f), 'utf8').split('\n');
  out += '## `' + f + '` (' + lines.length + ' خط)\n';
  const heads = [];
  lines.forEach((l, i) => { const m = l.match(/^ {0,6}\/\*\s*(?:={3,}|——)\s*(.*?)\s*(?:={3,}|——)?\s*(?:\*\/)?$/); if (m && m[1] && m[1].length > 2) heads.push('- خط ' + (i + 1) + ': ' + m[1].replace(/\s*(={3,}|——)\s*$/, '').slice(0, 110)); });
  out += (heads.length ? heads.join('\n') : '- (سرفصل ندارد)') + '\n\n';
}
fs.writeFileSync(path.join(root, 'src', 'README-fa.md'), out);
console.log('src/README-fa.md');

#!/usr/bin/env node
/* ساخت نسخهٔ داخل APK از index.html (فقط کوچک‌سازی؛ بدون هیچ تغییر رفتاری یا ظاهری):
   - استایل‌ها: حذف توضیحات و یکی کردن فاصله‌های پشت‌سرهم؛ متن رشته‌ها و url(...) دست نمی‌خورد.
   - کد: terser فقط با حذف توضیحات و فاصله‌ها (compress و mangle خاموش ⇒ نام‌ها و ساختار کد همان می‌ماند).
   - بقیهٔ HTML بایت‌به‌بایت همان می‌ماند.
   فایل اصلی (index.html) همیشه منبع است و خوانا می‌ماند.
   استفاده: node scripts/build-web.js [ورودی=index.html] [خروجی=www/index.html] */
'use strict';
const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

const root = path.join(__dirname, '..');
const src = path.resolve(process.argv[2] || path.join(root, 'index.html'));
const dst = path.resolve(process.argv[3] || path.join(root, 'www', 'index.html'));

function minifyCss(css) {
  let out = '';
  let i = 0;
  const n = css.length;
  let pendingSpace = false;
  const push = (t) => {
    if (pendingSpace && out && !/[{};]$/.test(out) && !/^[{};]/.test(t)) out += ' ';
    pendingSpace = false;
    out += t;
  };
  while (i < n) {
    const c = css[i];
    if (c === '/' && css[i + 1] === '*') {
      const j = css.indexOf('*/', i + 2);
      if (j < 0) throw new Error('unterminated CSS comment at ' + i);
      i = j + 2;
      pendingSpace = true;
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && css[j] !== c) j += css[j] === '\\' ? 2 : 1;
      if (j >= n) throw new Error('unterminated CSS string at ' + i);
      push(css.slice(i, j + 1));
      i = j + 1;
      continue;
    }
    if ((c === 'u' || c === 'U') && /^url\(/i.test(css.slice(i, i + 4))) {
      // unquoted url(...) is kept verbatim (data URIs)
      let j = i + 4;
      while (j < n && /\s/.test(css[j])) j++;
      if (css[j] !== '"' && css[j] !== "'") {
        const k = css.indexOf(')', j);
        if (k < 0) throw new Error('unterminated url( at ' + i);
        push(css.slice(i, k + 1));
        i = k + 1;
        continue;
      }
    }
    if (/\s/.test(c)) {
      pendingSpace = true;
      i++;
      continue;
    }
    if (c === '{' || c === '}' || c === ';') {
      pendingSpace = false;
      out = out.replace(/ $/, '');
      out += c;
      i++;
      continue;
    }
    push(c);
    i++;
  }
  return out;
}

async function main() {
  const html = fs.readFileSync(src, 'utf8');
  // main stylesheet: the first <style> block in <head>
  const sOpen = html.indexOf('<style>');
  const sClose = html.indexOf('</style>', sOpen);
  if (sOpen < 0 || sClose < 0) throw new Error('main <style> not found');
  let built = html.slice(0, sOpen + 7) + minifyCss(html.slice(sOpen + 7, sClose)) + html.slice(sClose);

  // inline classic scripts without attributes other than plain <script>
  const re = /<script>([\s\S]*?)<\/script>/g;
  let m, parts = [], last = 0;
  while ((m = re.exec(built))) {
    const code = m[1];
    if (code.trim().length < 2000) continue; // tiny inline snippets stay as they are
    const r = await minify(code, {
      compress: false,
      mangle: false,
      module: false,
      toplevel: false,
      keep_classnames: true,
      keep_fnames: true,
      format: { comments: false, ascii_only: false, inline_script: true, semicolons: true },
    });
    if (!r.code) throw new Error('terser produced no output');
    parts.push(built.slice(last, m.index + 8), r.code);
    last = m.index + 8 + code.length;
  }
  parts.push(built.slice(last));
  built = parts.join('');
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.writeFileSync(dst, built);
  const a = Buffer.byteLength(html), b = Buffer.byteLength(built);
  console.log('build-web: ' + path.relative(root, src) + ' ' + a + ' bytes -> ' + path.relative(root, dst) + ' ' + b + ' bytes (' + Math.round((1 - b / a) * 100) + '% smaller)');
}

main().catch((e) => { console.error('build-web failed:', e && e.message ? e.message : e); process.exit(1); });

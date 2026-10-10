// اجراکنندهٔ تست‌ها: اول assertها (شکست واقعی)، بعد اسکریپت‌های رگرسیون به‌صورت smoke
// (اجرا تا انتها، کد خروج صفر، بدون خطای JS در صفحه). خروجی هر اسکریپت در out/ ذخیره می‌شود.
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const out = path.join(root, 'out');
fs.mkdirSync(out, { recursive: true });
const only = process.argv.slice(2);

function run(file) {
  const r = spawnSync(process.execPath, [file], { cwd: out, encoding: 'utf8', timeout: 180000, env: process.env });
  const log = (r.stdout || '') + (r.stderr || '');
  fs.writeFileSync(path.join(out, path.basename(file) + '.log'), log);
  return { code: r.status, signal: r.signal, log };
}

/* خطای JS واقعی: پیام pageerror که اسکریپت‌ها در آرایهٔ errs چاپ می‌کنند، یا استثنای خود اسکریپت */
const JS_ERR = /\b(TypeError|ReferenceError|SyntaxError|RangeError)\b|Uncaught|UnhandledPromiseRejection|Error: page\./;

const results = [];
const assertFiles = fs.readdirSync(path.join(root, 'assert')).filter(f => f.endsWith('.spec.js')).sort();
const regFiles = fs.readdirSync(path.join(root, 'regression')).filter(f => f.endsWith('.js')).sort();

for (const f of assertFiles) {
  if (only.length && !only.some(o => f.includes(o))) continue;
  const r = run(path.join(root, 'assert', f));
  process.stdout.write(r.log);
  results.push({ kind: 'assert', name: f, ok: r.code === 0, why: r.code === 0 ? '' : 'exit ' + r.code + (r.signal ? ' ' + r.signal : '') });
}
for (const f of regFiles) {
  if (only.length && !only.some(o => f.includes(o))) continue;
  const t0 = Date.now();
  const r = run(path.join(root, 'regression', f));
  const jsErr = JS_ERR.test(r.log);
  const ok = r.code === 0 && !jsErr;
  results.push({ kind: 'smoke', name: f, ok, why: ok ? '' : (r.code !== 0 ? 'exit ' + r.code + (r.signal ? ' ' + r.signal : '') : 'JS error in output') });
  console.log((ok ? 'PASS ' : 'FAIL ') + f + ' (' + Math.round((Date.now() - t0) / 1000) + 's)' + (ok ? '' : ' — ' + results[results.length - 1].why));
}

const bad = results.filter(r => !r.ok);
console.log('\n' + results.length + ' files: ' + (results.length - bad.length) + ' passed, ' + bad.length + ' failed');
bad.forEach(r => console.log('  ✗ [' + r.kind + '] ' + r.name + ': ' + r.why));
fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify(results, null, 1));
process.exit(bad.length ? 1 : 0);

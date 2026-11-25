// بانک دادهٔ دستیار (data/assistant-bank): طرح‌واره، ابزار/آرگومان‌های واقعی، عدد انتظار از fixture، جدا بودن train/dev/hard.
// فقط فایل‌ها را می‌خواند؛ هیچ دادهٔ برنامه‌ای یا مرورگری لازم نیست.
const { spawnSync } = require('child_process');
const path = require('path');
const r = spawnSync(process.execPath, [path.join(__dirname, '..', '..', 'scripts', 'assistant-bank-check.js')], { encoding: 'utf8' });
const out = (r.stdout || '') + (r.stderr || '');
process.stdout.write(out);
const m = out.match(/assistant-bank-check: (\d+) passed, (\d+) failed/);
const passed = m ? +m[1] : 0, failed = m ? +m[2] : 1;
console.log('assistant-bank: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed || r.status ? 1 : 0);

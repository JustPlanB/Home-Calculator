// ۱.۴.۳۸ — بانک گستردهٔ سؤال دستیار: همهٔ سؤال‌های پایه با لحن‌های واقعی (پیشوند/پسوند محاوره‌ای، حروف عربی، بی‌نیم‌فاصله،
// رقم لاتین) باید همان پاسخ را بدهند؛ و فهرست «سؤال‌هایی که نفهمیدم» فقط متن سؤال را روی گوشی نگه می‌دارد.
const { chromium } = require('playwright');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { buildWide } = require('../lib/assistant-corpus-wide.js');
const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(c, m) { if (c) { passed++; console.log('  ✓ ' + m); } else { failed++; console.log('  ✗ ' + m); } }
(async () => {
  const items = buildWide();
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 384, height: 750 }, timezoneId: 'Asia/Tehran' });
  await ctx.addInitScript(o => { for (const k in o) localStorage.setItem(k, o[k]); }, BASE_LS);
  const page = await ctx.newPage(); page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + (process.env.HK_INDEX ? path.resolve(process.env.HK_INDEX) : path.join(ROOT, 'index.html')));
  await page.waitForTimeout(1500);
  const R = await page.evaluate((items) => {
    const cy = currentYear, cm = currentMonth, pm = cm === 1 ? 12 : cm - 1, pmy = cm === 1 ? cy - 1 : cy;
    const R = v => v === '$cy' ? cy : v === '$cm' ? cm : v === '$py' ? cy - 1 : v === '$pm' ? pm : v === '$py_m' ? pmy : v;
    const N = x => String(x).replace(/[‌ ]/g, '').replace(/ي/g, 'ی').replace(/ك/g, 'ک');
    const fails = [];
    items.forEach(it => {
      let c; try { c = hkAsstParse(it.q); } catch (e) { fails.push(it.q + ' | throw'); return; }
      if (it.tool === 'ask') { if (!(c.ask && c.final)) fails.push(it.q + ' | ask→' + (c.tool || 'nonfinal')); return; }
      if (c.tool !== it.tool) { fails.push(it.q + ' | tool ' + c.tool); return; }
      for (const k of Object.keys(it.a)) {
        const want = R(it.a[k]), got = (c.args || {})[k]; let good;
        if (want === '*') good = got != null; else if (Array.isArray(want)) good = Array.isArray(got) && want.every(x => got.indexOf(x) >= 0); else good = N(got) === N(want);
        if (!good) { fails.push(it.q + ' | arg ' + k); return; }
      }
    });
    localStorage.removeItem(STORAGE_KEY + '_asstMissed');
    hkAsstAsk('زنبورک تاتی'); hkAsstAsk('سلام'); hkAsstAsk('اون چی شد؟ 1234567 و 9876543210');
    return { n: items.length, fails: fails.slice(0, 12), nf: fails.length, missed: hkAsstMissedList() };
  }, items);
  ok(R.n > 7000, 'بانک گسترده بیش از ۷٬۰۰۰ سؤال دارد (' + R.n + ')');
  ok(R.nf === 0, 'همهٔ سؤال‌ها درست تفسیر می‌شوند' + (R.nf ? ' — ' + R.nf + ' خطا: ' + R.fails.join(' || ') : ''));
  ok(R.missed.length >= 1 && R.missed.every(x => x.length <= 140 && !/\d{4,}/.test(x)), 'سؤال‌های نفهمیده فقط به‌صورت متن کوتاه و بی‌عدد بلند ذخیره می‌شوند');
  ok(!R.missed.some(x => x === 'سلام'), 'گفتگوی عادی در فهرست نفهمیده‌ها نیست');
  ok(errs.length === 0, 'بدون خطای صفحه ' + errs.join('|'));
  await b.close();
  console.log('batch-1429: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();

// ۱.۴.۳۷ — دستیار: فعل‌ها و ضمیرهای محاوره‌ای («هستن»، «براش ثبت شده») کلمهٔ جست‌وجو نمی‌شوند؛
// «دستهٔ X چند تراکنش دارد؟» تعداد تراکنش‌های همان دسته است؛ دکمهٔ شناور هنگام باز بودن چت پنهان است (تایپ کند نشود). فقط داده ساختگی.
const { chromium } = require('playwright');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(c, m) { if (c) { passed++; console.log('  ✓ ' + m); } else { failed++; console.log('  ✗ ' + m); } }
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 384, height: 750 }, timezoneId: 'Asia/Tehran', hasTouch: true });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, BASE_LS);
  const page = await ctx.newPage(); page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + (process.env.HK_INDEX ? path.resolve(process.env.HK_INDEX) : path.join(ROOT, 'index.html')));
  await page.waitForTimeout(1500);

  console.log('• کلمه‌های محاوره‌ای');
  const R = await page.evaluate(() => {
    const p = q => { const c = hkAsstParse(q); return { tool: c.tool || (c.ask ? 'ask' : ''), args: c.args || {}, explain: c.explain || '' }; };
    return {
      a: p('مخارج آبانم رو بگو چند تا هستن؟'), b: p('حمل و نقل چند تا تراکنش براش ثبت شده؟'), c: p('دسته حمل و نقل چند تراکنش داره؟'),
      d: p('دسته‌ها چی هستند؟'), e: p('چند تا دسته دارم؟'), f: p('بیمه تویوتا را پیدا کن'), g: p('ثبت نام را پیدا کن'), h: p('آذر چطوره؟')
    };
  });
  ok(R.a.tool === 'transactions.aggregate' && R.a.args.tab === 'expense' && R.a.args.month === 8 && !R.a.args.text, '«مخارج آبانم رو بگو چند تا هستن؟»: تعداد هزینه‌های آبان، بی کلمهٔ «هستن»');
  ok(R.b.tool === 'transactions.aggregate' && R.b.args.cats && R.b.args.cats.indexOf('transport') >= 0 && !R.b.args.text, '«حمل و نقل چند تا تراکنش براش ثبت شده؟»: تعداد دستهٔ حمل‌ونقل، بی «براش ثبت»');
  ok(/^transactions\.(aggregate|group)$/.test(R.c.tool) && R.c.args.cats && R.c.args.cats.indexOf('transport') >= 0, '«دسته حمل و نقل چند تراکنش داره؟»: تراکنش‌های همان دسته (تعداد یا گروه‌بندی)، نه فهرست دسته‌ها');
  ok(R.d.tool === 'categories.summary' && R.e.tool === 'categories.summary', '«دسته‌ها چی هستند؟» و «چند تا دسته دارم؟» هنوز فهرست دسته‌ها را می‌دهند');
  ok(R.f.tool === 'transactions.search' && R.f.args.text === 'بیمه تویوتا', 'جست‌وجوی «بیمه تویوتا» مثل قبل است');
  ok(R.g.tool === 'transactions.search' && R.g.args.text === 'ثبت نام', '«ثبت نام» (کلمهٔ واقعی) جست‌وجو می‌شود');

  console.log('• دکمهٔ شناور و چت');
  const F = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const fab = document.querySelector('.hk-asst-fab'), vis = () => getComputedStyle(fab).display !== 'none';
    const o = { before: vis() };
    hkAsstOpen(); await w(100); o.open = vis(); o.cls = document.body.classList.contains('hk-asst-open');
    hkAsstClose(); await w(100); o.after = vis(); o.cls2 = document.body.classList.contains('hk-asst-open');
    return o;
  });
  ok(F.before === true && F.open === false && F.cls === true, 'با باز شدن چت، دکمهٔ شناورِ متحرک پنهان می‌شود (رسم بی‌جهت و کندی تایپ)');
  ok(F.after === true && F.cls2 === false, 'با بستن چت، دکمه برمی‌گردد');
  ok(errs.length === 0, 'خطای اسکریپت ندارد ' + errs.join(' | '));
  await b.close();
  console.log('batch-1425: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();

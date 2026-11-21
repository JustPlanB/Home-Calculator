// ۱.۴.۱۷ — رابطهٔ قرض: شروع بالای جدول ثابت فارغ از تعداد ردیف؛ ویجت تراکنش: سرستون هم‌عرض جدول با چهار گوشهٔ گرد؛ پنجرهٔ پیش‌نمایش کوتاه‌تر
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const INDEX = require('../lib/index-url');
const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(c, m) { if (c) { passed++; console.log('  ✓ ' + m); } else { failed++; console.log('  ✗ ' + m); } }
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 384, height: 750 }, timezoneId: 'Asia/Tehran', hasTouch: true });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, BASE_LS);
  const page = await ctx.newPage(); page.on('pageerror', e => errs.push(e.message));
  await page.goto(INDEX); await page.waitForTimeout(2000);
  console.log('• رابطهٔ قرض');
  const T = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)); const o = {};
    const led = ensureLedger();
    const mk = n => { const rows = []; for (let i = 0; i < n; i++) rows.push(Object.assign(emptyLedgerRow(), { day: String(1 + (i % 28)), desc: 'ردیف ' + i, amount: 10000 * (i + 1), ly: currentYear, lm: currentMonth })); return rows; };
    const top = async n => {
      led.sections = [{ id: 'S1', personA: 'من', personB: 'علی', collapsed: false, rows: mk(n) }];
      persistCurrent(); touchLocal(); await saveArchive();
      closeFeatureSheet && 0;
      openFeatureSheet('ledger'); await w(700);
      document.querySelector('#sections-ledger .section > .section-header').click(); await w(1200);
      const sec = document.querySelector('#sections-ledger .section.hk-lrel'); const r = sec.getBoundingClientRect();
      const out = { top: Math.round(r.top * 10) / 10, bottom: Math.round(r.bottom * 10) / 10 };
      document.querySelector('#featureSheet .hk-pg-back, #featureSheet .feature-sheet-close')?.click(); await w(500);
      return out;
    };
    o.t3 = await top(3); o.t30 = await top(30);
    return o;
  });
  ok(Math.abs(T.t3.top - T.t30.top) <= 1, 'جدول با ۳ ردیف و با ۳۰ ردیف از یک نقطهٔ بالا شروع می‌شود (' + T.t3.top + ' و ' + T.t30.top + ')');
  console.log('• ویجت');
  const rd = f => fs.readFileSync(path.join(__dirname, '../../' + f), 'utf8');
  const tx = rd('android-src/HkWidgetTxProvider.java'), st = rd('android-src/HkWidgetStyle.java');
  ok(/cv\.translate\(0, ti\);/.test(tx) && !/clipP/.test(tx) && !/drawRect\(c\[4\], th, c\[0\]/.test(tx), 'سرستون ویجت تراکنش: بی باکس جدا روی باکس اصلی (۱.۴.۱۸)');
  const dr = rd('android-src/HkWidgetDraw.java');
  ok(/cv\.drawText\(ps, padX, cy/.test(dr) && /cv\.drawText\(v, W-padX, cy/.test(dr), 'ویجت تک‌خطی: درصد چپ، مانده راست (جابه‌جا شد)');
  ok(/heightPixels\*0\.29f/.test(st), 'پنجرهٔ پیش‌نمایش ۲۹٪ ارتفاع صفحه (هم‌اندازهٔ موزیک)');
  ok(errs.length === 0, 'خطای اسکریپت ندارد ' + errs.join('|').slice(0, 100));
  console.log('batch-1415: ' + passed + ' passed, ' + failed + ' failed');
  await b.close(); process.exit(failed ? 1 : 0);
})();

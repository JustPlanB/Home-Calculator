// ۱.۴.۸ — قرض: کارت رابطه (بی کشو، زیرنویس نارنجی، اشتراک‌گذاری) و صفحهٔ جدای هر رابطه
const { chromium } = require('playwright');
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
  await page.evaluate(async () => {
    const led = ensureLedger();
    led.sections = [{ id: 'A', personA: 'من', personB: 'علی', collapsed: true, rows: [Object.assign(emptyLedgerRow(), { day: '1', desc: 'شام', amount: 250000, ly: currentYear, lm: currentMonth })] }, { id: 'B', personA: 'من', personB: 'رضا', collapsed: true, rows: [] }];
    persistCurrent(); openFeatureSheet('ledger'); await new Promise(r => setTimeout(r, 1500));
  });
  const L = await page.evaluate(() => {
    const s = document.querySelector('#sections-ledger .section'), vis = q => { const e = s.querySelector(q); return !!e && getComputedStyle(e).display !== 'none' && e.getClientRects().length > 0; };
    return { sub: s.querySelector('.hk-led-sub').textContent, col: getComputedStyle(s.querySelector('.hk-led-sub')).color, arrow: vis('.collapse-arrow'), body: s.querySelector('.section-body').getBoundingClientRect().height > 2, shr: vis('.hk-led-shr'), sum: !!document.querySelector('#featureSheet .ledger-summary') && getComputedStyle(document.querySelector('#featureSheet .ledger-summary')).display !== 'none' };
  });
  ok(/^علی به من مبلغ .* تومان بدهکار است$/.test(L.sub), 'زیرنویس رابطه: ' + L.sub);
  ok(L.col === 'rgb(255, 159, 10)', 'زیرنویس نارنجی');
  ok(!L.arrow && !L.body && L.shr && !L.sum, 'بی فلش، بی کشو، دکمهٔ اشتراک‌گذاری هست، جدول خلاصه نیست');
  await page.tap('#sections-ledger .section[data-sec-id="A"] .section-header');
  await page.waitForTimeout(1200);
  const R = await page.evaluate(() => ({ rel: document.getElementById('featureSheet').classList.contains('hk-led-rel'), rows: document.querySelectorAll('#sections-ledger .section.hk-lrel tbody tr').length, others: [...document.querySelectorAll('#sections-ledger .section:not(.hk-lrel)')].every(e => getComputedStyle(e).display === 'none'), fab: !!document.querySelector('#featureSheet > .hk-fab'), hint: !!document.querySelector('.hk-lrel-hint') }));
  ok(R.rel && R.rows >= 1 && R.others && R.fab && R.hint, 'صفحهٔ رابطه: جدول، مربع افزودن و راهنما، بقیهٔ روابط پنهان');
  await page.evaluate(() => onBackGuard()); await page.waitForTimeout(900);
  const B = await page.evaluate(() => ({ rel: document.getElementById('featureSheet').classList.contains('hk-led-rel'), open: document.getElementById('featureSheet').classList.contains('open'), n: [...document.querySelectorAll('#sections-ledger .section')].filter(e => e.getClientRects().length).length }));
  ok(!B.rel && B.open && B.n === 2, 'بک: برگشت به فهرست روابط (صفحهٔ قرض باز می‌ماند)');
  ok(errs.length === 0, 'بدون خطای JS' + (errs.length ? ': ' + errs[0] : ''));
  await b.close(); console.log('batch-1408: ' + passed + ' passed, ' + failed + ' failed'); process.exit(failed ? 1 : 0);
})();

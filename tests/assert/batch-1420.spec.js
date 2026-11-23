// ۱.۴.۲۳ — شناسهٔ ردیف‌ها در هر ذخیره: ردیف بی‌شناسه (مثلاً از بکاپ قدیمی) بی‌شناسه نمی‌ماند؛ شناسه پایدار است؛ دستیار/کاربر جدید هم.
// فقط داده ساختگی.
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
  await page.goto(INDEX); await page.waitForTimeout(1800);
  const R = await page.evaluate(() => {
    const o = {};
    const cur = periodKey(currentYear, currentMonth);
    const mk = (tag) => { const pd = emptyPeriodData(); pd.expense.sections = [{ id: 'S1', title: 'T', rows: [{ day: '1', desc: tag, amount: 1, status: 'paid' }] }]; pd.income.sections = [{ id: 'I1', title: 'T', rows: [{ day: '2', desc: tag + 'i', amount: 2 }] }]; return pd; };
    // بکاپ قدیمی: ماه جاری و یک ماه قبل، همه بی‌شناسه
    periodData = mk('cur'); archive = { '1404-6': mk('old') }; archive[cur] = JSON.parse(JSON.stringify(periodData));
    getBundle();
    const idsOf = pd => pd.expense.sections[0].rows.concat(pd.income.sections[0].rows).map(r => r.id);
    const first = idsOf(periodData), oldIds = idsOf(archive['1404-6']), curArc = idsOf(archive[cur]);
    o.curHasIds = first.every(x => /^r_/.test(x));
    o.oldHasIds = oldIds.every(x => /^r_/.test(x));
    o.curArchiveSame = JSON.stringify(curArc) === JSON.stringify(first);
    // ذخیره‌های بعدی: شناسه‌ها ثابت می‌مانند
    getBundle(); getBundle();
    o.stable = JSON.stringify(idsOf(periodData)) === JSON.stringify(first) && JSON.stringify(idsOf(archive['1404-6'])) === JSON.stringify(oldIds);
    // ردیف تازهٔ بی‌شناسه در ماه جاری هنگام ذخیره شناسه می‌گیرد
    periodData.expense.sections[0].rows.push(emptyRow('expense'));
    getBundle();
    const last = periodData.expense.sections[0].rows[periodData.expense.sections[0].rows.length - 1];
    o.newRowGetsId = /^r_/.test(last.id || '');
    return o;
  });
  console.log(JSON.stringify(R));
  ok(R.curHasIds, 'بکاپ بی‌شناسه: ردیف‌های ماه جاری در ذخیره شناسه گرفتند');
  ok(R.oldHasIds, 'بکاپ بی‌شناسه: ردیف‌های ماه قبل هم شناسه گرفتند');
  ok(R.curArchiveSame, 'نسخهٔ آرشیو ماه جاری همان شناسه‌های periodData را دارد');
  ok(R.stable, 'ذخیره‌های بعدی شناسه‌ها را عوض نمی‌کنند');
  ok(R.newRowGetsId, 'ردیف تازهٔ بی‌شناسه در ذخیرهٔ بعدی شناسه می‌گیرد');
  ok(errs.length === 0, 'خطای صفحه نداریم' + (errs.length ? ': ' + errs[0] : ''));
  await b.close();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

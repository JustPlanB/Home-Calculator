// ۱.۴.۴: توضیح بالای صفحه (که به ⓘ می‌رود) نباید هر فریم پنهان/آشکار شود — گزارش اشکال: صفحهٔ یادآور و
// «دسته‌بندی برداشت» (از اسلاید) بعد از برگشت از انتخاب دسته، ۴۸px بالا و پایین می‌پرید. فقط دادهٔ مصنوعی.
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');
const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const allErrors = [];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 384, height: 750 }, timezoneId: 'Asia/Tehran', hasTouch: true });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, BASE_LS);
  const page = await ctx.newPage();
  page.on('pageerror', e => allErrors.push(e.message));
  await page.goto(INDEX); await page.waitForTimeout(2200);

  console.log('• دسته‌بندی برداشت: انتخاب دسته ← برگشت');
  const A = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const t = hkMainTitle(), ex = periodData.expense.sections.find(q => q.title === t);
    ex.rows = [Object.assign(emptyRow('expense'), { day: '2', desc: 'نان', amount: 30000, status: 'paid' }), Object.assign(emptyRow('expense'), { day: '3', desc: 'تاکسی', amount: 50000, status: 'paid' })];
    persistCurrent(); renderAll();
    openCategoryReviewSheet(t); await w(900);
    const box = document.querySelector('.sp-cat-sheet .modal-box');
    document.querySelector('.sp-cat-sheet .sp-cat-row').click(); await w(700);
    onBackGuard(); await w(700);
    let n = 0; const mo = new MutationObserver(ms => { n += ms.length; });
    mo.observe(box, { subtree: true, childList: true, attributes: true, characterData: true });
    const tops = new Set();
    for (let i = 0; i < 30; i++) { tops.add(Math.round(box.querySelector('.sp-cat-row').getBoundingClientRect().top)); await new Promise(r => requestAnimationFrame(r)); }
    mo.disconnect();
    const hid = box.querySelector('.hk-pg-intro-hid'), ib = box.querySelector('.hk-pg-hd .hk-info-btn');
    const out = { tops: tops.size, n, intro: !!(hid && ib) };
    onBackGuard(); await w(500);
    return out;
  });
  ok(A.tops === 1 && A.n === 0, 'بعد از برگشت هیچ چیز صفحه تکان نمی‌خورد (' + A.tops + ' جا، ' + A.n + ' تغییر)');
  ok(A.intro, 'توضیح همچنان در ⓘ کنار نام است');

  console.log('• یادآور: صفحه ثابت');
  const R = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    openUserRemindersModal(); await w(1200);
    const l = document.getElementById('userRemindersList'), tops = new Set();
    for (let i = 0; i < 30; i++) { tops.add(Math.round(l.getBoundingClientRect().top)); await new Promise(r => requestAnimationFrame(r)); }
    onBackGuard(); await w(500);
    return { tops: tops.size };
  });
  ok(R.tops === 1, 'فهرست یادآورها و فیلد «یادآور جدید» سر جایشان ثابت');
  ok(!allErrors.length, 'بدون خطای صفحه' + (allErrors.length ? ': ' + allErrors[0] : ''));
  await b.close();
  console.log('batch-1404: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();

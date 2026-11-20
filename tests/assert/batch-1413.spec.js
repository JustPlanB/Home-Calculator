// ۱.۴.۱۴ — دکمهٔ شیرِ باکس‌ها = همان خروجی PDF منوی گزارش‌ها (برای همان مورد، کل بازه)؛ جدول رابطهٔ قرض وسط صفحه
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
  const R = await page.evaluate(async () => {
    const t = hkMainTitle(), out = {};
    const l = loadFinancialSubjects(); l.push({ id: 'pj1', name: 'ساختمان آسمان', highlightColor: nextProjectHighlightColor(l) }); _financialSubjects = l; saveFinancialSubjects();
    const sec = findSectionByTitle('expense', t), fc = defaultFinancialContext(); fc.classification = 'third_party'; fc.accountType = 'project'; fc.subjectId = 'pj1'; fc.subjectName = 'ساختمان آسمان'; fc.fundingSource = 'subject';
    sec.rows = [Object.assign(emptyRow('expense'), { status: 'paid', day: '3', desc: 'سیمان', amount: 500000, financialContext: fc })]; persistCurrent();
    const grab = async (key, only, recId) => {
      const orig = exportPdf; window.__capt = '';
      exportPdf = async function () { window.__capt = (_hkRecArc ? hkRecArcPdfBlocks() : buildPdfBlocks()).map(x => x.html).join(''); };
      try { await hkShareExportPdf(key, only, recId); } finally { exportPdf = orig; }
      return window.__capt;
    };
    out.proj = await grab('projects', { projects: ['pj1'] }); out.projOther = await grab('projects', { projects: ['zzz'] });
    ensureLedger().sections = [{ id: 'A', personA: 'من', personB: 'علی', collapsed: true, rows: [Object.assign(emptyLedgerRow(), { day: '1', desc: 'x', amount: 1000, ly: currentYear, lm: currentMonth })] }, { id: 'B', personA: 'من', personB: 'رضا', collapsed: true, rows: [Object.assign(emptyLedgerRow(), { day: '1', desc: 'y', amount: 2000, ly: currentYear, lm: currentMonth })] }]; persistCurrent();
    out.led = await grab('ledger', { ledger: ['B'] });
    recurringIncomes.push({ id: 'rX', name: 'اجاره', amount: 1000000, deposit: 0, day: '5', account: '', contractStart: { d: 1, m: 1, y: 1405 }, contractEnd: null, fromKey: 140505, genKey: 140504, sectionTitle: t }); saveRecurring(); ensureRecurringRows({ render: false, toast: false });
    out.rec = await grab('recurring', null, 'rX');
    return { projHas: /ساختمان آسمان/.test(out.proj) && /سیمان/.test(out.proj), projOtherHas: /ساختمان آسمان/.test(out.projOther), ledHas: /رضا/.test(out.led) && !/علی/.test(out.led), recHas: /آرشیو درآمدهای ثابت/.test(out.rec) && /اجاره/.test(out.rec) && /بابت/.test(out.rec) };
  });
  ok(R.projHas && !R.projOtherHas && R.ledHas && R.recHas, 'شیرِ باکس: PDF همان خروجی منوی گزارش‌ها، فقط همان مورد (' + JSON.stringify(R) + ')');
  /* «عکس» شیر: همان صفحه‌های همان PDF در یک PNG */
  const I = await page.evaluate(async () => {
    let got = null; navigator.canShare = () => true; navigator.share = (o) => { got = o.files && o.files[0] && { t: o.files[0].type, s: o.files[0].size }; return Promise.resolve(); };
    await hkShareExportImage('recurring', null, 'rX', 'درآمد ثابت اجاره'); await new Promise(r => setTimeout(r, 400));
    return got;
  });
  ok(I && I.t === 'image/png' && I.s > 20000, 'شیرِ «عکس»: همان خروجی PDF به‌صورت PNG (' + JSON.stringify(I) + ')');
  /* جدول رابطهٔ قرض با چند ردیف: وسط عمودی صفحه */
  const C = await page.evaluate(async () => {
    openFeatureSheet('ledger'); await new Promise(r => setTimeout(r, 1000)); hkLedOpenRel('A'); await new Promise(r => setTimeout(r, 1500));
    const s = document.querySelector('.section.hk-lrel').getBoundingClientRect(), bar = document.querySelector('#featureSheet > .feature-sheet-bar').getBoundingClientRect();
    const top = s.top - bar.bottom, bottom = innerHeight - s.bottom;
    return { top: Math.round(top), bottom: Math.round(bottom) };
  });
  ok(C.top >= 14 && C.top <= 60, 'جدول رابطه: شروع ثابت از بالا فارغ از تعداد ردیف (۱.۴.۱۷؛ فاصله بالا ' + C.top + ')');
  /* عرض: خالیِ چپ و راست برابر؛ خط ردیف آخر فقط در ته جدول */
  const H = await page.evaluate(async () => {
    const led = ensureLedger(); led.sections = [{ id: 'Z', personA: 'من', personB: 'ملی', collapsed: true, rows: Array.from({ length: 30 }, (_, i) => Object.assign(emptyLedgerRow(), { day: String(1 + i % 28), desc: 'ردیف ' + i, amount: 1000 * (i + 1), ly: currentYear, lm: currentMonth })) }]; persistCurrent();
    renderLedgerTab(); hkLedOpenRel('Z'); await new Promise(r => setTimeout(r, 1600));
    const sec = document.querySelector('.section.hk-lrel'), s = sec.getBoundingClientRect(), body = sec.querySelector('.section-body'), hint = sec.querySelector('.hk-lrel-hint');
    const out = { L: Math.round(s.left), R: Math.round(innerWidth - s.right), top: getComputedStyle(hint).borderTopColor, endBefore: sec.classList.contains('hk-at-end'), bottom: Math.round(s.bottom) };
    body.scrollTop = body.scrollHeight; await new Promise(r => setTimeout(r, 300));
    out.endAfter = sec.classList.contains('hk-at-end'); out.topAfter = getComputedStyle(hint).borderTopColor;
    return out;
  });
  ok(H.L === H.R && !H.endBefore && H.endAfter && H.top !== H.topAfter && H.bottom < 750 - 60, 'جدول رابطه: خالیِ چپ و راست برابر (' + H.L + '/' + H.R + ')؛ خط ردیف آخر فقط در ته جدول؛ پایین تا نزدیک مربع افزودن (' + H.bottom + ')');
  ok(errs.length === 0, 'بدون خطای JS' + (errs.length ? ': ' + errs[0] : ''));
  await b.close(); console.log('batch-1413: ' + passed + ' passed, ' + failed + ' failed'); process.exit(failed ? 1 : 0);
})();

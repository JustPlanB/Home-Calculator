// ۱.۴.۱۳ — آیکون دُنگ، جمع جستجو با روز، مداد پروژه‌ها، خروجی درآمد ثابت (جدول آرشیو) و قرض (ردیف منفی)
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
  /* آیکون‌های دُنگ داخل باکس */
  const D = await page.evaluate(async () => {
    hkDongSave({ groups: [{ id: 'g1', name: 'سفر', members: [{ id: 'a', name: 'علی' }, { id: 'b', name: 'رضا' }], expenses: [], settles: [] }] });
    openDongModal(); await new Promise(r => setTimeout(r, 1300));
    const c = document.querySelector('#hkDong .hk-dg-card'), r = c.getBoundingClientRect();
    return [...c.querySelectorAll('.hk-dg-cacts > button')].map(b => { const q = b.getBoundingClientRect(); return q.top >= r.top && q.bottom <= r.bottom && q.left >= r.left; });
  });
  ok(D.length === 3 && D.every(Boolean), 'دُنگ: سه آیکون کامل داخل باکس');
  await page.evaluate(() => { for (let i = 0; i < 3; i++) onBackGuard(); }); await page.waitForTimeout(500);
  /* مداد پروژه‌ها خاکستری */
  const P = await page.evaluate(async () => {
    const l = loadFinancialSubjects(); l.push({ id: 'pj1', name: 'ساختمان', highlightColor: nextProjectHighlightColor(l) }); _financialSubjects = l; saveFinancialSubjects();
    openSubjectsModal(); await new Promise(r => setTimeout(r, 1200));
    const sv = document.querySelector('#subjectsList .btn-edit-title svg'); return getComputedStyle(sv).stroke;
  });
  ok(P === 'rgb(152, 152, 159)', 'پروژه‌ها: مداد ویرایش هم‌رنگ بقیه (' + P + ')');
  await page.evaluate(() => { for (let i = 0; i < 3; i++) onBackGuard(); }); await page.waitForTimeout(500);
  /* خروجی قرض: ردیف منفی */
  const X = await page.evaluate(async () => {
    const led = ensureLedger();
    led.sections = [{ id: 'A', personA: 'من', personB: 'علی', collapsed: true, rows: [Object.assign(emptyLedgerRow(), { day: '1', desc: 'بدهی', amount: 5000, status: 'debt', ly: currentYear, lm: currentMonth }), Object.assign(emptyLedgerRow(), { day: '2', desc: 'برگشت', amount: 2000, status: 'credit', ly: currentYear, lm: currentMonth })] }];
    persistCurrent();
    _hkExportOpts = { range: 'month', user: '', sections: { ledger: true } };
    let pdf = '', sh = null;
    try { pdf = buildPdfBlocks().map(x => x.html).join(''); sh = buildXlsxSheets().sheets.find(s => s.name === 'قرض'); } catch (e) { pdf = 'ERR ' + e.message; }
    _hkExportOpts = null;
    const row = sh && sh.rows.find(r => r[3] && r[3].v === 'برگشت'), row2 = sh && sh.rows.find(r => r[3] && r[3].v === 'بدهی');
    return { grey: /background:#dfe2e7/.test(pdf), minus: /−[^<]*2,?000|−۲,۰۰۰|−۲٬۰۰۰/.test(pdf) || /−/.test(pdf), xs: row && row[6].v, xst: row && row[6].s, xs2: row2 && row2[6].s };
  });
  ok(X.grey && X.minus && X.xs === -2000 && X.xst === 9 && X.xs2 === 3, 'خروجی قرض: ردیف منفی هایلایت طوسی (PDF و اکسل) با علامت منفی (' + JSON.stringify(X) + ')');
  /* خروجی درآمد ثابت: ستون‌های جدول آرشیو و تاریخ کامل */
  const R = await page.evaluate(async () => {
    recurringIncomes.push({ id: 'r9', name: 'اجاره', amount: 1000000, deposit: 0, day: '5', account: '', contractStart: { d: 1, m: 1, y: 1405 }, contractEnd: null, fromKey: 140505, genKey: 140504, sectionTitle: hkMainTitle() }); saveRecurring();
    ensureRecurringRows({ render: false, toast: false });
    const it = recurringIncomes.filter(r => r.id === 'r9')[0], rr = recArchiveRows(it);
    if (rr[0]) { rr[0].row.status = 'paid'; rr[0].row.time = '10:20'; rr[0].row.account = 'ملت'; rr[0].row.day = '7'; }
    _hkRecArc = { ids: { r9: true }, keys: null };
    const sh = hkRecArcSheets()[0].rows;
    return { head: sh[2].map(c => c.v).join('|'), paid: ((sh.find(r => r[0] && r[0].v === 'اجاره' && r[2] && /۱۴۰۵/.test(r[2].v)) || [])[2] || {}).v, status: sh.slice(3, 12).map(r => r[4] && r[4].v).filter(Boolean) };
  });
  ok(/^درآمد ثابت\|بابت\|تاریخ تراکنش/.test(R.head) && /۱۴۰۵\/[۰-۹]{2}\/[۰-۹]{2} {2}· /.test(R.paid || '') && R.status.some(s => /پیدا نشد|در انتظار|دریافت/.test(s || '')), 'خروجی درآمد ثابت: ستون‌های جدول آرشیو، تاریخ کامل شمسی و میلادی، وضعیت هر ماه (' + JSON.stringify(R) + ')');
  /* جستجو: با روز مشخص «جمع … (n مورد)»، فقط ماه بدون روز «… کل <ماه>» */
  const Q = await page.evaluate(async () => {
    const t = hkMainTitle(), sec = findSectionByTitle('income', t);
    sec.rows = [1, 2, 3].map(i => Object.assign(emptyRow('income'), { status: 'paid', day: '5', desc: 'حقوق ' + i, amount: 1000 * i }));
    persistCurrent();
    const inp = document.getElementById('balanceSearchInput'), rg = document.getElementById('balanceSearchRange'), dd = document.getElementById('balanceDayFilter');
    if (!inp || !rg) return null;
    inp.value = 'حقوق'; rg.value = String(currentMonth); if (dd) dd.value = '';
    renderBalanceSearch(); const noDay = (document.querySelector('#searchResultBox tfoot, #searchResultFoot') || document.getElementById('searchResultBox')).innerText;
    if (dd) dd.value = '5'; renderBalanceSearch(); const withDay = (document.querySelector('#searchResultBox tfoot, #searchResultFoot') || document.getElementById('searchResultBox')).innerText;
    return { noDay: /درآمد کل/.test(noDay), withDay: /جمع درآمد \([^)]*مورد\)/.test(withDay) && !/درآمد کل/.test(withDay) };
  });
  ok(Q && Q.noDay && Q.withDay, 'جستجو: ماه = «درآمد کل ماه»؛ روز مشخص = «جمع درآمد (n مورد)» (' + JSON.stringify(Q) + ')');
  ok(errs.length === 0, 'بدون خطای JS' + (errs.length ? ': ' + errs[0] : ''));
  await b.close(); console.log('batch-1412: ' + passed + ' passed, ' + failed + ' failed'); process.exit(failed ? 1 : 0);
})();

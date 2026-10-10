const { chromium } = require('playwright');
(async () => {
  const [w, h, out] = [+process.argv[2] || 412, +process.argv[3] || 860, process.argv[4] || 'v5'];
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => { localStorage.setItem('hesabKetabArchive_v5_bankSetupDone', '1'); localStorage.setItem('hesabKetabArchive_v5_cardSwipeHintDone','1');localStorage.setItem('hesabKetabArchive_v5_tourDone','1'); });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
  const toasts = [];
  await p.exposeFunction('__toast', t => toasts.push(t));
  await p.goto(require('../lib/index-url'));
  await p.waitForTimeout(3000);
  const info = await p.evaluate(() => {
    const _st = showToast; showToast = function (m) { window.__toast(String(m)); return _st.apply(this, arguments); };
    const t = allPersonTitles()[0];
    const inc = findSectionByTitle('income', t), exp = findSectionByTitle('expense', t);
    let n = 0;
    const R = (day, desc, amount, status, extra) => Object.assign(emptyRow('expense'), { id: 'r' + (n++), day: String(day), desc, amount, status: status || 'paid' }, extra || {});
    loadFinancialSubjects(); _financialSubjects.push({ id: 's1', name: 'طراحی سایت', highlightColor: 'a' }); saveFinancialSubjects();
    const PJ = (amt) => ({ financialContext: { classification: 'third_party', accountType: 'project', subjectId: 's1', subjectName: 'طراحی سایت', fundingSource: 'subject', projectAmount: amt, personalAdvanceAmount: 0 } });
    inc.rows = [R(1, 'حقوق', 48000000), R(15, 'پروژه طراحی', 12000000, 'unpaid'), R(3, 'پیش پرداخت سایت', 10000000, 'paid', PJ(10000000))];
    const today = getTodayPersian();
    const d = Math.max(3, Math.min(today.d, 26));
    exp.rows = [R(2, 'پیتزا با دوستان', 1800000), R(2, 'لواشک و کیسه زباله', 300000), R(3, 'بنزین', 900000), R(5, 'اسنپ', 350000), R(d, 'خرید فروشگاه', 1250000), R(d, 'خرید فروشگاه', 1250000), R(4, 'سوپرمارکت', 2600000), R(d - 1, 'رستوران', 2100000), R(1, 'خرید مبل', 14000000), R(2, 'هاست سایت', 14000000, 'paid', PJ(14000000))];
    const mkPrev = (k, rows) => { let y = currentYear, m = currentMonth; for (let i = 0; i < k; i++) { const pp = prevYearMonth(y, m); y = pp.y; m = pp.m; } archive[periodKey(y, m)] = { income: { sections: [{ title: t, rows: [R(1, 'حقوق', 45000000)] }] }, expense: { sections: [{ title: t, rows }] } }; };
    for (let k = 1; k <= 3; k++) mkPrev(k, [R(2, 'رستوران', 900000), R(3, 'بنزین', 800000), R(4, 'سوپرمارکت', 1200000), R(5, 'اسنپ', 300000), R(6, 'قبض برق', 500000), R(1, 'اجاره', 15000000)]);
    HKCategorizer.learn('لواشک و کیسه زباله', ['food', 'home']);
    renderHomeCards();
    const el = document.querySelector('#homeCards .pc-smart-box');
    return { pages: el._spPages.map(x => x.key), alerts: HKAlerts.forCard(t).map(a => a.type + ' | ' + a.title + ' | ' + a.text) };
  });
  console.log(JSON.stringify(info, null, 1));
  const n = info.pages.length;
  await p.evaluate(() => { const el = document.querySelector('#homeCards .pc-smart-box'); while (el._spIdx !== 0) smartPanelGo(el, 1); });
  for (let i = 0; i < n; i++) {
    await p.waitForTimeout(1200);
    await p.locator('#homeCards .pc-smart-box').first().screenshot({ path: out + '-' + i + '.png' });
    await p.evaluate(() => smartPanelGo(document.querySelector('#homeCards .pc-smart-box'), 1));
  }
  const pc = await p.evaluate(() => { const D = spCollect(allPersonTitles()[0]); return { items: D.cats.items.map(x => x.label + ' ' + x.pct), sum: D.cats.items.reduce((a, x) => a + x.pct, 0), insight: spInsights(D).map(x => x.t) }; });
  await p.screenshot({ path: out + '-full.png' });
  // reload: toast must not repeat
  await p.reload(); await p.waitForTimeout(3000);
  console.log(JSON.stringify({ pc, toasts, errs }, null, 1));
  await b.close();
})();

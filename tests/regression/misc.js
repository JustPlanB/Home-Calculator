const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 412, height: 860 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { localStorage.setItem('hesabKetabArchive_v5_bankSetupDone', '1'); localStorage.setItem('hesabKetabArchive_v5_cardSwipeHintDone','1');localStorage.setItem('hesabKetabArchive_v5_tourDone','1'); });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(require('../lib/index-url')); await p.waitForTimeout(2500);
  const r = {};
  r.ob = await p.evaluate(async () => {
    const t = allPersonTitles()[0]; const today = getTodayPersian();
    plans.push({ id: 'pa', name: 'وام الف', amount: 6000000, interestRate: 0, count: 6, paidCount: 0, startYear: today.y, startMonth: today.m, startDay: Math.min(28, today.d + 4), expenseSectionTitle: t });
    plans.push({ id: 'pb', name: 'وام ب', amount: 6000000, interestRate: 0, count: 6, paidCount: 0, startYear: today.y, startMonth: today.m, startDay: Math.min(28, today.d + 4), expenseSectionTitle: t });
    let n=0; const R=(d,s,a,st)=>Object.assign(emptyRow('expense'),{id:'q'+(n++),day:String(d),desc:s,amount:a,status:st||'paid'});
    findSectionByTitle('income',t).rows=[R(1,'حقوق',2000000)]; findSectionByTitle('expense',t).rows=[R(1,'اجاره',7000000)];
    renderHomeCards(); const el=document.querySelector('#homeSmartBox .pc-smart-box');
    /* ۱.۳.۴۷: اسلاید تعهدات (اقساط) برداشته شد */ for (let g=0; g<20 && el._spPages[el._spIdx].key!=='ledger'; g++) smartPanelGo(el,1);
    await new Promise(r=>setTimeout(r,600));
    return [...document.querySelectorAll('.sp-page:not(.sp-out) .sp-row .sp-l')].map(x=>x.textContent);
  });
  await p.locator('#homeSmartBox .pc-smart-box').first().screenshot({ path: 'ob2.png' });
  await p.evaluate(async () => { const el=document.querySelector('#homeSmartBox .pc-smart-box'); while (el._spPages[el._spIdx].key!=='overview') smartPanelGo(el,1); });
  await p.waitForTimeout(1800);
  await p.locator('#homeSmartBox .pc-smart-box').first().screenshot({ path: 'ov-neg.png' });
  /* از ۱.۳.۴۶ تک‌کاربره: کارت تازه ساخته نمی‌شود؛ نوار جابه‌جایی کارت‌ها دیگر معنا ندارد */
  console.log(JSON.stringify(r), errs); await b.close();
})();

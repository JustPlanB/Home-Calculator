const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 } });
  await ctx.addInitScript(() => { localStorage.setItem('hesabKetabArchive_v5_bankSetupDone', '1'); localStorage.setItem('hesabKetabArchive_v5_cardSwipeHintDone','1');localStorage.setItem('hesabKetabArchive_v5_tourDone','1'); });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(require('../lib/index-url')); await p.waitForTimeout(2500);
  await p.evaluate(() => { const t = allPersonTitles()[0]; findSectionByTitle('expense', t).rows = [Object.assign(emptyRow('expense'), { id: 'e1', day: '2', desc: 'خرید نان تازه', amount: 125000, status: 'paid' })]; openPersonDetail(t, 'expense'); });
  await p.waitForTimeout(800);
  const res = {};
  for (const sel of ['.person-detail-table tbody textarea.pd-desc', '.person-detail-table tbody input.pd-amt, .person-detail-table tbody .pd-cell.pd-amount, .person-detail-table tbody input[inputmode="numeric"]']) {
    const el = await p.$(sel);
    if (!el) { res[sel] = 'missing'; continue; }
    await el.dblclick(); await p.waitForTimeout(400);
    res[sel] = await p.evaluate(() => { const a = document.activeElement; return a ? [a.tagName, a.className.slice(0, 40), a.selectionStart, a.selectionEnd, (a.value || '').length] : null; });
    await p.keyboard.press('Escape'); await p.evaluate(() => document.activeElement && document.activeElement.blur());
  }
  res.userSelectCard = await p.evaluate(() => getComputedStyle(document.body).userSelect + '/' + getComputedStyle(document.querySelector('.person-detail-title') || document.body).userSelect);
  console.log(JSON.stringify(res, null, 1), errs); await b.close();
})();

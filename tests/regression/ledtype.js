const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 } });
  await ctx.addInitScript(() => { localStorage.setItem('hesabKetabArchive_v5_bankSetupDone', '1'); localStorage.setItem('hesabKetabArchive_v5_tourDone','1'); localStorage.setItem('hesabKetabArchive_v5_cardSwipeHintDone','1'); });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(require('../lib/index-url')); await p.waitForTimeout(2000);
  await p.evaluate(() => {
    const t = allPersonTitles()[0];
    for (let i = 0; i < 6; i++) ensurePersonSections('کارت ' + i);
    allPersonTitles().forEach(tt => { const s = findSectionByTitle('expense', tt); s.rows = []; for (let k = 0; k < 40; k++) s.rows.push(Object.assign(emptyRow('expense'), { id: tt + k, day: String(1 + k % 28), desc: 'خرید ' + k, amount: 10000 * k, status: 'paid' })); });
    const L = ensureLedger(); L.sections.push({ id: 'ls1', personA: t, personB: 'شخص نمونه', collapsed: false, rows: [{ id: 'lr1', amount: 500000, status: 'debt', desc: 'قرض', day: '3' }] });
    persistCurrent(); saveArchive(); renderHomeCards();
    openFeatureSheet('ledger'); const s = ensureLedger().sections[0]; s.collapsed = false; renderLedgerTab();
  });
  await p.waitForTimeout(600);
  const r = await p.evaluate(async () => {
    const ta = document.querySelector('#sections-ledger .section-body textarea.cell, #sections-ledger .section-body .desc-input');
    ta.classList.remove('locked'); ta.readOnly = false; ta.removeAttribute('readonly'); ta.focus();
    const times = [];
    for (let i = 0; i < 20; i++) {
      const t0 = performance.now();
      ta.value += 'ا'; ta.dispatchEvent(new Event('input', { bubbles: true }));
      times.push(performance.now() - t0);
      await new Promise(r => setTimeout(r, 30));
    }
    await new Promise(r => setTimeout(r, 800));
    const saved = JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.startsWith('hesabKetabArchive_v5') && localStorage.getItem(k).indexOf('قرضاااا') >= 0) || 'x') || 'null');
    return { avg: (times.reduce((a, b) => a + b, 0) / times.length).toFixed(1), max: Math.max(...times).toFixed(1), savedFound: !!saved, row: ensureLedger().sections[0].rows[0].desc };
  });
  console.log(JSON.stringify(r), errs); await b.close();
})();

const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, hasTouch: true });
  await ctx.addInitScript(() => { localStorage.setItem('hesabKetabArchive_v5_bankSetupDone', '1'); localStorage.setItem('hesabKetabArchive_v5_tourDone','1'); localStorage.setItem('hesabKetabArchive_v5_cardSwipeHintDone','1'); });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(require('../lib/index-url')); await p.waitForTimeout(2000);
  const out = {};
  for (const k of ['install', 'ledger', 'recurring']) {
    await p.evaluate((k) => { try { closeFeatureSheet(); } catch (e) {} if (k === 'recurring') openRecurringFromMenu(); else switchTabFromMenu(k); }, k);
    await p.waitForTimeout(500);
    const before = await p.evaluate(() => ({ plans: plans.length, led: ensureLedger().sections.length }));
    const vis = await p.evaluate(() => getComputedStyle(document.getElementById('featureSheetAdd')).display);
    await p.click('#featureSheetAdd'); await p.waitForTimeout(500);
    const after = await p.evaluate(() => ({ nameSheet: !!(document.getElementById('nameSheetBackdrop') && document.getElementById('nameSheetBackdrop').classList.contains('open')), plans: plans.length, led: ensureLedger().sections.length, recSheet: !!document.getElementById('recurringSheet') }));
    out[k] = { vis, before, after };
    await p.evaluate(() => { try { document.querySelectorAll('[id$=NameSheet], #ledgerNameSheet, #sectionNameSheet').forEach(x => x.remove()); hideNameSheetBackdrop(); } catch (e) {} });
    await p.waitForTimeout(300);
    await p.evaluate(() => { try { const s = document.getElementById('recurringSheet'); if (s) s.remove(); unlockBodyScroll(); const bd = document.getElementById('textInputBackdrop'); if (bd) bd.classList.remove('open'); } catch (e) {} });
  }
  await p.evaluate(() => { try { closeFeatureSheet(); } catch (e) {} const t = allPersonTitles()[0]; findSectionByTitle('expense', t).rows = [Object.assign(emptyRow('expense'), { id: 'e1', day: '3', desc: 'نان', amount: 300000, status: 'paid' }), Object.assign(emptyRow('expense'), { id: 'e2', day: '4', desc: 'بنزین', amount: 200000, status: 'paid' })]; openStatsSheet(); });
  await p.waitForTimeout(800);
  await p.evaluate(() => document.querySelector('#stCats').scrollIntoView());
  await p.waitForTimeout(300);
  await p.locator('#stCats .st-leg').first().click(); await p.waitForTimeout(200);
  const dimmed = await p.evaluate(() => document.querySelectorAll('#stCats .st-slice.dim').length);
  await p.mouse.click(30, 300); await p.waitForTimeout(200);
  const dimAfter = await p.evaluate(() => document.querySelectorAll('#stCats .st-slice.dim').length);
  out.donut = { dimmed, dimAfter };
  console.log(JSON.stringify(out), errs); await b.close();
})();

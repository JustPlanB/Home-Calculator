const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 412, height: 860 }, acceptDownloads: true });
  await ctx.addInitScript(() => { localStorage.setItem('hesabKetabArchive_v5_bankSetupDone', '1'); localStorage.setItem('hesabKetabArchive_v5_tourDone','1'); localStorage.setItem('hesabKetabArchive_v5_savings', JSON.stringify({v:1,items:[{id:'a',asset:'usd',qty:100,buy:60000}],prices:{usd:{p:62000,at:1}}})); });
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto(require('../lib/index-url')); await p.waitForTimeout(2500);
  // capture payload: hook download blob
  const r = await p.evaluate(async () => {
    let captured = null;
    const origCreate = URL.createObjectURL;
    URL.createObjectURL = function (blob) { blob.text().then(t => captured = t); return origCreate.call(URL, blob); };
    try { await exportFullBackup({ savings: true }); } catch (e) { return 'err ' + e.message; }
    await new Promise(r => setTimeout(r, 1500));
    if (!captured) return 'no-capture';
    const d = JSON.parse(captured);
    return { hasSavings: !!d.savings, n: d.savings && d.savings.items.length, price: d.savings && d.savings.prices.usd.p };
  });
  console.log(r, errs); await b.close();
})();

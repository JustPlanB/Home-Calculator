const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 412, height: 860 } });
  await ctx.addInitScript(() => { localStorage.setItem('hesabKetabArchive_v5_tourDone','1'); localStorage.setItem('hesabKetabArchive_v5_bankSetupDone','1'); });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(require('../lib/index-url')); await p.waitForTimeout(2500);
  const r = await p.evaluate(async () => {
    const vt = typeof document.startViewTransition === 'function';
    const t0 = performance.now(); toggleTheme(); const after = document.documentElement.getAttribute('data-theme');
    await new Promise(r => setTimeout(r, 80));
    const mid = document.documentElement.getAttribute('data-theme');
    await new Promise(r => setTimeout(r, 700));
    const end = document.documentElement.getAttribute('data-theme');
    toggleTheme(); await new Promise(r => setTimeout(r, 700));
    return { vt, after, mid, end, back: document.documentElement.getAttribute('data-theme'), saved: localStorage.getItem('hesabTheme') };
  });
  console.log(JSON.stringify(r), errs); await b.close();
})();

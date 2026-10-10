const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const out = {};
  for (const crit of [false, true]) {
    const ctx = await b.newContext({ viewport: { width: 412, height: 860 } });
    await ctx.addInitScript((crit) => {
      localStorage.setItem('hesabKetabArchive_v5_tourDone','1'); localStorage.setItem('hesabKetabArchive_v5_bankSetupDone','1');
      const of = window.fetch; window.fetch = function (u) { if (String(u).includes('version.json')) return Promise.resolve(new Response(JSON.stringify({ versionCode: 700, versionName: '1.4.0', notes: ['اصلاح مهم'], critical: crit, apk: 'https://example.com/a.apk' }), { status: 200 })); return of.apply(this, arguments); };
      window.Capacitor = { isNativePlatform: () => true, Plugins: { App: { getInfo: async () => ({ version: '1.3.2', build: '619' }) } } };
    }, crit);
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(require('../lib/index-url')); await p.waitForTimeout(7800);
    const r = {};
    r.prompt = await p.evaluate(() => { const o = document.getElementById('updPrompt'); return o ? { title: o.querySelector('.upd-prompt-title').textContent, later: !!o.querySelector('#updPromptLater'), crit: o.hasAttribute('data-critical') } : null; });
    await p.evaluate(() => onBackGuard()); await p.waitForTimeout(400);
    r.afterBack = !!(await p.$('#updPrompt'));
    if (!crit) {
      // reopen via launch check simulation: later then new launch shows again (session flag reset on reload)
      await p.reload(); await p.waitForTimeout(7800);
      r.reshownOnRelaunch = !!(await p.$('#updPrompt'));
      await p.click('#updPromptLater'); await p.waitForTimeout(300);
      r.laterCloses = !(await p.$('#updPrompt'));
    } else {
      await p.click('#updPromptGo'); await p.waitForTimeout(400);
      r.dlg = await p.evaluate(() => { const d = document.getElementById('updDlg'); return d ? { later: !!d.querySelector('#updLater'), hint: !!d.querySelector('.upd-crit-hint') } : null; });
      await p.mouse.click(5, 5); await p.waitForTimeout(300);
      r.dlgStillOpen = !!(await p.$('#updDlg'));
      await p.evaluate(() => { document.getElementById('updDlg').remove(); enforceCriticalUpdate(); }); await p.waitForTimeout(500);
      r.reEnforced = !!(await p.$('#updPrompt'));
    }
    out[crit ? 'critical' : 'normal'] = r; out['errs' + crit] = errs;
    await ctx.close();
  }
  console.log(JSON.stringify(out, null, 1)); await b.close();
})();

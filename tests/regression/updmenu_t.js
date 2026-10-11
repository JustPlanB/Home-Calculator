const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 412, height: 860 } });
  await ctx.addInitScript(() => {
    localStorage.setItem('hesabKetabArchive_v5_tourDone','1'); localStorage.setItem('hesabKetabArchive_v5_bankSetupDone','1');
    window.__fetches = 0;
    const of = window.fetch; window.fetch = function (u) { if (String(u).includes('version.json')) { window.__fetches++; return Promise.resolve(new Response(JSON.stringify({ versionCode: window.__remote || 611, versionName: '1.2.5' }), { status: 200 })); } return of.apply(this, arguments); };
    window.Capacitor = { isNativePlatform: () => true, Plugins: { App: { getInfo: async () => ({ version: '1.2.4', build: '611' }) } } };
  });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(require('../lib/index-url')); await p.waitForTimeout(7500);
  const r = {};
  r.startup = await p.evaluate(() => ({ fetches: window.__fetches, dot: document.getElementById('menuBtn').classList.contains('has-update') }));
  // new build published; backdate last check by 3 minutes, open menu
  await p.evaluate(() => { window.__remote = 612; localStorage.setItem(STORAGE_KEY + '_updCheck', String(Date.now() - 3 * 60 * 1000)); openSideMenu(); });
  await p.waitForTimeout(800);
  r.menuOpen = await p.evaluate(() => ({ fetches: window.__fetches, dot: document.getElementById('menuBtn').classList.contains('has-update'), btn: document.querySelector('.menu-update-btn').classList.contains('has-update') }));
  // reopen menu right away -> throttled
  await p.evaluate(() => { closeSideMenu(); openSideMenu(); }); await p.waitForTimeout(500);
  r.throttled = await p.evaluate(() => window.__fetches);
  r.tube = await p.evaluate(() => { const d = document.createElement('div'); d.id = 'updDlg'; d.innerHTML = '<div class="upd-tube"><i style="width:40%"></i></div>'; document.body.appendChild(d); const c = getComputedStyle(d.querySelector('i')); return [c.left, c.right, c.backgroundImage.slice(0, 40)]; });
  console.log(JSON.stringify(r), errs); await b.close();
})();

const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const theme of ['dark','light']) {
  const p = await b.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript((t) => { localStorage.setItem('hesabKetabArchive_v5_bankSetupDone', '1'); localStorage.setItem('hesabKetabArchive_v5_tourDone','1'); localStorage.setItem('hesabTheme', t); }, theme);
  await p.goto(require('../lib/index-url')); await p.waitForTimeout(1500);
  const feed = require('./feed.json');
  await p.evaluate((feed) => {
    let lis = null;
    window.__installCalls = 0;
    window.Capacitor = Object.assign(window.Capacitor || {}, { isNativePlatform: () => true, Plugins: Object.assign((window.Capacitor && window.Capacitor.Plugins) || {}, { HkUpdater: {
      addListener: (ev, fn) => { lis = fn; return Promise.resolve({ remove() { lis = null; } }); },
      download: () => new Promise(res => { let v = 0; const t = setInterval(() => { v += 5; lis && lis({ percent: v }); if (v >= 100) { clearInterval(t); res({ path: '/x' }); } }, 60); }),
      install: () => { window.__installCalls++; return window.__installCalls === 1 ? Promise.reject(new Error('need_permission')) : Promise.resolve(); }
    } }) });
    showUpdateDialog(feed, { name: '1.2.1', code: 608 });
  }, feed);
  await p.waitForTimeout(300);
  await p.screenshot({ path: 'u2-' + theme + '-0.png' });
  await p.click('#updDlg .upd-dl');
  await p.waitForTimeout(560);
  await p.screenshot({ path: 'u2-' + theme + '-1.png' });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: 'u2-' + theme + '-2.png' });
  const st = await p.evaluate(() => ({ pct: document.querySelector('#updDlg .upd-pct').textContent, status: document.querySelector('#updDlg .upd-status').textContent, btns: [...document.querySelectorAll('#updDlg .upd-more button')].map(b => b.textContent) }));
  await p.click('#updDlg .upd-more .upd-dl'); await p.waitForTimeout(300);
  const st2 = await p.evaluate(() => ({ status: document.querySelector('#updDlg .upd-status').textContent, calls: window.__installCalls }));
  console.log(theme, JSON.stringify(st), JSON.stringify(st2), errs);
  await p.close(); }
  await b.close();
})();

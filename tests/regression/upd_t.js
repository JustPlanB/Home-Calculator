const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.setItem('hesabKetabArchive_v5_bankSetupDone', '1'); localStorage.setItem('hesabKetabArchive_v5_tourDone','1'); });
  await p.goto(require('../lib/index-url')); await p.waitForTimeout(1500);
  const feed = require('./feed.json');
  const r = await p.evaluate(async (feed) => {
    const calls = [];
    const orig = window.fetch;
    window.fetch = (url) => { calls.push(String(url).split('?')[0]); if (String(url).includes('/update-feed/')) return Promise.resolve(new Response('nf', { status: 404 })); return Promise.resolve(new Response(JSON.stringify(feed), { status: 200 })); };
    const m = await fetchUpdateManifest();
    window.fetch = orig;
    showUpdateDialog(m, { name: '1.2.0', code: 607 });
    const links = [...document.querySelectorAll('#updDlg .upd-go')].map(b => b.textContent);
    return { calls, ver: m.versionCode, links };
  }, feed);
  await p.screenshot({ path: 'upd-dlg.png' });
  console.log(JSON.stringify(r), errs); await b.close();
})();

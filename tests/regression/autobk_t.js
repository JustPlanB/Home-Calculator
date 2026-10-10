const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 412, height: 860 } });
  await ctx.addInitScript(() => {
    localStorage.setItem('hesabKetabArchive_v5_bankSetupDone', '1'); localStorage.setItem('hesabKetabArchive_v5_tourDone','1'); localStorage.setItem('hesabKetabArchive_v5_cardSwipeHintDone','1');
    const files = {}; window.__files = files; window.__log = [];
    // 12 old daily + 7 safety
    for (let i = 1; i <= 12; i++) { const d = String(i).padStart(2,'0'); files['hesab-auto-1405-06-' + d + '.json'] = { data: 'x', modified: 1750000000 + i * 86400 * 3 }; }
    for (let i = 1; i <= 7; i++) files['hesab-safety-1405-06-0' + i + '-120000-reset-all.json'] = { data: 'x', modified: 1750000000 + i };
    window.Capacitor = { isNativePlatform: () => true, Plugins: { NativeFileExport: {
      saveAutoBackup: async (o) => { window.__log.push('save:' + o.filename); files[o.filename] = { data: o.data, modified: Math.floor(Date.now()/1000) }; return { ok: true }; },
      listAutoBackups: async () => ({ files: Object.keys(files).map(n => ({ name: n, size: 1, modified: files[n].modified })) }),
      deleteAutoBackup: async (o) => { window.__log.push('del:' + o.name); delete files[o.name]; return { deleted: 1 }; },
    }, App: { getInfo: async () => ({ version: '1.2.4', build: '611' }) } } };
  });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(require('../lib/index-url')); await p.waitForTimeout(2500);
  const r = {};
  // empty data -> daily skipped
  r.emptyDaily = await p.evaluate(async () => { const ok = await writeAutoBackup('daily'); return ok; });
  // add data
  await p.evaluate(() => { const t = allPersonTitles()[0]; const exp = findSectionByTitle('expense', t); exp.rows = [Object.assign(emptyRow('expense'), { id: 'z1', day: '3', desc: 'نان', amount: 50000, status: 'paid' })]; persistCurrent(); saveArchive(); });
  r.daily = await p.evaluate(async () => { const ok = await writeAutoBackup('daily'); const s = autoBkState(); return { ok, lastDaily: s.lastDaily, name: s.lastName }; });
  r.afterPrune = await p.evaluate(() => { const n = Object.keys(window.__files).sort(); return { total: n.length, auto: n.filter(x => x.includes('auto')).length, safety: n.filter(x => x.includes('safety')).length }; });
  console.log(JSON.stringify(r), await p.evaluate(() => window.__log.slice(0,30)));
  r.savedHasRow = await p.evaluate(() => { const f = window.__files[autoBkState().lastName]; const txt = decodeURIComponent(escape(atob(f.data))); const d = JSON.parse(txt); return JSON.stringify(d.archive).includes('نان') && !!d.autoBackup; });
  // safety before reset month: backup must contain data, then month cleared
  r.reset = await p.evaluate(async () => {
    window.__log.length = 0;
    askResetCurrentMonth(); await new Promise(r => setTimeout(r, 200));
    document.getElementById('confirmYes').click();
    const before = JSON.stringify(periodData).includes('نان');
    await new Promise(r => setTimeout(r, 800));
    const name = window.__log.find(x => x.startsWith('save:hesab-safety'));
    const f = name && window.__files[name.slice(5)];
    const backed = f ? decodeURIComponent(escape(atob(f.data))).includes('نان') : false;
    return { saveLogged: !!name, tagOk: !!(name && name.endsWith('-reset-month.json')), backupHadData: backed, dataStillThereRightAfterClick: before, clearedAfter: !JSON.stringify(periodData).includes('نان') };
  });
  // toggle off -> reset runs synchronously, no backup
  r.off = await p.evaluate(async () => {
    autoBkSave(Object.assign(autoBkState(), { enabled: false })); window.__log.length = 0;
    const ok = await writeAutoBackup('daily').then(() => 'ran');
    return { log: window.__log.slice() };
  });
  // dialog row
  await p.evaluate(() => { autoBkSave(Object.assign(autoBkState(), { enabled: true })); askBackupParts(); });
  await p.waitForTimeout(300);
  r.dialog = await p.evaluate(() => ({ cb: document.getElementById('bkAutoOn').checked, last: document.querySelector('.bk-auto-last').innerText, infoBtn: !!document.querySelector('.bk-auto-row .hk-info-btn') }));
  await p.screenshot({ path: 'autobk-dialog.png' }); await p.click('.bk-auto-row .hk-info-btn'); await p.waitForTimeout(200); await p.screenshot({ path: 'autobk-dialog2.png' });
  await p.evaluate(() => { const c = document.getElementById('bkAutoOn'); c.click(); });
  r.toggled = await p.evaluate(() => autoBkState().enabled);
  console.log(JSON.stringify(r, null, 1), errs);
  await b.close();
})();

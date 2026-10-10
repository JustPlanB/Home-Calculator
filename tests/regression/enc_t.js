const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext()).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(require('../lib/index-url')); await p.waitForTimeout(1500);
  const r = await p.evaluate(async () => {
    const src = JSON.stringify({ app: 'hesab-ketab', archive: { '1405-7': { x: 'سلام' } } });
    const enc = await hkEncryptBackup(src, 'رمز1234');
    const ok = await hkDecryptBackup(enc, 'رمز1234');
    let bad = 'no-error'; try { await hkDecryptBackup(enc, 'wrong'); } catch (e) { bad = 'rejected'; }
    // import path with encrypted file
    window.__restored = null; const orig = openBackupRestoreChoice; openBackupRestoreChoice = (d) => { window.__restored = d; };
    const file = new File([JSON.stringify(enc)], 'b.json', { type: 'application/json' });
    importFullBackup({ target: { files: [file] } });
    await new Promise(r => setTimeout(r, 300));
    const asked = !!document.getElementById('bkPwdAsk');
    document.getElementById('bkPwdIn').value = 'رمز1234'; document.getElementById('bkPwdOk').click();
    await new Promise(r => setTimeout(r, 1500));
    openBackupRestoreChoice = orig;
    return { plainHidden: enc.data.indexOf('سلام') < 0 && JSON.stringify(enc).indexOf('archive') < 0, roundtrip: ok === src, bad, asked, restored: !!(window.__restored && window.__restored.archive) };
  });
  console.log(JSON.stringify(r), errs); await b.close();
})();

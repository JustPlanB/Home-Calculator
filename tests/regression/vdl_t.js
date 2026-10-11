const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true });
  await ctx.addInitScript(() => { localStorage.setItem('hesabKetabArchive_v5_bankSetupDone', '1'); localStorage.setItem('hesabKetabArchive_v5_tourDone','1'); localStorage.setItem('hesabKetabArchive_v5_cardSwipeHintDone','1'); });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(require('../lib/index-url')); await p.waitForTimeout(2000);
  const run = async (dlRes) => p.evaluate(async (dlRes) => {
    window.__lst = {};
    window.Capacitor = { isNativePlatform: () => true, Plugins: { HkSpeech: {
      start: () => Promise.reject({ message: 'speech_error_2' }), stop: () => Promise.resolve(), cancel: () => Promise.resolve(),
      downloadOffline: () => Promise.resolve(dlRes),
      addListener: (ev, fn) => { window.__lst[ev] = fn; return Promise.resolve({ remove() {} }); } } } };
    _voice.dlHooked = false;
    const inp = document.createElement('input'); document.body.appendChild(inp);
    openVoiceInput(inp);
    await new Promise(r => setTimeout(r, 900));
    const el = _voice.el; const s1 = el && el.innerText;
    const btn = el && el.querySelector('.vo-offline'); if (btn) btn.click();
    await new Promise(r => setTimeout(r, 200));
    const s2 = _voice.el && _voice.el.innerText;
    if (window.__lst.offlineDl) { window.__lst.offlineDl({ state: 'progress', progress: 42 }); }
    const s3 = _voice.el && _voice.el.innerText;
    if (window.__lst.offlineDl) { window.__lst.offlineDl({ state: 'done' }); }
    const s4 = _voice.el && _voice.el.innerText;
    closeVoiceInput(false); inp.remove();
    await new Promise(r => setTimeout(r, 300));
    return { s1, s2, s3, s4 };
  }, dlRes);
  console.log(JSON.stringify(await run({ status: 'downloading', progressEvents: true }), null, 1));
  console.log(JSON.stringify(await run({ status: 'settings', why: 'unsupported' }), null, 1));
  console.log(JSON.stringify(await run({ status: 'installed' }), null, 1));
  console.log('errs', errs); await b.close();
})();

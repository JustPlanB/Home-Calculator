const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true });
  await ctx.addInitScript(() => { localStorage.setItem('hesabKetabArchive_v5_bankSetupDone', '1'); localStorage.setItem('hesabKetabArchive_v5_tourDone','1'); });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(require('../lib/index-url')); await p.waitForTimeout(2000);
  await ctx.setOffline(true);
  const r = await p.evaluate(async () => {
    window.Capacitor = { isNativePlatform: () => true, Plugins: { HkSpeech: {
      start: () => Promise.reject({ message: 'speech_error_2' }), stop: () => Promise.resolve(), cancel: () => Promise.resolve(),
      downloadOffline: () => Promise.resolve({ status: 'downloading' }), addListener: () => Promise.resolve({ remove() {} }) } } };
    const inp = document.createElement('input'); document.body.appendChild(inp);
    openVoiceInput(inp); await new Promise(r => setTimeout(r, 700));
    const s1 = { txt: _voice.el.querySelector('.vo-status').innerText, btn: !!_voice.el.querySelector('.vo-offline'), fs: getComputedStyle(_voice.el.querySelector('.vo-status')).fontSize, fw: getComputedStyle(_voice.el.querySelector('.vo-status')).fontWeight };
    return s1;
  });
  console.log('offline', JSON.stringify(r));
  await ctx.setOffline(false);
  const r2 = await p.evaluate(async () => {
    _voice.el.querySelector('.vo-retry').click(); await new Promise(r => setTimeout(r, 700));
    return { txt: _voice.el.querySelector('.vo-status').innerText, btn: !!_voice.el.querySelector('.vo-offline') };
  });
  console.log('online retry', JSON.stringify(r2), errs); await b.close();
})();

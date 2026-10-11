const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const [w, h] of [[412, 860], [360, 640]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { localStorage.setItem('hesabKetabArchive_v5_bankSetupDone', '1'); localStorage.setItem('hesabKetabArchive_v5_tourDone','1'); localStorage.setItem('hesabKetabArchive_v5_cardSwipeHintDone','1');
    window.Capacitor = { isNativePlatform: () => true, Plugins: { HkSpeech: { start: () => new Promise(() => {}), stop: () => Promise.resolve(), cancel: () => Promise.resolve(), addListener: () => Promise.resolve({ remove() {} }), isAvailable: () => Promise.resolve({ available: true }) } } }; });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(require('../lib/index-url')); await p.waitForTimeout(2000);
  await p.evaluate(() => { plans.push({ id: 'p1', name: 'وام مسکن', count: 12, paidCount: 2, amount: 3000000, startY: 1405, startM: 1, day: 5 }); enqueueBankSms('بانک ملت\nبرداشت 2,500,000\nمانده 7,000,000\n05/07/12-16:25'); });
  await p.waitForTimeout(800);
  const r = await p.evaluate(() => {
    const d = document.getElementById('smsConfirmDesc').getBoundingClientRect();
    const btns = document.querySelector('#smsConfirmModal .modal-btn.yes').getBoundingClientRect();
    const m = document.getElementById('smsConfirmMeta');
    const mic = document.querySelector('.desc-mic-btn').getBoundingClientRect();
    return { descVisible: d.top >= 0 && d.bottom <= innerHeight, btnVisible: btns.bottom <= innerHeight, metaScrolls: m.scrollHeight > m.clientHeight, micMid: Math.round(mic.top + mic.height/2 - (d.top + d.height/2)), micShown: getComputedStyle(document.querySelector('.desc-mic-btn')).display };
  });
  await p.screenshot({ path: `smslay-${w}.png` });
  await p.tap('#smsConfirmDesc'); await p.keyboard.type('قسط'); await p.waitForTimeout(500);
  const r2 = await p.evaluate(() => { const d = document.getElementById('smsConfirmDesc').getBoundingClientRect(); const mic = document.querySelector('.desc-mic-btn').getBoundingClientRect(); const sug = document.getElementById('smsPlanSuggest'); return { sugShown: sug && sug.style.display, sugOutside: sug && !sug.closest('.desc-mic-wrap'), micMid: Math.round(mic.top + mic.height/2 - (d.top + d.height/2)), micVisible: mic.height > 0 }; });
  await p.keyboard.press('Backspace'); await p.keyboard.press('Backspace'); await p.keyboard.press('Backspace'); await p.waitForTimeout(300);
  const r3 = await p.evaluate(() => { const d = document.getElementById('smsConfirmDesc').getBoundingClientRect(); const mic = document.querySelector('.desc-mic-btn').getBoundingClientRect(); return Math.round(mic.top + mic.height/2 - (d.top + d.height/2)); });
  await p.screenshot({ path: `smslay-${w}-typing.png` });
  console.log(w + 'x' + h, JSON.stringify({ r, r2, afterDelete: r3 }), errs);
  await ctx.close(); }
  await b.close();
})();

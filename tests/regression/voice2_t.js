const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1.5 });
  await ctx.addInitScript(() => { localStorage.setItem('hesabKetabArchive_v5_bankSetupDone', '1'); localStorage.setItem('hesabKetabArchive_v5_tourDone','1'); localStorage.setItem('hesabKetabArchive_v5_cardSwipeHintDone','1'); });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(require('../lib/index-url')); await p.waitForTimeout(2000);
  await p.evaluate(() => {
    window.__vres = null; window.__lst = {};
    window.Capacitor = { isNativePlatform: () => true, Plugins: { HkSpeech: {
      start: () => new Promise((res, rej) => { window.__vres = res; window.__vrej = rej; }),
      stop: () => Promise.resolve(), cancel: () => { if (window.__vrej) window.__vrej({ message: 'cancelled' }); return Promise.resolve(); },
      addListener: (ev, fn) => { window.__lst[ev] = fn; return Promise.resolve({ remove() {} }); } } } };
    enqueueBankSms('بانک ملت\nبرداشت 2,500,000\nمانده 7,000,000\n05/07/12-16:25');
  });
  await p.waitForTimeout(2200);
  await p.screenshot({ path: 'smsmodal.png' });
  await p.evaluate(() => document.getElementById('smsConfirmDesc').scrollIntoView({ block: 'center' })); await p.waitForTimeout(300);
  const box = await p.locator('#smsConfirmDesc').boundingBox();
  await p.screenshot({ path: 'micfield.png', clip: { x: 0, y: box.y - 40, width: 412, height: box.height + 70 } });
  console.log('dbg', JSON.stringify(await p.evaluate((b) => { const e = document.elementFromPoint(b.x + 20, b.y + 10); return { box: b, hit: e && (e.id || e.className), modal: document.getElementById('smsConfirmModal').classList.contains('open'), can: voiceCanUse() }; }, box)));
  /* لمس وسط فیلد: کیبورد عادی، بدون دستیار صوتی */
  await p.touchscreen.tap(box.x + box.width * 0.6, box.y + box.height / 2); await p.waitForTimeout(400);
  const o0 = await p.evaluate(() => ({ overlay: !!document.querySelector('.voice-overlay'), focused: document.activeElement && document.activeElement.id, mic: getComputedStyle(document.querySelector('.desc-mic-btn')).display }));
  console.log('o0 (center tap)', JSON.stringify(o0));
  await p.evaluate(() => document.getElementById('smsConfirmDesc').blur()); await p.waitForTimeout(300);
  await p.touchscreen.tap(box.x + 20, box.y + box.height / 2); await p.waitForTimeout(400);
  const o1 = await p.evaluate(() => ({ overlay: !!document.querySelector('.voice-overlay.on'), focused: document.activeElement && document.activeElement.id }));
  console.log('o1', JSON.stringify(o1));
  await p.evaluate(() => { window.__lst.partial({ text: 'خرید نان' }); window.__lst.level({ rms: 8 }); });
  await p.screenshot({ path: 'voice.png' });
  await p.evaluate(() => window.__vres({ text: 'خرید نان و شیر' })); await p.waitForTimeout(400);
  const o2 = await p.evaluate(() => ({ overlay: !!document.querySelector('.voice-overlay'), val: document.getElementById('smsConfirmDesc').value, focused: document.activeElement && document.activeElement.id }));
  // again, then back
  await p.evaluate(() => document.getElementById('smsConfirmDesc').blur());
  await p.touchscreen.tap(box.x + 20, box.y + box.height / 2); await p.waitForTimeout(400);
  await p.evaluate(() => onBackGuard()); await p.waitForTimeout(600);
  const o3 = await p.evaluate(() => ({ overlay: !!document.querySelector('.voice-overlay'), focused: document.activeElement && document.activeElement.id, ro: document.getElementById('smsConfirmDesc').readOnly, modalOpen: document.getElementById('smsConfirmModal').classList.contains('open') }));
  await p.evaluate(() => document.getElementById('smsConfirmDesc').blur()); await p.waitForTimeout(500);
  await p.touchscreen.tap(box.x + 20, box.y + box.height / 2); await p.waitForTimeout(400);
  await p.evaluate(() => window.__vrej({ code: 'speech_error_13', message: '13' })); await p.waitForTimeout(300);
  const o4 = await p.evaluate(() => ({ overlay: !!document.querySelector('.voice-overlay.err'), status: document.querySelector('.vo-status').textContent }));
  await p.screenshot({ path: 'voice-err.png' });
  await p.click('.vo-retry'); await p.waitForTimeout(200);
  await p.evaluate(() => window.__vres({ text: 'اجاره' })); await p.waitForTimeout(300);
  const o5 = await p.evaluate(() => ({ overlay: !!document.querySelector('.voice-overlay'), val: document.getElementById('smsConfirmDesc').value }));
  console.log(JSON.stringify({ o1, o2, o3, o4, o5 }), errs); await b.close();
})();

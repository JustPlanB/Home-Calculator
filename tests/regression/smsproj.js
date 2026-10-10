const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const [w, h] of [[412, 860], [393, 780], [360, 740]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { localStorage.setItem('hesabKetabArchive_v5_bankSetupDone', '1'); localStorage.setItem('hesabKetabArchive_v5_tourDone','1'); localStorage.setItem('hesabKetabArchive_v5_cardSwipeHintDone','1'); });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(require('../lib/index-url')); await p.waitForTimeout(1500);
  await p.evaluate(() => { const L = loadFinancialSubjects(); L.push({ id: 'pa', name: 'پروژه اشترانکوه', highlightColor: 'purple' }); L.push({ id: 'pb', name: 'سفر شمال', highlightColor: 'orange' }); saveFinancialSubjects(); enqueueBankSms('بانک ملت\nبرداشت 2,500,000\nمانده 7,000,000\n05/07/12-16:25'); });
  await p.waitForTimeout(800);
  const proj = await p.evaluate(() => { const bs = [...document.querySelectorAll('#smsAccountTypeSeg button')]; const pb = bs.find(x => x.textContent.indexOf('پروژه') >= 0); pb && pb.click(); return !!pb; });
  await p.waitForTimeout(500);
  const r = await p.evaluate(() => { const m = document.getElementById('smsConfirmMeta'); const box = document.querySelector('#smsConfirmModal .modal-box').getBoundingClientRect(); return { sh: m.scrollHeight, ch: m.clientHeight, scrolls: m.scrollHeight > m.clientHeight + 1, box: Math.round(box.height), top: Math.round(box.top) }; });
  // open project dropdown
  const dd = await p.evaluate(() => { const blk = document.getElementById('smsProBlock'); const btns = [...blk.querySelectorAll('.fancy-select-btn')]; const bt = btns[btns.length - 1]; if (!bt) return null; bt.click(); return true; });
  await p.waitForTimeout(400);
  const dir = await p.evaluate(() => { const l = [...document.querySelectorAll('.fancy-select-list, .fancy-select-menu, .dark-select-list.open')].find(e => e.getClientRects().length && e.getBoundingClientRect().height > 10); const blk = document.getElementById('smsProBlock'); const btns = [...blk.querySelectorAll('.fancy-select-btn')]; const bt = btns[btns.length - 1]; if (!l || !bt) return 'nolist'; return l.getBoundingClientRect().top >= bt.getBoundingClientRect().top ? 'down' : 'up'; });
  await p.screenshot({ path: `smsproj-${w}.png` });
  console.log(w + 'x' + h, proj, JSON.stringify(r), dir, errs);
  await ctx.close(); }
  await b.close();
})();

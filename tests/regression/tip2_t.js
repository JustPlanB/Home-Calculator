const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 412, height: 860 }, isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => { localStorage.setItem('hesabKetabArchive_v5_tourDone','1'); localStorage.setItem('hesabKetabArchive_v5_bankSetupDone','1'); });
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto(require('../lib/index-url')); await p.waitForTimeout(2200);
  await p.evaluate(() => askBackupParts()); await p.waitForTimeout(300);
  const c = async sel => p.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, sel);
  const ic = await c('.bk-pwd-label .hk-info-btn');
  const tapAt = async (xy) => { await p.touchscreen.tap(xy[0], xy[1]); await p.waitForTimeout(300); };
  const st = () => p.evaluate(() => ({ tip: !!document.getElementById('hkInfoTip'), sh: !!document.getElementById('hkInfoShield'), ae: document.activeElement && (document.activeElement.tagName + '#' + document.activeElement.id + '.' + document.activeElement.type) }));
  await tapAt(ic); const s1 = await st();
  // tip rect vs password input
  const info = await p.evaluate(() => { const t = document.getElementById('hkInfoTip').getBoundingClientRect(); const i = document.querySelector('#backupPickOverlay input[type=password]'); const r = i && i.getBoundingClientRect(); return { t: [t.left, t.top, t.width, t.height], i: r && [r.left, r.top, r.width, r.height] }; });
  // tap on the tip in a spot over the input if overlapping, else tip center
  await tapAt([info.t[0] + info.t[2] / 2, info.t[1] + info.t[3] - 6]); const s2 = await st();
  await tapAt(ic); const s3 = await st();
  // tap outside directly on the password input
  await tapAt([info.i[0] + info.i[2] / 2, info.i[1] + info.i[3] / 2]); const s4 = await st();
  await tapAt(ic); await tapAt(ic); const s5 = await st();
  // without tip, tapping the input should focus it
  await tapAt([info.i[0] + info.i[2] / 2, info.i[1] + info.i[3] / 2]); const s6 = await st();
  console.log(JSON.stringify({ info, s1, s2, s3, s4, s5, s6, errs }, null, 0)); await b.close();
})();

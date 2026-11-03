// ۱.۳.۸۱: ویرایش اسم کاربر با باز شدن کیبورد بسته نمی‌شود؛ اعوجاج پشت حباب‌ها قوی‌تر + لایهٔ پشتیبان؛ رنگ خط زیر تب‌های خروجی آرشیو هم عوض می‌شود. فقط دادهٔ مصنوعی.
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');
const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const allErrors = [];
const REC = JSON.stringify([{ id: 'rc1', name: 'اجارهٔ واحد ۱', amount: 12000000, day: '5', contractStart: { y: 1405, m: 1, d: 1 }, contractEnd: { y: 1406, m: 1, d: 1 }, sectionTitle: 'اجاره' }]);
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Tehran' });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, Object.assign({}, BASE_LS, { [P + '_recurring']: REC }));
  const page = await ctx.newPage();
  page.on('pageerror', e => allErrors.push(e.message));
  await page.clock.setFixedTime(new Date('2026-11-03T09:10:00Z'));
  await page.goto(INDEX); await page.waitForTimeout(1800);
  const r = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    openSideMenu(); await w(300);
    document.getElementById('menuUserName').click(); await w(400);
    document.querySelector('#menuUserNameText .hk-mprof-pen').click(); await w(120);
    const inp = document.querySelector('#menuUserNameText input');
    /* blur ناخواسته مثل لحظهٔ باز شدن کیبورد */
    inp.blur(); await w(200);
    const still = !!document.querySelector('#menuUserNameText input') && document.activeElement === document.querySelector('#menuUserNameText input');
    const i2 = document.querySelector('#menuUserNameText input'); i2.value = 'اسم آزمون'; i2.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); await w(200);
    const saved = hkMainTitle() === 'اسم آزمون';
    closeSideMenu(); await w(200);
    /* خروجی آرشیو: خط زیر تب */
    openFeatureSheet('recurring'); await w(1000);
    hkOpenRecArcExport(); await w(500);
    const seg = document.querySelector('#hkRecArcEx .hk-rax-kind'), ind = seg.querySelector('.hk-seg-ind');
    const c1 = ind.style.getPropertyValue('--ind-c');
    seg.querySelector('[data-k="excel"]').click(); await w(120);
    const c2 = ind.style.getPropertyValue('--ind-c');
    seg.querySelector('[data-k="pdf"]').click(); await w(120);
    const c3 = ind.style.getPropertyValue('--ind-c');
    return { still, saved, c1, c2, c3, svg: (document.querySelector('#hkBubWarpSvg feDisplacementMap') || { getAttribute: () => '' }).getAttribute('scale') };
  });
  ok(r.still, 'blur ناخواسته در لحظهٔ باز شدن کیبورد ویرایش اسم را نمی‌بندد');
  ok(r.saved, 'ویرایش اسم و ذخیره با Enter کار می‌کند');
  ok(/229, 72, 59/.test(r.c1) && /33, 163, 102/.test(r.c2) && /229, 72, 59/.test(r.c3), 'خط زیر تب هم با جابه‌جایی رنگ عوض می‌کند (' + r.c1 + ' → ' + r.c2 + ' → ' + r.c3 + ')');
  await page.evaluate(() => { selectedBankAccounts = [{ label: 'ملت' }]; periodData.income.sections[0].rows = [{ id: 'i1', day: '5', desc: 'حقوق', amount: 5000000, account: 'ملت', status: 'paid' }]; try { document.getElementById('hkRecArcEx').remove(); } catch (e) {} });
  await page.evaluate(() => { try { closeFeatureSheet(); } catch (e) {} });
  await page.waitForTimeout(500);
  const bub = await page.evaluate(() => { hkBubblesStart(document.getElementById('homeBalanceCircle')); const e = document.querySelector('#hkBubbles .hk-bub'); const wf = getComputedStyle(e.querySelector('.wf')); return { scale: document.querySelector('#hkBubWarpSvg feDisplacementMap').getAttribute('scale'), wf: wf.backdropFilter || wf.webkitBackdropFilter }; });
  ok(+bub.scale >= 14 && /blur/.test(bub.wf), 'اعوجاج پشت حباب قوی‌تر و لایهٔ پشتیبان (تار و روشن) که همه‌جا دیده می‌شود');
  ok(allErrors.length === 0, 'هیچ خطای JS ' + allErrors.slice(0, 3).join(' | '));
  await b.close();
  console.log('\nbatch-1381: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();

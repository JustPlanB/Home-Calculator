// ۱.۴.۱۰ — جای آیکون‌ها، کارت و صفحهٔ رابطهٔ قرض مثل درآمد، + مربع افزودن، تاریخ بالای درآمد/مخارج، بک لانگ‌پرس
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');
const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(c, m) { if (c) { passed++; console.log('  ✓ ' + m); } else { failed++; console.log('  ✗ ' + m); } }
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 384, height: 750 }, timezoneId: 'Asia/Tehran', hasTouch: true });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, BASE_LS);
  const page = await ctx.newPage(); page.on('pageerror', e => errs.push(e.message));
  await page.goto(INDEX); await page.waitForTimeout(2000);
  /* مربع افزودن: + دیده می‌شود (قاعدهٔ CSS شکسته نباشد) */
  const F = await page.evaluate(async () => { openSavingsModal(); await new Promise(r => setTimeout(r, 1200)); const s = document.querySelector('#savingsModal > .hk-fab svg'); if (!s) return null; const c = getComputedStyle(s); return { w: c.width, st: c.stroke }; });
  ok(F && F.w === '28px' && F.st === 'rgb(8, 181, 245)', 'مربع افزودن: آیکون + آبی دیده می‌شود');
  await page.evaluate(() => { for (let i = 0; i < 3; i++) onBackGuard(); }); await page.waitForTimeout(500);
  /* قرض: کارت و صفحهٔ رابطه */
  const E = await page.evaluate(async () => {
    const led = ensureLedger();
    led.sections = [{ id: 'A', personA: 'من', personB: 'علی', collapsed: true, rows: Array.from({ length: 20 }, (_, i) => Object.assign(emptyLedgerRow(), { day: String(1 + i), desc: 'شام ' + i, amount: 1000 * (i + 1), ly: currentYear, lm: currentMonth })) }];
    persistCurrent(); openFeatureSheet('ledger'); await new Promise(r => setTimeout(r, 1200));
    const h = document.querySelector('#sections-ledger .section-header'), hr = h.getBoundingClientRect(), ctr = s => { const e = h.querySelector(s).getBoundingClientRect(); return Math.round((e.left + e.right) / 2); };
    const sub = h.querySelector('.hk-led-sub'), nm = h.querySelector('.title-display');
    const card = { del: ctr('.btn-del-row'), edit: ctr('.btn-edit-title'), shr: ctr('.hk-led-shr'), oneLine: sub.getBoundingClientRect().height < 20, nameRight: Math.round(nm.getBoundingClientRect().right), subRight: Math.round(sub.getBoundingClientRect().right) };
    hkLedOpenRel('A'); await new Promise(r => setTimeout(r, 1800));
    const bar = getComputedStyle(document.querySelector('#featureSheet > .feature-sheet-bar')).display;
    const body = document.querySelector('#sections-ledger .section.hk-lrel .section-body'), tr = body.querySelector('tbody tr'), th = body.querySelector('thead');
    const hint = document.querySelector('.hk-lrel-hint'), hr2 = hint.getBoundingClientRect(), sec = document.querySelector('.section.hk-lrel').getBoundingClientRect();
    const rel = { bar, rh: Math.round(tr.getBoundingClientRect().height), rows: Math.round((body.clientHeight - th.getBoundingClientRect().height) / tr.getBoundingClientRect().height), hintOne: hr2.height < 60, noGap: Math.abs(sec.bottom - hr2.bottom) <= 2 };
    const r3 = body.querySelectorAll('tbody tr')[2].getBoundingClientRect();
    return { card, rel, y: Math.round(r3.top + r3.height / 2), x: Math.round(r3.left + r3.width * 0.6) };
  });
  ok(E.card.del === 36 && E.card.edit === 72 && E.card.shr === 108, 'آیکون‌های کارت قرض هم‌تراز «درآمد ثابت» (۳۶، ۷۲، ۱۰۸): ' + [E.card.del, E.card.edit, E.card.shr]);
  ok(E.card.oneLine && E.card.nameRight === E.card.subRight, 'خط نارنجی تک‌خطی و نام هم‌راستای آن');
  ok(E.rel.bar !== 'none' && E.rel.rh >= 35 && E.rel.rh <= 38 && E.rel.rows === 12 && E.rel.hintOne && E.rel.noGap, 'صفحهٔ رابطه: نوار بالا (فلش بک و نام رابطه)، ردیف ۳۶، ۱۲ ردیف تا اسکرول، هینت تک‌خطی و بی فضای خالی (' + JSON.stringify(E.rel) + ')');
  /* لانگ‌پرس ردیف: آیکون‌ها؛ بک فقط آن‌ها را برمی‌دارد */
  await page.mouse.move(E.x, E.y); await page.mouse.down(); await page.waitForTimeout(800); await page.mouse.up(); await page.waitForTimeout(400);
  const A1 = await page.evaluate(() => !!document.querySelector('.hk-row-act .hk-ra-settle'));
  await page.evaluate(() => onBackGuard()); await page.waitForTimeout(500);
  const A2 = await page.evaluate(() => ({ act: !!document.querySelector('.hk-row-act'), rel: document.getElementById('featureSheet').classList.contains('hk-led-rel') }));
  ok(A1 && !A2.act && A2.rel, 'لانگ‌پرس: حذف/ویرایش/تسویه؛ بک فقط لانگ‌پرس را لغو می‌کند');
  /* تاریخ روز در صفحهٔ درآمد/مخارج */
  const T = await page.evaluate(async () => { for (let i = 0; i < 3; i++) onBackGuard(); await new Promise(r => setTimeout(r, 500)); openPersonDetail(hkMainTitle(), 'expense'); await new Promise(r => setTimeout(r, 1200)); const l = document.getElementById('hkTodayLine'); return !!l && getComputedStyle(l).display !== 'none' && l.getBoundingClientRect().top >= 0 && l.getBoundingClientRect().bottom < 40; });
  ok(T, 'تاریخ روز بالای صفحهٔ درآمد/مخارج هم هست');
  ok(errs.length === 0, 'بدون خطای JS' + (errs.length ? ': ' + errs[0] : ''));
  await b.close(); console.log('batch-1410: ' + passed + ' passed, ' + failed + ' failed'); process.exit(failed ? 1 : 0);
})();

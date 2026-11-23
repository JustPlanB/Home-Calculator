// ۱.۴.۳۳ — بارگذاری مدل محلی: اگر اندروید برنامه را وسط بارگذاری ببندد، مرحلهٔ آخر ثبت و بعد از بازشدن نشان داده می‌شود،
// بارگذاری خودکار تکرار نمی‌شود و کاربر با لمس وضعیت دوباره تلاش می‌کند؛ «درباره»: زیرنویس «راهنما، بروزرسانی». فقط داده ساختگی.
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const ROOT = path.join(__dirname, '..', '..');
const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(c, m) { if (c) { passed++; console.log('  ✓ ' + m); } else { failed++; console.log('  ✗ ' + m); } }
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 384, height: 750 }, timezoneId: 'Asia/Tehran', hasTouch: true });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, BASE_LS);
  const page = await ctx.newPage(); page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + path.join(process.env.HK_INDEX ? path.resolve(process.env.HK_INDEX) : path.join(ROOT, 'index.html')));
  await page.waitForTimeout(1500);

  console.log('• ثبت مرحلهٔ بارگذاری');
  const A = await page.evaluate(() => {
    hkAsstBootClear();
    const o = {};
    o.cleanInterrupted = hkAsstBootInterrupted();
    hkAsstStep('بارگذاری مدل در موتور');
    const r = hkAsstBootRead();
    o.stage = r && r.stage; o.doneFlag = r && r.done; o.interrupted = hkAsstBootInterrupted();
    o.status = hkAsstEngineStatus();
    hkAsstBootWrite('بارگذاری مدل در موتور', true);
    o.afterDone = hkAsstBootInterrupted();
    hkAsstBootClear();
    o.cleared = hkAsstBootRead();
    return o;
  });
  ok(A.cleanInterrupted === false, 'بدون ثبت قبلی، قطع‌شده حساب نمی‌شود');
  ok(A.stage === 'بارگذاری مدل در موتور' && A.doneFlag === 0 && A.interrupted === true, 'هر مرحله پیش از اجرا ثبت می‌شود و تمام‌نشده است');
  ok(/بارگذاری مدل در موتور/.test(A.status) && /ناگهان قطع/.test(A.status), 'متن وضعیت مرحلهٔ قطع‌شده را نشان می‌دهد');
  ok(A.afterDone === false && A.cleared === null, 'پایان درست یا پاک‌کردن، علامت قطع را برمی‌دارد');

  console.log('• بدون تکرار خودکار و تلاش دوباره');
  const B = await page.evaluate(() => {
    hkAsstBootWrite('بارگذاری مدل در موتور', false);
    HK_ASST_ENGINE.ok = false; HK_ASST_ENGINE.loading = null; HK_ASST_ENGINE.error = '';
    return { interrupted: hkAsstBootInterrupted(), status: hkAsstEngineStatus() };
  });
  ok(B.interrupted === true && /لمس/.test(B.status), 'پیام راه تلاش دوباره (لمس وضعیت) را می‌گوید');

  console.log('• «درباره»: زیرنویس');
  const C = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    openSideMenu(); await w(500);
    const g = document.querySelector('#menuDropdown .hk-mg[data-g="about"]');
    const small = g && g.querySelector('.hk-mgr small');
    return { sub: small ? small.textContent.trim() : null, extraLine: !!document.querySelector('.hk-about-sub'), items: g ? [...g.querySelectorAll('.hk-mg-box > .menu-item')].map(x => x.textContent.trim()) : [] };
  });
  ok(C.sub === 'راهنما، بروزرسانی', 'زیر «درباره»: «راهنما، بروزرسانی» (' + C.sub + ')');
  ok(!C.extraLine && C.items.join('|') === 'راهنما', 'نوشتهٔ اضافه‌ای زیر کارت نیست و فقط یک گزینهٔ راهنما در گروه است');
  ok(errs.length === 0, 'خطای اسکریپت ندارد ' + errs.join(' | '));
  await b.close();
  console.log('batch-1424: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();

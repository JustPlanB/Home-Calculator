// سرشمارهٔ بانکی در برابر موبایل شخصی، تاریخ کامل ویجت و رنگ نوشتهٔ گزینهٔ انتخاب‌شده در پنجرهٔ ثبت تراکنش.
// فقط دادهٔ مصنوعی در پروفایل تازه؛ افزونهٔ ویجت با شبیه‌ساز جایگزین می‌شود (رسم بومی ویجت سنجیده نمی‌شود).
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');

let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }

(async () => {
  const b = await chromium.launch();
  const errors = [];
  const open = async (theme) => {
    const ctx = await b.newContext({ viewport: { width: 412, height: 915 } });
    await ctx.addInitScript(th => {
      localStorage.setItem('hesabKetabArchive_v5_tourDone', '1'); localStorage.setItem('hesabKetabArchive_v5_bankSetupDone', '1');
      localStorage.setItem('hesabKetabArchive_v5_cardSwipeHintDone', '1'); localStorage.setItem('hesabKetabArchive_v5_autoBackup', JSON.stringify({ enabled: false }));
      window.__widget = null;
      window.Capacitor = { isNativePlatform: () => true, Plugins: { HkWidget: { update: async (o) => { window.__widget = o; return {}; } } } };
      if (th) localStorage.setItem('hesabKetabArchive_v5_theme', th);
    }, theme);
    const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
    await p.goto(INDEX); await p.waitForTimeout(1800);
    if (theme) await p.evaluate(th => document.documentElement.setAttribute('data-theme', th), theme);
    return { ctx, p };
  };

  console.log('• سرشمارهٔ پیامک: بانکی یا موبایل شخصی');
  const A = await open();
  const r = await A.p.evaluate(() => {
    const cases = {
      '9830009417': false, '+989830009417': false, '30009417': false, '9830002020': false, '98300000': false, 'BankMelli': false, '': false,
      '09121234567': true, '+989121234567': true, '989121234567': true, '00989351234567': true, '9121234567': true, '09901234567': true, '09411234567': true,
      '۰۹۱۲۱۲۳۴۵۶۷': true, '0912 123 4567': true
    };
    return Object.keys(cases).filter(k => smsSenderLooksPersonal(k) !== cases[k]);
  });
  ok(r.length === 0, 'بانک ملی (9830009417) و سرشماره‌های خدماتی شخصی نیستند؛ موبایل‌های ۰۹۰/۰۹۱/۰۹۲/۰۹۳/۰۹۴/۰۹۹ با هر پیشوندی شخصی‌اند' + (r.length ? ' — اشتباه: ' + r.join(', ') : ''));
  const warn = await A.p.evaluate(async () => {
    const t = 'بانک ملت\nخرید\nبرداشت 2,000,000\nحساب 0000***1111\nمانده 5,000,000';
    const out = {};
    for (const s of ['9830009417', '09121234567']) {
      const pr = parseBankSms(t); pr.raw = t; openSmsConfirmModal(pr); showSmsSenderWarning({ sender: s });
      await new Promise(x => setTimeout(x, 200));
      out[s] = !!document.getElementById('smsSenderWarn'); closeSmsConfirmModal(); await new Promise(x => setTimeout(x, 200));
    }
    return out;
  });
  ok(warn['9830009417'] === false && warn['09121234567'] === true, 'هشدار «شمارهٔ شخصی» برای بانک ملی نمی‌آید و برای موبایل واقعی همچنان می‌آید');

  console.log('• ویجت: روز، ماه و سال');
  const w = await A.p.evaluate(async () => {
    pushHomeWidget(); await new Promise(x => setTimeout(x, 1200));
    const t = getTodayPersian();
    return { month: window.__widget && window.__widget.month, expect: toPersianDigits(String(t.d)) + ' ' + MONTHS[t.m - 1] + ' ' + toPersianDigits(String(t.y)), dayKey: window.__widget && window.__widget.dayKey, expectKey: t.y + '-' + t.m + '-' + t.d };
  });
  ok(w.month && w.month === w.expect, 'تاریخ ویجت شامل روز است: «' + w.month + '»');
  ok(w.dayKey && w.dayKey === w.expectKey, 'کلید روز برای ویجت فرستاده شد (' + w.dayKey + ')؛ ویجت با آن «خرج امروز» روز قبل را بعد از نیمه‌شب صفر می‌کند');
  await A.ctx.close();

  console.log('• پنجرهٔ ثبت تراکنش: نوشتهٔ گزینهٔ انتخاب‌شده سفید');
  for (const theme of ['dark', 'light']) {
    const T = await open(theme);
    const c = await T.p.evaluate(async () => {
      const t = 'بانک ملت\nخرید\nبرداشت 2,000,000\nحساب 0000***1111\nمانده 5,000,000';
      const pr = parseBankSms(t); pr.raw = t; openSmsConfirmModal(pr); await new Promise(x => setTimeout(x, 500));
      return [...document.querySelectorAll('#smsConfirmModal .sms-seg button.active')].map(b => { const s = getComputedStyle(b); return [b.textContent.trim(), s.color, s.backgroundColor]; });
    });
    ok(c.length >= 2 && c.every(x => x[1] === 'rgb(255, 255, 255)'), theme + ': نوشتهٔ گزینه‌های انتخاب‌شده سفید است (' + c.map(x => x[0]).join('، ') + ')');
    if (theme === 'light') ok(c.every(x => !/rgba\(.*0\.2/.test(x[2]) && x[2] !== 'rgba(0, 0, 0, 0)'), 'light: زمینهٔ آبی پررنگ (نه کم‌رنگ) تا نوشتهٔ سفید خوانا باشد');
    await T.ctx.close();
  }

  console.log('• بروزرسانی: فقط داخل اپ؛ هنگام برگشتن به اپ هم پنجره، یک بار برای هر نسخه');
  {
    const ctx = await b.newContext({ viewport: { width: 412, height: 915 } });
    await ctx.addInitScript(() => {
      localStorage.setItem('hesabKetabArchive_v5_tourDone', '1'); localStorage.setItem('hesabKetabArchive_v5_bankSetupDone', '1');
      localStorage.setItem('hesabKetabArchive_v5_autoBackup', JSON.stringify({ enabled: false }));
      window.__remote = 600;   /* هنوز نسخهٔ تازه‌ای نیست */
      const of = window.fetch; window.fetch = function (u) { if (String(u).includes('version.json')) return Promise.resolve(new Response(JSON.stringify({ versionCode: window.__remote, versionName: '1.3.11', notes: ['نکتهٔ مصنوعی'], critical: false, apk: 'https://example.com/a.apk' }), { status: 200 })); return of.apply(this, arguments); };
      window.Capacitor = { isNativePlatform: () => true, Plugins: { App: { getInfo: async () => ({ version: '1.3.10', build: '629' }) } } };
    });
    const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
    await p.goto(INDEX); await p.waitForTimeout(7500);
    const r = await p.evaluate(async () => {
      const out = { launchNoUpdate: !!document.getElementById('updPrompt') };
      const resume = async () => { localStorage.removeItem('hesabKetabArchive_v5_updCheck'); await checkAppUpdate(true); await new Promise(x => setTimeout(x, 300)); };
      window.__remote = 640;                              /* نسخهٔ تازه در حالی که اپ در پس‌زمینه بود منتشر شد */
      await resume(); out.resumeShows = !!document.getElementById('updPrompt'); out.badge = document.getElementById('menuBtn').classList.contains('has-update');
      const later = document.getElementById('updPromptLater'); if (later) later.click(); await new Promise(x => setTimeout(x, 200));
      _updPromptShownThisLaunch = false;
      await resume(); out.resumeAgainSameVersion = !!document.getElementById('updPrompt');
      window.__remote = 650; _updPromptShownThisLaunch = false;
      await resume(); out.resumeNewerVersion = !!document.getElementById('updPrompt');
      return out;
    });
    ok(!r.launchNoUpdate, 'بدون نسخهٔ تازه: هیچ پنجره‌ای');
    ok(r.resumeShows && r.badge, 'برگشتن به اپ پس از انتشار نسخهٔ تازه: پنجرهٔ بروزرسانی و نقطهٔ قرمز منو');
    ok(!r.resumeAgainSameVersion, 'پس از «بعداً»، برای همان نسخه هنگام برگشتن دوباره مزاحم نمی‌شود (نقطهٔ قرمز می‌ماند)');
    ok(r.resumeNewerVersion, 'نسخهٔ تازه‌تر بعدی: دوباره یک بار نشان داده می‌شود');
    await ctx.close();
  }

  await b.close();
  ok(errors.length === 0, 'هیچ خطای JS در صفحه' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  console.log('\nsms-widget-ui: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e && e.message); process.exit(1); });

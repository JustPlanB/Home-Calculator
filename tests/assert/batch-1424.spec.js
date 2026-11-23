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

  console.log('• تنظیم‌های بارگذاری (فقط CPU و پلهٔ ملایم‌تر)');
  const E = await page.evaluate(() => {
    const o = {};
    const last = HK_ASST_PROFILES.length - 1;
    o.n = HK_ASST_PROFILES.length;
    o.allCpu = HK_ASST_PROFILES.every(p => p.n_gpu_layers === 0 && p.token_embd_on_gpu === false);
    o.gentler = HK_ASST_PROFILES[1].warmup === false && HK_ASST_PROFILES[last].n_batch < HK_ASST_PROFILES[0].n_batch;
    hkAsstBootClear(); localStorage.removeItem('hkAsstGoodProf');
    o.fresh = hkAsstProfileFor();
    localStorage.setItem('hkAsstBoot', JSON.stringify({ stage: 'x', done: 0, at: 1 }));            // ثبت قدیمی بی تنظیم
    o.legacyNext = hkAsstProfileFor(); o.legacyRetry = hkAsstBootCanRetry();
    localStorage.setItem('hkAsstBoot', JSON.stringify({ stage: 'x', done: 0, at: 1, prof: 0 }));
    o.after0 = hkAsstProfileFor(); o.retry0 = hkAsstBootCanRetry();
    localStorage.setItem('hkAsstBoot', JSON.stringify({ stage: 'x', done: 0, at: 1, prof: last }));
    o.afterLast = hkAsstProfileFor(); o.retryLast = hkAsstBootCanRetry();
    HK_ASST_ENGINE.ok = false; HK_ASST_ENGINE.loading = null; HK_ASST_ENGINE.error = '';
    o.lastStatus = hkAsstEngineStatus();
    hkAsstBootClear(); localStorage.setItem('hkAsstGoodProf', '1');
    o.good = hkAsstProfileFor();
    hkAsstBootClear(); localStorage.removeItem('hkAsstGoodProf');
    return o;
  });
  ok(E.n >= 3 && E.allCpu, 'همهٔ تنظیم‌ها فقط CPU هستند (n_gpu_layers صفر)');
  ok(E.gentler, 'تنظیم‌های بعدی ملایم‌ترند (بدون warmup و دستهٔ کوچک‌تر)');
  ok(E.fresh === 0 && E.legacyNext === 0 && E.legacyRetry === true, 'بارگذاری تازه و ثبت قدیمی: از تنظیم اول');
  ok(E.after0 === 1 && E.retry0 === true, 'اگر تنظیم اول قطع شد، لمس بعدی تنظیم دوم را می‌زند');
  ok(E.afterLast === E.n - 1 && E.retryLast === false && /همهٔ تنظیم‌ها امتحان شد/.test(E.lastStatus), 'بعد از ملایم‌ترین تنظیم دیگر تلاش خودکار نیست و وضعیت می‌گوید');
  ok(E.good === 1, 'تنظیمی که جواب داده، برای بارگذاری‌های بعدی نگه داشته می‌شود');

  console.log('• پرامپت و قالب خروجی مدل');
  const F = await page.evaluate(() => {
    const o = {}, pr = hkAsstLocalPrompt('سؤال آزمایشی');
    o.len = pr.length; o.endsWithQuestion = /سؤال: سؤال آزمایشی\n$/.test(pr);
    o.fewShot = (pr.match(/سؤال:/g) || []).length >= 4;
    const sc = hkAsstLocalSchema();
    o.enumOk = JSON.stringify(sc.properties.tool.enum) === JSON.stringify(Object.keys(HK_ASST_TOOLS).filter(n => HK_ASST_TOOLS[n].readOnly));
    o.noMutating = sc.properties.tool.enum.every(n => HK_ASST_TOOLS[n].readOnly === true);
    try { JSON.stringify(sc); o.json = true; } catch (e) { o.json = false; }
    o.ctx = HK_ASST_PROFILES.every(p => p.n_ctx >= 1024);
    return o;
  });
  ok(F.len < 1100 && F.endsWithQuestion && F.fewShot, 'پرامپت کوتاه است، چند مثال دارد و سؤال کاربر آخرِ آن است (بخش ثابت اول، قابل نگه‌داشتن)');
  ok(F.enumOk && F.noMutating && F.json, 'قالب خروجی فقط ابزارهای خواندنی را مجاز می‌داند');
  ok(F.ctx, 'اندازهٔ متن مدل برای پرامپت و پاسخ کافی است (۱۰۲۴)');

  console.log('• دستیار: نشانگر پاسخ‌دادن و کادر ورودی');
  const G = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const o = {};
    hkAsstOpen(); await w(300);
    const form = document.querySelector('.hk-asst-form'), field = form.querySelector('.hk-asst-field'), inp = form.querySelector('.hk-asst-input');
    o.inside = !!(field && field.contains(inp) && field.querySelector('.hk-asst-rec') && field.querySelector('.hk-asst-vc') && field.querySelector('.hk-asst-send'));
    const fh = field.getBoundingClientRect().height; o.fieldH = Math.round(fh);
    const vis = sel => { const e = field.querySelector(sel); return !!e && getComputedStyle(e).display !== 'none'; };
    o.emptyIcons = vis('.hk-asst-rec') && vis('.hk-asst-vc') && !vis('.hk-asst-send');
    inp.value = 'ن'; inp.dispatchEvent(new Event('input', { bubbles: true })); await w(50);
    o.typingIcons = !vis('.hk-asst-rec') && !vis('.hk-asst-vc') && vis('.hk-asst-send');
    o.noBorder = getComputedStyle(inp).borderTopWidth === '0px';
    /* پاسخ دیر می‌رسد: نشانگر سه نقطه هست و بعد از رسیدن پاسخ برداشته می‌شود */
    let release; hkAsstLocalAttach(function () { return new Promise(function (r) { release = r; }); }, 'کند');
    inp.value = 'سلام خوبی؟'; inp.dispatchEvent(new Event('input', { bubbles: true }));
    hkAsstSend(inp.value); await w(150);
    const dots = document.querySelectorAll('.hk-asst-wait .hk-loading-dots i');
    o.dots = dots.length;
    const row = document.querySelector('.hk-asst-wait'); o.rowHasAvatar = !!(row && row.querySelector('.hk-asst-av'));
    o.dotsW = row ? row.querySelector('.hk-loading-dots').offsetWidth : 0; /* offsetWidth: چرخش و کوچک‌سازی را حساب نمی‌کند */
    o.dotAnim = dots.length ? getComputedStyle(dots[0]).animationName : '';
    o.afterSendIcons = vis('.hk-asst-rec') && vis('.hk-asst-vc') && !vis('.hk-asst-send');
    o.loggedWait = _hkAsstLog.some(m => m.kind === 'wait');
    release('{"ask":"سلام! درباره تراکنش‌ها بپرس."}'); await w(300);
    o.dotsAfter = document.querySelectorAll('.hk-asst-wait').length;
    o.lastText = (document.querySelector('.hk-asst-log').lastElementChild || {}).textContent || '';
    hkAsstLocalAttach(null, ''); hkAsstClose();
    return o;
  });
  ok(G.inside && G.fieldH >= 50 && G.noBorder, 'کادر ورودی بزرگ‌تر است (حدود ۵۴) و ضبط و گفتگوی صوتی داخل کادرند (' + G.fieldH + ')');
  ok(G.emptyIcons && G.typingIcons && G.afterSendIcons, 'کادر خالی: ضبط و گفتگوی صوتی؛ با تایپ: فقط ارسال؛ بعد از ارسال دوباره ضبط و گفتگوی صوتی');
  ok(G.dots === 3 && G.rowHasAvatar && G.dotAnim && G.dotAnim !== 'none' && G.dotsW === 30, 'هنگام انتظار پاسخ: همان سه نقطهٔ آبی متحرک (hk-loading-dots) کنار آیکون دستیار');
  ok(!G.loggedWait && G.dotsAfter === 0 && /سلام!/.test(G.lastText), 'بعد از رسیدن پاسخ، نشانگر برداشته می‌شود و پاسخ جایش می‌نشیند');

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
  console.log('• گزارش موتور و وضعیت مرورگر در ثبت قطع‌شده');
  const D = await page.evaluate(() => {
    hkAsstBootWrite('بارگذاری مدل در موتور', false);
    hkAsstBootNote('llama_model_loader: loaded meta data with 26 key-value pairs');
    const b = hkAsstBootRead(); b.env = hkAsstEnvInfo(); localStorage.setItem('hkAsstBoot', JSON.stringify(b));
    HK_ASST_ENGINE.ok = false; HK_ASST_ENGINE.loading = null; HK_ASST_ENGINE.error = '';
    return { note: hkAsstBootRead().note, env: hkAsstEnvInfo(), status: hkAsstEngineStatus() };
  });
  ok(/llama_model_loader/.test(D.note) && /آخرین گزارش موتور/.test(D.status), 'آخرین گزارش موتور در متن وضعیت می‌آید');
  ok(/JSPI/.test(D.env) && /WebView/.test(D.env) && D.status.indexOf(D.env) >= 0, 'وضعیت مرورگر (WebView و JSPI) در متن وضعیت می‌آید');
  ok(errs.length === 0, 'خطای اسکریپت ندارد ' + errs.join(' | '));
  await b.close();
  console.log('batch-1424: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();

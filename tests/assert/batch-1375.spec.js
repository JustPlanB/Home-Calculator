// ۱.۳.۷۵: کارت‌های قسط در پوشه؛ پنجرهٔ تاریخچه (تغییر نام روی باکس، فاصلهٔ راهنما)؛ ردیف عنوان جدول‌ها مثل بقیهٔ ردیف‌ها؛
// زیرعنوان پنجرهٔ حساب؛ انتخاب عکس پروفایل؛ جستجوی شناور منو؛ مسدود کردن همهٔ پوشه‌ها با روشن/خاموش؛
// اسلاید یادآورها با حاشیهٔ قرمز چرخان؛ متن وضعیت؛ هشدار تکراری؛ «+» دوتایی. فقط دادهٔ مصنوعی.
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');

const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const allErrors = [];
async function fresh(b, extra, opt) {
  const ctx = await b.newContext(Object.assign({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Tehran' }, opt || {}));
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, Object.assign({}, BASE_LS, extra || {}));
  const page = await ctx.newPage();
  page.on('pageerror', e => allErrors.push(e.message));
  await page.clock.setFixedTime(new Date('2026-11-03T09:10:00Z'));
  await page.goto(INDEX); await page.waitForTimeout(1800);
  return { ctx, page };
}
const sms = (amt, dt, to, n, ov, pen, tr) => `بانک مسکن\nواريز قسط به مبلغ:${amt}ريال\nزمان:${dt}\nاز کارت:6280-23**-****-7711\nبه کارت:5047-06**-****-${to}\nتعداد اقساط پرداختي :${n}\nمانده معوق :${ov}\nمانده جريمه :${pen}\nشماره پيگيري:${tr}`;
const REM = JSON.stringify([{ id: 'r1', title: 'اجارهٔ خانه', y: 1405, m: 8, d: 13, repeat: 'monthly', advanceDays: 3 }, { id: 'r2', title: 'تمدید بیمه', y: 1405, m: 9, d: 20, repeat: 'once', advanceDays: 7 }]);

(async () => {
  const b = await chromium.launch();

  console.log('• کارت‌های قسط: پوشه، تاریخچه، تغییر نام');
  const A = await fresh(b);
  const a = await A.page.evaluate(async (S) => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    S.forEach(x => enqueueBankSms(x, { silent: true })); await w(600);
    window._hkInstFoldOpen = false; openBankAccountsModal(); await w(300);
    const fold = document.querySelector('#bankSelectedScroll .hk-acc-fold'), body = document.querySelector('#bankSelectedScroll .hk-acc-fold-body');
    const closed = fold && /کارت‌های قسط/.test(fold.textContent) && getComputedStyle(body).display === 'none' && body.querySelectorAll('.hk-acc-inst').length === 2;
    fold.click(); await w(50);
    const opened = getComputedStyle(body).display !== 'none' && fold.classList.contains('open');
    body.querySelector('[data-inst="1037"]').click(); await w(200);
    const ov = document.getElementById('hkInstOv');
    const box = ov.querySelector('.hk-bulk-box').getBoundingClientRect();
    const ren = ov.querySelector('.hk-inst-ren'), cl = ov.querySelector('.hk-bulk-close');
    const sameBtn = getComputedStyle(ren).borderTopWidth === getComputedStyle(cl).borderTopWidth && parseFloat(getComputedStyle(ren).borderTopWidth) <= 1;
    const note = ov.querySelector('.hk-inst-note'), ns = getComputedStyle(note);
    const gap = parseFloat(ns.marginTop) >= 10 && parseFloat(ns.marginBottom) >= 10;
    ren.click(); await w(200);
    /* ۱.۳.۷۷: باکس ویرایش نرم‌افزار با ثبت/انصراف، روی همین پنجره */
    const sheet = document.getElementById('hkInstRen');
    const onTop = !!sheet && (+getComputedStyle(sheet).zIndex) > (+getComputedStyle(ov).zIndex) && !!sheet.querySelector('.hk-re-ok') && !!sheet.querySelector('.hk-re-no');
    const r = sheet.querySelector('.hk-re-box').getBoundingClientRect(), top = document.elementFromPoint(r.left + r.width / 2, r.top + 20);
    const visible = !!(top && sheet.contains(top));
    sheet.querySelector('.hk-re-no').click(); await w(50);
    const reset = !document.getElementById('hkInstRen');
    /* هدر چسبان: ردیف‌ها کامل زیر ردیف عنوان */
    const list = ov.querySelector('.hk-inst-list'), h = list.querySelector('.hk-acctx-h');
    const hs = getComputedStyle(h);
    const sticky = hs.position === 'sticky' && hs.top === '0px' && parseFloat(getComputedStyle(list).paddingTop) === 0 && hs.borderTopLeftRadius === '0px' && hs.backgroundColor !== 'rgba(0, 0, 0, 0)';
    ov._hkCancel();
    return { closed, opened, sameBtn, gap, onTop, visible, reset, sticky };
  }, [sms('18,500,000', '1405/08/06-09:05', '1037', 12, 0, 0, '90012'), sms('2,000,000', '1405/08/12-11:40', '1037', 12, 0, 0, '90013'), sms('21,652,000', '1405/08/06-14:02', '4412', 22, '20,000,000', '1,500,000', '90021')]);
  ok(a.closed && a.opened, 'همهٔ کارت‌های قسط داخل پوشهٔ «کارت‌های قسط»؛ زدن پوشه = باز/بسته');
  ok(a.sameBtn, '«تغییر نام» مثل «بستن» (بی حاشیهٔ سفید)');
  ok(a.onTop && a.visible && a.reset, 'پنجرهٔ تغییر نام روی باکس کارت (نه پشتش)؛ بعد از بستن لایه به حالت قبل');
  ok(a.gap, 'راهنمای پایین تاریخچه فاصلهٔ استاندارد از بالا و پایین');
  ok(a.sticky, 'ردیف عنوان ثابت بالای جدول؛ ردیف‌ها کامل زیرش می‌روند');
  await A.ctx.close();

  console.log('• پنجرهٔ تراکنش‌های حساب');
  const T = await fresh(b);
  const t = await T.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    selectedBankAccounts.push({ bank: 'بانک ملت', label: 'ملت حقوق', srcName: 'بانک ملت' }); smsAccountBankMap['L4:4021'] = 'ملت حقوق';
    const tt = hkMainTitle(), inc = findSectionByTitle('income', tt);
    for (let i = 0; i < 20; i++) inc.rows.push(Object.assign(emptyRow('income'), { day: String(1 + i % 10), desc: 'واریز ' + i, amount: 100000 * (i + 1), status: 'paid', account: 'ملت حقوق' }));
    persistCurrent();
    hkOpenAccountTx({ bank: 'بانک ملت', label: 'ملت حقوق', srcName: 'بانک ملت' }); await w(100);
    const ov = document.getElementById('hkAccTxOv');
    const title = ov.querySelector('.hk-bulk-title').textContent, sub = ov.querySelector('.hk-acctx-src').textContent.replace(/\s/g, '');
    const h = ov.querySelector('.hk-acctx-h'), r1 = ov.querySelector('.hk-acctx-r:not(.hk-acctx-h)');
    const hs = getComputedStyle(h), rs = getComputedStyle(r1);
    const same = hs.display === rs.display && hs.gridTemplateColumns === rs.gridTemplateColumns && hs.borderTopLeftRadius === '0px';
    const list = ov.querySelector('.hk-acctx-list'); list.scrollTop = 200; await w(50);
    const hr = h.getBoundingClientRect(), lr = list.getBoundingClientRect(), bw = parseFloat(getComputedStyle(list).borderTopWidth);
    ov._hkCancel();
    return { title, sub, same, stuck: Math.abs(hr.top - lr.top - bw) < 1.5 };
  });
  ok(t.title === 'ملت حقوق' && t.sub === 'بانکملت|۴۰۲۱', 'بالا اسم کاربر، زیرش «اسم در پیامک | رقم‌های حساب» مثل ردیف بسته (' + t.sub + ')');
  ok(t.same && t.stuck, 'ردیف عنوان هم‌ستون و هم‌خط بقیهٔ ردیف‌ها و با اسکرول بالای جدول می‌ماند');
  await T.ctx.close();

  console.log('• پروفایل و جستجوی منو');
  const M = await fresh(b, {}, { hasTouch: true, isMobile: true });
  await M.page.evaluate(() => openSideMenu()); await M.page.waitForTimeout(400);
  await M.page.tap('#menuUserAvatar'); await M.page.waitForTimeout(250);
  let chooser = false; M.page.on('filechooser', () => { chooser = true; });
  await M.page.tap('#hkAvView .chg'); await M.page.waitForTimeout(500); /* ۱.۳.۷۷: نمای بزرگ عکس */
  const stillOpen = await M.page.evaluate(() => document.getElementById('menuDropdown').classList.contains('open'));
  ok(chooser && stillOpen, 'لمس «انتخاب عکس»: انتخاب فایل باز می‌شود و منو بسته نمی‌شود');
  const ms = await M.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const sw = document.querySelector('#menuDropdown .hk-msearch-wrap'), f = sw.querySelector('.hk-msearch'), sc = document.querySelector('#menuDropdown .menu-scroll');
    const cs = getComputedStyle(sw), fs = getComputedStyle(f);
    const floating = cs.position === 'absolute' && parseFloat(cs.borderTopWidth) === 0 && cs.backgroundColor === 'rgba(0, 0, 0, 0)';
    const box = getComputedStyle(document.querySelector('#menuDropdown .hk-mg-box')).backgroundColor, menu = getComputedStyle(document.getElementById('menuDropdown')).backgroundColor;
    const distinct = fs.backgroundColor !== box && fs.backgroundColor !== menu;
    const over = sc.getBoundingClientRect().bottom > f.getBoundingClientRect().top;
    sc.scrollTop = 40; sc.dispatchEvent(new Event('scroll')); await w(16); sc.scrollTop = 400; sc.dispatchEvent(new Event('scroll')); await w(30);
    const hid = sw.classList.contains('hk-ms-hide');
    await w(350);
    return { floating, distinct, over, hid, back: !sw.classList.contains('hk-ms-hide') };
  });
  ok(ms.floating && ms.over, 'جستجو شناور روی گزینه‌ها، بی خط جداکننده (مثل تنظیمات اندروید)');
  ok(ms.distinct, 'رنگ جستجو جدا از زمینهٔ منو و باکس‌ها');
  ok(ms.hid && ms.back, 'با اسکرول سریع محو و با ایستادن اسکرول برمی‌گردد');
  await M.ctx.close();

  console.log('• مسدود کردن در ثبت گروهی');
  const K = await fresh(b);
  const k = await K.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const items = [
      { body: 'بانک ملت\nبرداشت:250,000\nحساب:6104-33**-****-5512\nمانده:1,200,000\n1405/08/10-10:00', address: '+98200', date: Date.now() - 86400000 },
      { body: 'بانک سامان\nواریز:300,000\nمانده:900,000\n1405/08/10-11:00', address: 'SamanBank', date: Date.now() - 86400000 },
      { body: 'بانک ملی\nبرداشت:120,000\nحساب:0311-22**-****-7788\nمانده:500,000\n1405/08/10-12:00', address: '09121234567', date: Date.now() - 86400000 }
    ];
    window.Capacitor = window.Capacitor || {}; Capacitor.Plugins = Capacitor.Plugins || {};
    Capacitor.Plugins.BankSms = Object.assign(Capacitor.Plugins.BankSms || {}, { readInbox: () => Promise.resolve({ items }) });
    openSmsBulkModal(); await w(200);
    hkBulkRead(); await w(900);
    const folders = [...document.querySelectorAll('#hkBulkList .hk-bulk-folder')];
    const btns = folders.map(f => !!f.querySelector('.hk-bulk-block'));
    const f0 = folders.find(f => /۵۵۱۲/.test(f.textContent)), fp = folders.find(f => f.classList.contains('personal'));
    f0.querySelector('.hk-bulk-block').click(); await w(50);
    const red = f0.querySelector('.hk-bulk-block').classList.contains('on') && f0.classList.contains('blocked') && f0.querySelector('.hk-bulk-chk').disabled;
    const stays = document.contains(f0);
    const list1 = hkBlockedLoad().length;
    f0.querySelector('.hk-bulk-block').click(); await w(50);
    const unred = !f0.querySelector('.hk-bulk-block').classList.contains('on') && hkBlockedLoad().length === 0;
    f0.querySelector('.hk-bulk-block').click(); fp.querySelector('.hk-bulk-block').click(); await w(50);
    closeSmsBulkModal(); await w(100);
    hkOpenBlockedAccounts(); await w(100);
    const rows = [...document.querySelectorAll('#hkBlockOv .hk-block-r')].map(x => x.textContent.replace(/\s+/g, ' '));
    document.getElementById('hkBlockOv')._hkCancel();
    const persBlocked = !!hkSmsBlockedHit('بانک ملی\nبرداشت:1,000\nمانده:5', '+989121234567');
    const otherOk = !hkSmsBlockedHit('بانک ملی\nبرداشت:1,000\nمانده:5', '09350000000');
    return { btns, red, stays, list1, unred, rows, persBlocked, otherOk };
  });
  ok(k.btns.length === 3 && k.btns.every(Boolean), 'دکمهٔ مسدود برای همهٔ پوشه‌ها (شخصی و بی‌شماره هم)');
  ok(k.red && k.stays && k.list1 === 1, 'زدن مسدود: همان‌جا آیکون قرمز، پوشه می‌ماند و از ثبت کنار می‌رود');
  ok(k.unred, 'زدن دوباره: همان لحظه دوباره فعال');
  ok(k.rows.length === 2 && k.rows.some(r => /۵۵۱۲/.test(r)) && k.rows.some(r => /پیامک شخصی/.test(r)), 'بعد از بستن ثبت گروهی، در «حساب‌های مسدود شده» هستند');
  ok(k.persBlocked && k.otherOk, 'پیامک شخصی با شمارهٔ فرستنده مسدود می‌شود (۰۹… و ‎+۹۸۹… یکی)');
  await K.ctx.close();

  console.log('• اسلاید یادآورها و حاشیهٔ چرخان');
  const R = await fresh(b, { [P + '_userReminders']: REM });
  const r = await R.page.evaluate(async (S) => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    S.forEach(x => enqueueBankSms(x, { silent: true })); await w(500);
    const tt = hkMainTitle(), show = async k => { _smartPanelState[tt] = { key: k, pausedUntil: Date.now() + 60000, nextAt: Date.now() + 60000 }; renderHomeCards(); await w(600); return document.querySelector('#homeSmartBox .sp-page.sp-k-' + k); };
    let pg = await show('reminders');
    const rows = pg ? [...pg.querySelectorAll('.sp-rem-r')].map(x => x.textContent.replace(/\s+/g, ' ').trim()) : [];
    const hot = pg && pg.querySelector('.sp-rem-r.hot');
    const snake = hot && getComputedStyle(hot, '::before').animationName === 'hkSnakeSpin' && !pg.querySelector('.hk-inst-dot') /* ۱.۳.۷۷: بی نقطهٔ قرمز */;
    pg = await show('overview'); pg = await show('reminders');
    const again = !!(pg && pg.querySelector('.sp-rem-r.hot.hk-snake'));
    let opened = ''; window.hkRemindersFocus = id => { opened = id; }; window.spGo = fn => fn();
    const el = document.querySelector('#homeSmartBox .pc-smart-box'); el._spPages.find(p => p.key === 'reminders').onTap(tt, pg.querySelector('[data-rem="r1"] b'));
    const ip = await show('inst');
    const instSnake = !!(ip && ip.querySelector('.sp-inst-r.bad.hk-snake'));
    return { rows, snake: !!snake, again, opened, instSnake, label: HK_SP_LABELS.reminders };
  }, [sms('21,652,000', '1405/08/06-14:02', '4412', 22, '20,000,000', '1,500,000', '90021')]);
  ok(r.rows.length === 2 && /^اجارهٔ خانه.*فردا/.test(r.rows[0]) && /تمدید بیمه/.test(r.rows[1]), 'اسلاید «یادآورها»: یادآورهای ساخته‌شده به ترتیب (' + r.rows.join(' ‖ ') + ')');
  ok(r.snake, 'یادآور سررسیده: حاشیهٔ قرمز چرخان (بی نقطهٔ قرمز)');
  ok(r.again, 'با هر بار آمدن اسلاید دوباره می‌چرخد (با یک بار دیدن خاموش نمی‌شود)');
  ok(r.opened === 'r1' && r.label === 'یادآورها', 'زدن یادآور = رفتن روی همان یادآور در پنجرهٔ یادآورها؛ در شخصی‌سازی اسلایدها هست');
  ok(r.instSnake, 'کارت قسط معوق در اسلاید هم حاشیهٔ قرمز چرخان دارد');
  await R.ctx.close();

  console.log('• هشدار تکراری و متن وضعیت');
  const D = await fresh(b);
  const d = await D.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const tt = hkMainTitle(), exp = findSectionByTitle('expense', tt), inc = findSectionByTitle('income', tt);
    inc.rows = [Object.assign(emptyRow('income'), { day: '1', desc: 'حقوق', amount: 30000000, status: 'paid' })];
    exp.rows = [Object.assign(emptyRow('expense'), { day: '5', desc: 'سوپرمارکت', amount: 450000, status: 'paid' }), Object.assign(emptyRow('expense'), { day: '9', desc: 'نان', amount: 30000, status: 'paid' }), Object.assign(emptyRow('expense'), { day: '5', desc: 'سوپرمارکت', amount: 450000, status: 'paid' })];
    persistCurrent(); touchLocal(); await saveArchive(); renderHomeCards(); await w(700);
    const el = document.querySelector('#homeSmartBox .pc-smart-box');
    const warn = el._spPages.find(p => p.key === 'warn'), txt = warn.html.replace(/<[^>]+>/g, '|');
    const once = (txt.match(/احتمال ثبت تکراری/g) || []).length === 1 && !/هشدار/.test(txt);
    const ov = el._spPages.find(p => p.key === 'overview').html.replace(/<[^>]+>/g, ' ');
    window.spGo = fn => fn();
    const holder = document.createElement('div'); holder.innerHTML = warn.html; document.body.appendChild(holder);
    warn.onTap(tt, holder.querySelector('[data-dup="0"]')); holder.remove();
    await w(1800);
    const fl = [...document.querySelectorAll('.person-detail-box tbody tr.sp-flash')].map(tr => tr.textContent + [...tr.querySelectorAll('input, textarea')].map(x => x.value).join(' '));
    return { once, status: /پس‌انداز این ماه|کسری این ماه/.test(ov), fl };
  });
  ok(d.once, 'هشدار تکراری یک بار نوشته می‌شود');
  ok(d.fl.length === 2 && d.fl.every(x => /سوپرمارکت/.test(x)), 'زدن هشدار: همان دو ردیف در جدول هایلایت می‌شوند (' + d.fl.join(',') + ')');
  ok(d.status, 'متن وضعیت (۱.۳.۸۲): «پس‌انداز/کسری این ماه»');
  await D.ctx.close();

  ok(allErrors.length === 0, 'هیچ خطای JS ' + allErrors.slice(0, 3).join(' | '));
  await b.close();
  console.log('\nbatch-1375: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();

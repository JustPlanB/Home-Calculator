// نسخهٔ ۱.۳.۳۴: قسط با «مبلغ هر قسط» (نه مبلغ کل وام) + برگرداندن وصل‌های اشتباه، کارت بعد از حذف ماه، ساعت تراکنش‌ها،
// ستون «فایل»، پیوست (مات، × یکسان، جای دکمهٔ پخش)، نام بانک دلخواه، پنجرهٔ بروزرسانی همان لحظهٔ ورود، امنیت اول تنظیمات،
// جدول‌های منوی جستجو (اسکرول، عنوان داخل جدول، خط دور، جمع ماه ثابت بالا). فقط دادهٔ مصنوعی.
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');

let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const T = (y, m, d, h) => Date.UTC(y, m - 1, d, h || 8);
const melli = (body, ts) => ({ address: 'Bank Melli', date: ts, body });

async function page(b, inbox, opts) {
  opts = opts || {};
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, hasTouch: true });
  await ctx.addInitScript((keep) => {
    ['tourDone', 'bankSetupDone', 'cardSwipeHintDone', 'recCleanupAsked'].concat(keep ? [] : ['instRepair1335']).forEach(k => localStorage.setItem('hesabKetabArchive_v5_' + k, '1'));
  }, !!opts.keepRepair);
  if (opts.init) await ctx.addInitScript(opts.init);
  await ctx.addInitScript({ content: `window.__inbox = ${JSON.stringify(inbox || [])}.sort((a, b) => b.date - a.date);
    window.Capacitor = { isNativePlatform: () => true, Plugins: {
      App: { getInfo: () => Promise.resolve({ version: '1.3.33', build: '653' }), addListener: () => Promise.resolve({ remove() {} }) },
      BankSms: { readInbox: () => Promise.resolve({ items: window.__inbox }), getAllPending: () => Promise.resolve({ items: [] }), getPendingSms: () => Promise.resolve({ has: false }), cancelHandledNotifications: () => Promise.resolve(), markHandled: () => Promise.resolve(), permStatus: () => Promise.resolve({ sms: true, notif: true }) }
    } };` + (opts.extra || '') });
  const p = await ctx.newPage();
  await p.clock.setFixedTime(new Date('2026-10-13T09:00:00Z'));   /* ۲۱ مهر ۱۴۰۵ */
  return p;
}

(async () => {
  const b = await chromium.launch();
  const errors = [];

  /* ---------- قسط: مبلغ هر قسط ---------- */
  console.log('• قسط: مقایسه با مبلغ هر قسط و برگرداندن وصل‌های اشتباه');
  const p1 = await page(b, [], { keepRepair: true });
  p1.on('pageerror', e => errors.push(e.message));
  await p1.goto(INDEX); await p1.waitForTimeout(800);
  const q = await p1.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    periodData.expense.sections = [{ id: 's1', title: 'سپهر', rows: [emptyRow('expense')] }];
    /* وام ۵۰ میلیونی در ۸۴ قسط → هر قسط ۵۹۵٬۲۳۸ */
    plans.push({ id: 'pa', name: 'ملی سارا', count: 84, paidCount: 62, amount: 50000000, startYear: 1400, startMonth: 4, startDay: 10, expenseSectionId: 's1', expenseSectionTitle: 'سپهر', createdAt: 1 });
    const bad = idx => Object.assign(emptyRow('expense'), { day: '10', desc: 'قسط — پرداخت ۲ قسط با هم', amount: 50000000, status: 'paid', account: 'ملت ۳۱۰۶', fromPlanId: 'pa', fromPlanIndex: idx, smsLinked: true, viaSms: true });
    archive['1405-3'] = { income: { sections: [] }, expense: { sections: [{ id: 's1', title: 'سپهر', rows: [Object.assign(emptyRow('expense'), { day: '10', amount: 510000, account: 'ملت ۳۱۰۶', status: 'paid' }), bad(62), bad(63)] }] } };
    persistCurrent(); saveArchive();
    const inst = planInstallmentAmount(plans[0]);
    const out = { inst };
    out.m100 = !!hkMatchInstallment(100000000, { y: 1405, m: 3, d: 10 }, '', 'ملت ۳۱۰۶', {});
    const m2 = hkMatchInstallment(inst * 2, { y: 1405, m: 7, d: 10 }, '', 'ملت ۳۱۰۶', {});
    out.m2 = m2 ? m2.k + ':' + m2.idxs.join(',') : null;
    /* بررسی یک‌بارهٔ بعد از آپدیت (۳٫۵ ثانیه بعد از باز شدن) */
    await w(3600);
    const dlg = document.getElementById('hkAsk3');
    out.dlg = dlg ? dlg.textContent : '';
    if (dlg) dlg.querySelector('.hk-ask3-btn').click();
    await w(300);
    out.rows = archive['1405-3'].expense.sections[0].rows.filter(x => x.amount).map(x => (x.fromPlanId || '-') + ':' + x.amount + ':' + (x.smsLinked ? 'L' : ''));
    out.again = hkUndoWrongInstallmentLinks(false).length;
    return out;
  });
  ok(q.inst === 595238 && !q.m100, 'برداشت ۱۰۰ میلیونی دیگر «۲ قسط» وام ۵۰ میلیونی حساب نمی‌شود (مبلغ هر قسط ' + q.inst + ')');
  ok(q.m2 === '2:62,63', 'دو برابر مبلغ هر قسط = پرداخت ۲ قسط با هم (' + q.m2 + ')');
  ok(/دوباره ردیف معمولی شد/.test(q.dlg) && /ملی سارا/.test(q.dlg), 'بعد از آپدیت: وصل‌های اشتباه برگشت و پیامش آمد');
  ok(q.rows.indexOf('-:100000000:') >= 0 && !q.rows.some(x => /^pa:50000000/.test(x)) && q.again === 0, 'برداشت ۱۰۰ میلیونی دوباره یک ردیف معمولی شد و ردیف‌های قسط از روی وام ساخته شدند (' + q.rows.join(' | ') + ')');

  /* ---------- کارت بعد از حذف ماه + ساعت ---------- */
  console.log('• کارت بعد از حذف ماه، ساعت تراکنش‌ها');
  const inbox = [
    melli('بانك ملي ايران\nبرداشت:1,000,000-\nحساب:62002\nمانده:9,000,000\n0713-14:25', T(2026, 10, 5, 11)),
    melli('بانك ملي ايران\nبرداشت:500,000-\nحساب:62002\nمانده:8,500,000\n0713-09:10', T(2026, 10, 5, 6))
  ];
  const p2 = await page(b, inbox); p2.on('pageerror', e => errors.push(e.message));
  await p2.goto(INDEX); await p2.waitForTimeout(1500);
  const c = await p2.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    selectedBankAccounts.push({ id: 'bm', bank: 'بانک ملی', label: 'ملی', openingBalance: 0, createdAt: { y: 1405, m: 1, d: 1 } }); saveBankAccountsSelection();
    smsAccountBankMap['L4:2002'] = 'ملی'; saveSmsAccountBankMap();
    periodData.expense.sections.forEach(s => s.title = 'سپهر'); periodData.income.sections.forEach(s => s.title = 'سپهر');
    persistCurrent(); renderAll(); await w(200);
    const out = {};
    /* حذف ماه: کارت می‌ماند */
    window.askConfirm = (m, fn) => fn();
    askResetCurrentMonth(); await w(400);
    out.afterReset = allPersonTitles();
    /* نسخه‌های قبل: ماه حذف‌شده «نام کاربر»ِ خالی می‌شد؛ ثبت گروهی همان را کارت مقصد می‌کند نه کارت تازه */
    archive['1405-6'] = { income: { sections: [{ id: 'i1', title: 'سپهر', rows: [Object.assign(emptyRow('income'), { day: '1', amount: 1000, status: 'paid' })] }] }, expense: { sections: [] } };
    periodData = emptyPeriodData(); persistCurrent(); saveArchive(); renderAll(); await w(200);
    out.defaultCard = allPersonTitles();
    openSmsBulkModal(); await w(200);
    out.pick = hkBulkCardTitle();
    await hkBulkRead(); await w(1000);
    document.querySelector('.hk-bulk-allchk').click(); await w(60);
    document.querySelector('.hk-bulk-ok').click(); await w(900);
    const done = document.querySelector('.hk-bulk-done'); if (done) done.click(); await w(300);
    out.afterBulk = allPersonTitles();
    const rows = periodData.expense.sections.flatMap(s => s.rows).filter(x => x.amount);
    out.times = rows.map(x => x.amount + '@' + (x.time || ''));
    /* زدن روی خانهٔ روز: فقط ساعت */
    openPersonDetail('سپهر', 'expense'); await w(500);
    document.querySelector('#panel-expense tbody tr td:nth-child(2) input').click(); await w(200);
    out.pop = (document.querySelector('.pd-desc-popup') || {}).textContent || '';
    out.hdr = [...document.querySelectorAll('#panel-expense .person-detail-sticky th')].map(x => x.textContent);
    const fb = [...document.querySelectorAll('#panel-expense .pd-file-btn')];
    out.fileGrey = fb.length === 2 && fb.every(x => !x.classList.contains('has-att')) && getComputedStyle(fb[0]).color === 'rgb(142, 142, 147)';
    fb[0].click(); await w(200);
    out.attOpen = !!document.getElementById('hkAttachOv');
    const ov = document.getElementById('hkAttachOv');
    out.blur = ov ? getComputedStyle(ov).backdropFilter : '';
    hkCloseAttach();
    out.trackFs = getComputedStyle(document.querySelector('#panel-expense .row-add-track-label')).fontSize;
    out.smsTime = [hkSmsTime('بانك ملي\nبرداشت:10-\n0520-10:00', 0), hkSmsTime('بی ساعت', new Date(2026, 0, 1, 7, 5).getTime())];
    out.wrapped = !!(confirmSmsEntry && confirmSmsEntry._hkTime);
    return out;
  });
  ok(c.afterReset.join() === 'سپهر', 'حذف ماه: کارت «سپهر» می‌ماند (نه برگشت به «نام کاربر»)');
  ok(c.defaultCard.join() === 'نام کاربر' && c.pick === 'سپهر' && c.afterBulk.join() === 'سپهر', 'ثبت گروهی روی ماهی با «نام کاربر»ِ خالی: پیش‌فرض کارت واقعی است و همان کارت می‌شود، کارت تازه ساخته نمی‌شود');
  ok(c.times.join() === '50000@09:10,100000@14:25', 'ساعت از پیامک خوانده شد و ردیف‌های یک روز به ترتیب ساعت‌اند (' + c.times.join() + ')');
  ok(c.pop === 'ساعت ۰۹:۱۰', 'زدن روی خانهٔ روز فقط ساعت را نشان می‌دهد (' + c.pop + ')');
  ok(c.smsTime[0] === '10:00' && c.smsTime[1] === '07:05' && c.wrapped, 'ساعت از متن پیامک وگرنه از زمان رسیدنش؛ ثبت تکیِ پیامک هم ساعت می‌گیرد');
  ok(c.hdr.join('|') === 'ردیف|روز|شرح|مبلغ|حساب|فایل|', 'ستون «فایل» بین حساب و حذف');
  ok(c.fileGrey && c.attOpen, 'گیرهٔ خاکستری؛ زدنش پنجرهٔ پیوست را باز می‌کند');
  ok(/blur/.test(c.blur), 'پشت پنجرهٔ پیوست‌ها مات');
  ok(c.trackFs === '14px', 'نوشتهٔ «پروژه» در دکمهٔ افزودن بزرگ‌تر (۱۴px)');

  /* ---------- پیوست: × یکسان و جای دکمهٔ پخش ---------- */
  const at = await p2.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    await HKAttach.put('a1', new Blob([new Uint8Array(100)], { type: 'audio/wav' }));
    const c = document.createElement('canvas'); c.width = 50; c.height = 50; const img = await new Promise(r => c.toBlob(r, 'image/jpeg'));
    await HKAttach.put('i1', img);
    openRowAttachments(Object.assign(emptyRow('expense'), { amount: 1, att: [{ id: 'i1', kind: 'img' }, { id: 'a1', kind: 'aud', dur: 3 }] })); await w(400);
    const pill = document.querySelector('#hkAttachOv .hk-att-item.aud');
    const order = [...pill.children].map(x => x.className.split(' ')[0]);
    const xi = getComputedStyle(document.querySelector('#hkAttachOv .hk-att-item:not(.aud) .hk-att-del')), xa = getComputedStyle(pill.querySelector('.hk-att-del'));
    const out = { order, same: xi.color === xa.color && xi.backgroundColor === xa.backgroundColor && xi.width === xa.width, red: xi.color };
    hkCloseAttach();
    return out;
  });
  ok(at.order.join(',') === 'hk-aud-bar,hk-aud-time,hk-aud-play,hk-aud-sep,hk-att-del', 'قرص صدا: نوار، زمان، دکمهٔ آبی پخش (سمت چپ نوار، بین زمان و حذف)، جداکننده، ×');
  ok(at.same && at.red === 'rgb(255, 69, 58)', '× حذف عکس و صدا دقیقاً یکی: ضربدر قرمز با پس‌زمینهٔ یکسان');

  /* ---------- نام بانک دلخواه، تنظیمات ---------- */
  const bk = await p2.evaluate(() => {
    const out = { a: hkCustomBankName('درخت'), b: hkCustomBankName('بانک درخت'), c: hkCustomBankName('  بانك  درخت ') };
    hkAddCustomBank('بانک درخت'); hkAddCustomBank(hkCustomBankName('درخت'));
    out.n = hkBankList().filter(x => x === 'بانک درخت').length;
    out.dupMelli = (hkAddCustomBank('بانک ملی'), hkBankList().filter(x => /ملی$/.test(x)).length);
    const items = [...document.querySelectorAll('#menuDropdown .menu-section-label')].find(x => /تنظیمات/.test(x.textContent));
    let el = items && items.nextElementSibling; while (el && (el.style.display === 'none' || getComputedStyle(el).display === 'none')) el = el.nextElementSibling;
    out.first = el ? el.textContent.trim() : '';
    return out;
  });
  ok(bk.a === 'بانک درخت' && bk.b === 'بانک درخت' && bk.c === 'بانک درخت' && bk.n === 1 && bk.dupMelli === 1, 'نام بانک دلخواه: «درخت» → «بانک درخت»، «بانک درخت» همان؛ یک بار در فهرست بانک‌ها');
  ok(bk.first === 'امنیت و قفل برنامه', 'امنیت و قفل برنامه اولین مورد تنظیمات');

  /* ---------- بروزرسانی همان لحظهٔ ورود ---------- */
  console.log('• پنجرهٔ بروزرسانی همان لحظهٔ ورود');
  const p3 = await page(b, [], { init: () => { localStorage.setItem('hesabKetabArchive_v5_updRemote_m', JSON.stringify({ versionCode: 700, versionName: '1.3.40', notes: ['آزمایشی'] })); },
    extra: 'window.fetch = () => new Promise(() => {});' /* اینترنت کند: پنجره نباید منتظرش بماند */ });
  p3.on('pageerror', e => errors.push(e.message));
  await p3.goto(INDEX);
  await p3.waitForTimeout(1400);
  const up = await p3.evaluate(() => { const o = document.getElementById('updPrompt'); return o ? o.textContent : ''; });
  ok(/1\.3\.40|۱\.۳\.۴۰/.test(up) || /بروزرسانی|نسخهٔ جدید/.test(up), 'نسخهٔ تازهٔ شناخته‌شده: پنجرهٔ بروزرسانی در کمتر از ۱٫۵ ثانیه (بی منتظر اینترنت)');

  /* ---------- منوی جستجو ---------- */
  console.log('• منوی جستجو');
  const p4 = await page(b, []); p4.on('pageerror', e => errors.push(e.message));
  await p4.goto(INDEX); await p4.waitForTimeout(1200);
  const sr = await p4.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    periodData.expense.sections = [{ id: 's1', title: 'سپهر', rows: Array.from({ length: 18 }, (_, i) => Object.assign(emptyRow('expense'), { day: String(i + 1), desc: 'خرید ' + i, amount: 150000 * (i + 1), status: 'paid' })) }];
    periodData.income.sections = [{ id: 'i1', title: 'سپهر', rows: [Object.assign(emptyRow('income'), { day: '1', desc: 'حقوق', amount: 40000000, status: 'paid' })] }];
    persistCurrent(); renderAll();
    openPersonDetail('سپهر', 'balance'); await w(600);
    document.getElementById('balanceSearchAmtMin').value = '1'; renderBalanceSearch(); bsRenderMonthSummary(window._bsLastList || [], 'all'); await w(200); /* ۱.۳.۳۶: جدول ماه‌ها از منوی جستجو برداشته شد؛ آزمون خود جدول و پنجرهٔ جزئیات مستقیم */ 
    const out = {};
    const ms = document.getElementById('searchMonthSummary');
    out.msBorder = getComputedStyle(ms).borderTopLeftRadius + ' ' + getComputedStyle(ms).borderTopColor;
    out.short = [...document.querySelectorAll('#searchMonthSummary .hk-scroll11')].every(x => !x.classList.contains('on') && getComputedStyle(x).overscrollBehaviorY !== 'contain');
    document.querySelector('#searchMonthSummary .bs-mrow').click(); await w(400);
    const md = document.getElementById('bsMonthDetail');
    out.titles = [...md.querySelectorAll('.hk-tframe > .bmd-ttl')].map(x => x.textContent);
    out.ttlCenter = getComputedStyle(md.querySelector('.bmd-ttl')).textAlign;
    out.sticky = getComputedStyle(md.querySelector('.bmd-sum')).position;
    const body = md.querySelector('.bmd-body'); body.scrollTop = 400; await w(100);
    out.sumTop = Math.round(md.querySelector('.bmd-sum').getBoundingClientRect().top - body.getBoundingClientRect().top);
    out.expOn = md.querySelectorAll('.hk-scroll11.on').length;
    bsCloseMonthDetail();
    return out;
  });
  ok(/^16px rgba\(255, 255, 255, 0\.55\)/.test(sr.msBorder), 'خط دور جدول‌های جستجو مثل جدول‌های درآمد/مخارج (' + sr.msBorder + ')');
  ok(sr.short, 'جدول‌های کوتاه اسکرول داخلی ندارند و کشیدن انگشت روی جدول، صفحه را جابه‌جا می‌کند');
  ok(sr.titles.join('|') === 'درآمدها (۱)|مخارج (۱۸)|جمع هر دسته' && sr.ttlCenter === 'center', 'جزئیات ماه: عنوان هر جدول داخل خود جدول و وسط‌چین بالا ' + JSON.stringify(sr));
  ok(sr.sticky === 'sticky' && sr.sumTop <= 1 && sr.expOn === 1, 'جدول درآمد/مخارج/مانده بالا ثابت می‌ماند و بقیه زیرش اسکرول می‌شوند');

  ok(errors.length === 0, 'بدون خطای JS' + (errors.length ? ': ' + errors.join(' | ') : ''));
  console.log(`\n${passed} passed, ${failed} failed`);
  await b.close();
  process.exit(failed ? 1 : 0);
})();

// نسخهٔ ۱.۳.۳۲: قسط‌های از قبل پرداخت‌شده در ثبت گروهی، پیوست (دوربین، میکروفون، زوم، دایرهٔ بارگذاری)، منوی جستجو
// (بی نوار بالا، ضربدر شرح، «درآمد/خرج کل»، جزئیات ماه)، رفتن به ماه شروع بازه، باکس هوشمند (لولهٔ کارت، اسلایدهای تازه، فقط ماه خودش)،
// آرشیو درآمد ثابت («همه»، تاریخ با سال، شرح از اسم درآمد ثابت)، پشتیبان (حافظهٔ داخلی + یک «آخرین» در Downloads، باز کردن فایل). فقط دادهٔ مصنوعی.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');

let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const T = (y, m, d, h) => Date.UTC(y, m - 1, d, h || 8);
const melli = (body, ts) => ({ address: 'Bank Melli', date: ts, body });

async function page(b, inbox, extra) {
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, hasTouch: true });
  await ctx.addInitScript(() => { ['tourDone', 'bankSetupDone', 'cardSwipeHintDone', 'recCleanupAsked', 'instRevert1337'].forEach(k => localStorage.setItem('hesabKetabArchive_v5_' + k, '1')); });
  await ctx.addInitScript({ content: `window.__inbox = ${JSON.stringify(inbox || [])}.sort((a, b) => b.date - a.date);
    window.__media = { photo: null, mic: { granted: true } }; window.__toasts = [];
    window.Capacitor = { isNativePlatform: () => true, Plugins: {
      BankSms: { readInbox: () => Promise.resolve({ items: window.__inbox }), getAllPending: () => Promise.resolve({ items: [] }), getPendingSms: () => Promise.resolve({ has: false }), cancelHandledNotifications: () => Promise.resolve(), markHandled: () => Promise.resolve(), permStatus: () => Promise.resolve({ sms: true, notif: true }) },
      HkMedia: { takePhoto: () => window.__media.photo ? Promise.resolve(window.__media.photo) : Promise.reject(new Error('cancelled')), micPermission: () => Promise.resolve(window.__media.mic), openAppSettings: () => { window.__media.settings = 1; return Promise.resolve(); } }
    } };` + (extra || '') });
  const p = await ctx.newPage();
  await p.clock.setFixedTime(new Date('2026-10-13T09:00:00Z'));   /* ۲۱ مهر ۱۴۰۵ */
  return p;
}

(async () => {
  const b = await chromium.launch();
  const errors = [];

  /* ---------- بخش اندرویدی ---------- */
  console.log('• بخش اندرویدی');
  const patch = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'patch-android.js'), 'utf8');
  ok(/MODIFY_AUDIO_SETTINGS/.test(patch) && /registerPlugin\(HkMediaPlugin\.class\)/.test(patch) && /ACTION_IMAGE_CAPTURE/.test(patch) && /cache-path name="capture" path="capture\/"/.test(patch), 'دوربین مستقیم (HkMedia + مسیر capture) و مجوز ضبط صدا داخل صفحه (MODIFY_AUDIO_SETTINGS)');
  ok(/hk-open-backup/.test(patch) && /android\.intent\.action\.VIEW/.test(patch) && /captureOpened/.test(patch) && /takeOpenedFile/.test(patch), 'باز کردن فایل پشتیبان با زدن رویش (VIEW/SEND) و تحویل به نرم‌افزار');
  ok(/isInternal\(call\)/.test(patch) && /getFilesDir\(\),"backups"/.test(patch) && /hesab-\(auto\|safety\|latest\)/.test(patch), 'پشتیبان خودکار در حافظهٔ داخلی؛ «آخرین پشتیبان» در Downloads');

  /* ---------- قسط‌های از قبل پرداخت‌شده ---------- */
  console.log('• ثبت گروهی: قسط‌هایی که قبلاً دستی پرداخت‌شده زده شده‌اند');
  const inbox1 = [
    melli('بانك ملي ايران\nبرداشت:11,904,000-\nحساب:62002\nمانده:88,096,000\n0525-10:00', T(2026, 8, 16, 7)),
    melli('بانك ملي ايران\nبرداشت:5,955,910-\nحساب:62002\nمانده:82,140,090\n0623-10:00', T(2026, 9, 14, 7)),
    melli('بانك ملي ايران\nبرداشت:6,800,000-\nحساب:62002\nمانده:75,340,090\n0624-10:00', T(2026, 9, 15, 7))
  ];
  const p1 = await page(b, inbox1); p1.on('pageerror', e => errors.push(e.message));
  await p1.goto(INDEX); await p1.waitForTimeout(1600);
  const ip = await p1.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    selectedBankAccounts.push({ id: 'bm', bank: 'بانک ملی', label: 'ملی', openingBalance: 0, createdAt: { y: 1405, m: 4, d: 1 } }); saveBankAccountsSelection();
    smsAccountBankMap['L4:2002'] = 'ملی'; saveSmsAccountBankMap();
    periodData.expense.sections = [{ id: 's1', title: 'سارا', rows: [emptyRow('expense')] }];
    /* شش قسط اول دستی «پرداخت‌شده» (بی‌بانک) */
    plans.push({ id: 'pa', name: 'وام الف', count: 12, paidCount: 6, amount: 7155936 /* 596328 × 12 */, startYear: 1405, startMonth: 2, startDay: 21, expenseSectionId: 's1', expenseSectionTitle: 'سارا', createdAt: 1 });
    try { syncPlansToExpenseAll(); } catch (e) {}
    persistCurrent();
    /* ردیف‌های قسطِ پرداخت‌شدهٔ مرداد و شهریور در آرشیو (بی‌بانک) */
    const pr = (idx, day) => Object.assign(emptyRow('expense'), { day: String(day), desc: planInstallmentDesc(plans[0], idx, 12), amount: 596328, status: 'paid', account: '', fromPlanId: 'pa', fromPlanIndex: idx });
    archive['1405-5'] = { income: { sections: [] }, expense: { sections: [{ id: 's1', title: 'سارا', rows: [pr(2, 21), pr(3, 21)] }] } };
    archive['1405-6'] = { income: { sections: [] }, expense: { sections: [{ id: 's1', title: 'سارا', rows: [pr(4, 21)] }] } };
    saveArchive();
    openSmsBulkModal(); await w(150);
    const ov = document.getElementById('smsBulkOv'); const sels = ov._fromSel.querySelectorAll('.dark-select');
    [...sels[1]._list.querySelectorAll('.dark-select-item')].find(x => x.dataset.value === '5').click(); await w(50);
    await hkBulkRead(); await w(1000);
    document.querySelector('.hk-bulk-allchk').click(); await w(60);
    document.querySelector('.hk-bulk-ok').click(); await w(900);
    const out = { sum: (document.querySelector('.hk-bulk-sum') || {}).innerText || '' };
    const rows = m => (archive['1405-' + m] || { expense: { sections: [] } }).expense.sections.flatMap(s => s.rows).filter(x => x.amount);
    out.mordad = rows(5).map(x => (x.fromPlanId || '-') + ':' + x.fromPlanIndex + ':' + x.amount + ':' + x.account + ':' + (x.smsLinked ? 'L' : ''));
    out.shahrivar = rows(6).map(x => (x.fromPlanId || '-') + ':' + x.fromPlanIndex + ':' + x.amount + ':' + x.account + ':' + (x.smsLinked ? 'L' : ''));
    out.paid = plans[0].paidCount;
    /* ساختن دوبارهٔ ردیف‌های قسط (همان کاری که با رفتن به ماه انجام می‌شود): پیوند، مبلغ، بانک و توضیح می‌ماند */
    syncPlansToExpensePeriod(archive['1405-6'], 1405, 6);
    const r4 = rows(6).find(x => x.fromPlanId === 'pa' && x.fromPlanIndex === 4) || {};
    out.after = { amt: r4.amount, acc: r4.account, desc: r4.desc, linked: !!r4.smsLinked };
    document.querySelector('.hk-bulk-done').click(); await w(300);
    out.nav = currentYear + '-' + currentMonth;
    return out;
  });
  /* ۱.۳.۳۷: ثبت گروهی دیگر به ردیف‌های قسط وصل نمی‌کند: هر برداشت ردیف معمولی است و ردیف‌های قسط دست نمی‌خورند */
  ok(ip.mordad.filter(x => /^-:/.test(x)).length === 1 && ip.shahrivar.filter(x => /^-:/.test(x)).length === 2 && ip.mordad.concat(ip.shahrivar).every(x => !/^pa:.*:L$/.test(x)), 'ثبت گروهی: برداشت‌ها ردیف معمولی شدند و به قسط‌های پرداخت‌شده وصل نشدند');
  ok(ip.paid === 6 && !/قسط شناخته شد|وصل نشد/.test(ip.sum), 'شمار قسط‌های پرداخت‌شده دست نخورد (۶) و خلاصه دربارهٔ قسط چیزی نمی‌گوید');
  ok(ip.nav === '1405-5', 'بعد از «باشه»، منوی اصلی به ماهِ شروع بازه (مرداد ۱۴۰۵) رفت');

  /* ---------- پیوست ---------- */
  console.log('• پیوست: دوربین، میکروفون، دایرهٔ بارگذاری، زوم');
  const p2 = await page(b, []); p2.on('pageerror', e => errors.push(e.message));
  await p2.goto(INDEX); await p2.waitForTimeout(1600);
  const at = await p2.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    periodData.expense.sections = [{ id: 's1', title: 'سارا', rows: [Object.assign(emptyRow('expense'), { day: '2', desc: 'خرید یخچال', amount: 30000000, status: 'paid' })] }];
    persistCurrent(); renderAll();
    openPersonDetail('سارا', 'expense'); await w(500);
    document.querySelector('#panel-expense .pd-file-btn').click(); await w(200);
    /* عکس از دوربین (شبیه‌سازی افزونه): base64 یک JPEG کوچک */
    const c = document.createElement('canvas'); c.width = 800; c.height = 600; const g = c.getContext('2d'); g.fillStyle = '#c33'; g.fillRect(0, 0, 800, 600);
    window.__media.photo = { data: c.toDataURL('image/jpeg', 0.8).split(',')[1], mime: 'image/jpeg' };
    const out = {};
    document.querySelector('#hkAttachOv .hk-att-cam').click();
    let sawRing = false; const t0 = performance.now();
    while (performance.now() - t0 < 1500) { await new Promise(r => requestAnimationFrame(r)); if (document.querySelector('#hkAttachOv .hk-att-loading circle.fg')) sawRing = true; }
    out.ring = sawRing;
    const row = periodData.expense.sections[0].rows[0];
    out.att = (row.att || []).map(a => a.kind);
    out.ringGone = !document.querySelector('#hkAttachOv .hk-att-loading');
    out.thumb = !!document.querySelector('#hkAttachOv .hk-att-media img');
    /* میکروفون: اجازه رد شده و «دیگر نپرس» → پیشنهاد باز کردن تنظیمات */
    window.__media.mic = { granted: false, blocked: true };
    document.querySelector('#hkAttachOv .hk-att-rec').click(); await w(200);
    out.askSettings = !!document.querySelector('.modal-overlay.open, #hkConfirmOv, .hk-confirm') || /تنظیمات مجوز/.test(document.body.innerText);
    /* زوم: دو ضربه روی عکس تمام‌صفحه */
    document.querySelector('#hkAttachOv .hk-att-media img').click(); await w(200);
    const v = document.getElementById('hkImgView'), im = v && v.querySelector('img');
    out.viewer = !!v && !!v.querySelector('.hk-img-x');
    const tap = (x, y, id) => { v.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: id, clientX: x, clientY: y })); v.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: id, clientX: x, clientY: y })); };
    tap(206, 450, 1); await w(80); tap(206, 450, 2); await w(350);
    out.zoom = im ? getComputedStyle(im).transform : '';
    out.stillOpen = !!document.getElementById('hkImgView');
    /* دو انگشت: بزرگ‌تر */
    tap(206, 450, 3); await w(80); tap(206, 450, 4); await w(350);
    const pd = (id, x) => v.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: id, clientX: x, clientY: 450 }));
    const pm = (id, x) => v.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: id, clientX: x, clientY: 450 }));
    const pu = (id, x) => v.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: id, clientX: x, clientY: 450 }));
    pd(11, 180); pd(12, 230); for (let k = 1; k <= 5; k++) { pm(11, 180 - k * 20); pm(12, 230 + k * 20); await w(16); } pu(11, 80); pu(12, 330); await w(300);
    out.pinch = im ? getComputedStyle(im).transform : '';
    v.querySelector('.hk-img-x').click(); await w(100);
    out.closed = !document.getElementById('hkImgView');
    return out;
  });
  ok(at.ring && at.ringGone && at.att.join() === 'img' && at.thumb, '«گرفتن عکس» از افزونهٔ دوربین؛ دایرهٔ آبیِ بارگذاری تا نمایش عکس کوچک');
  ok(at.askSettings, 'میکروفونِ ردشده: پیشنهاد باز کردن تنظیمات مجوز (نه پیام بی‌راه)');
  ok(at.viewer && /matrix\(2, 0, 0, 2/.test(at.zoom) && at.stillOpen, 'عکس تمام‌صفحه: دو ضربه = زوم ۲ برابر (' + at.zoom + ')');
  const pinchScale = parseFloat((at.pinch.match(/matrix\(([\d.]+)/) || [])[1] || '0');
  ok(pinchScale > 1.5 && at.closed, 'دو انگشت = بزرگ‌نمایی (×' + pinchScale.toFixed(2) + ')؛ دکمهٔ × می‌بندد');

  /* ---------- منوی جستجو ---------- */
  console.log('• منوی جستجو');
  const se = await p2.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    closePersonDetail(); await w(200);
    const rows = []; for (let i = 1; i <= 12; i++) rows.push(Object.assign(emptyRow('expense'), { day: String(i % 28 + 1), desc: i % 2 ? 'نان بربری' : 'بنزین', amount: i * 700000, status: 'paid' }));
    periodData.expense.sections = [{ id: 's1', title: 'سارا', rows }];
    periodData.income.sections = [{ id: 's1', title: 'سارا', rows: [Object.assign(emptyRow('income'), { day: '3', desc: 'حقوق', amount: 50000000, status: 'paid' })] }];
    persistCurrent(); archive['1405-6'] = JSON.parse(JSON.stringify(periodData)); saveArchive(); renderAll();
    const vis = id => { const e = document.getElementById(id); return !!e && getComputedStyle(e).display !== 'none'; };
    openPersonDetail('سارا', 'balance'); await w(600);
    const out = { chrome: vis('stickyChrome'), menuBtn: vis('menuBtn') && document.getElementById('menuBtn').getBoundingClientRect().height > 0 };
    const hdr = document.getElementById('balanceFixedHeader'); out.top = Math.round(hdr.getBoundingClientRect().top);
    out.track = Math.round(document.querySelector('#balanceAmtRange .hk-ar-track').getBoundingClientRect().height);
    const inp = document.getElementById('balanceSearchInput'), clr = document.querySelector('.bs-desc-clr');
    out.x0 = getComputedStyle(clr).display;
    inp.value = 'نان'; inp.dispatchEvent(new Event('input', { bubbles: true })); await w(300);
    out.x1 = getComputedStyle(clr).display; inp.blur(); await w(50); out.x2 = getComputedStyle(clr).display;
    clr.click(); await w(300);
    out.cleared = inp.value === '' && getComputedStyle(clr).display === 'none';
    /* یک ماه: دو ردیف آخر «درآمد کل / خرج کل» */
    const rg = document.getElementById('balanceSearchRange'); rg.value = '6'; rg.dispatchEvent(new Event('change')); await w(200);
    const foot = [...document.querySelectorAll('#search-result-foot tr')];
    out.foot = foot.map(t => t.querySelector('td.sec-name').textContent);
    foot[1].querySelector('td.sec-name').click(); await w(80);
    out.footPop = (document.querySelector('.cell-text-popup') || {}).textContent || '';
    document.querySelectorAll('.cell-text-popup').forEach(x => x.remove());
    /* همهٔ ماه‌ها: زدن روی ماه = پنجرهٔ جزئیات؛ بک = برگشت به جستجو */
    rg.value = 'all'; rg.dispatchEvent(new Event('change')); await w(200);
    document.getElementById('balanceSearchAmtMin').value = '1'; renderBalanceSearch(); bsRenderMonthSummary(window._bsLastList || [], 'all'); await w(200); /* ۱.۳.۳۶: جدول ماه‌ها از منوی جستجو برداشته شد؛ آزمون خود جدول و پنجرهٔ جزئیات مستقیم */ 
    document.querySelector('#searchMonthSummary .bs-mrow[data-m="6"]').click(); await w(200);
    const md = document.getElementById('bsMonthDetail');
    out.detail = md ? { title: md.querySelector('.bmd-title').textContent, sum: [...md.querySelectorAll('.bmd-sum b')].map(x => x.textContent), rows: md.querySelectorAll('table:not(.bmd-cats) tbody tr').length, cats: md.querySelectorAll('table.bmd-cats tbody tr').length /* ۱.۳.۳۳: جمع دسته‌ها در جدول کادردار */ } : null;
    out.rangeKept = rg.value;
    out.dbg = [document.querySelector('.fancy-select-list.open, .dark-select-list.open') ? 'list' : '', document.getElementById('hkInfoTip') ? 'tip' : ''].join(',');
    onBackGuard(); await w(250);
    out.detailClosed = !document.getElementById('bsMonthDetail') && !!_detailContext;
    closePersonDetail(); await w(250);
    out.chromeBack = vis('stickyChrome');
    return out;
  });
  ok(!se.chrome && !se.menuBtn && se.top < 40 && se.chromeBack, 'در جستجو منوی همبرگری (نوار بالا) پنهان و فیلترها بالای صفحه؛ بعد از خروج برمی‌گردد (بالای فیلترها ' + se.top + 'px)');
  ok(se.track >= 10, 'محور مبلغ کلفت‌تر (' + se.track + 'px)');
  ok(se.x0 === 'none' && se.x1 === 'flex' && se.x2 === 'flex' && se.cleared, 'ضربدر پاک کردن شرح: با نوشته (فعال یا نه) دیده می‌شود و متن را پاک می‌کند');
  ok(se.foot.join('|') === 'درآمد کل شهریور|مخارج کل شهریور' && /مخارج کل شهریور/.test(se.footPop), 'دو ردیف آخر: «درآمد کل شهریور» و «مخارج کل شهریور»؛ با زدن، باکس شناور یک‌خطی');
  ok(se.detail && /جزئیات شهریور ۱۴۰۵/.test(se.detail.title) && se.detail.sum[0] === '۵۰,۰۰۰,۰۰۰' && se.detail.rows === 13 && se.detail.cats === 2 && se.rangeKept === 'all', 'زدن روی ماه: پنجرهٔ جزئیات همان ماه (جمع‌ها، ردیف‌ها، جمع هر دسته)');
  ok(se.detailClosed, 'بک اندروید از جزئیات ماه به منوی جستجو برمی‌گردد');

  /* ---------- باکس هوشمند ---------- */
  console.log('• باکس هوشمند');
  const sm = await p2.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const strip = h => String(h || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const rows = []; for (let i = 1; i <= 6; i++) rows.push(Object.assign(emptyRow('expense'), { day: String(i + 1), desc: i % 2 ? 'نان بربری' : 'خرید', amount: 6000000, status: i === 6 ? 'unpaid' : 'paid', account: i === 2 ? '' : 'ملی' }));
    periodData.expense.sections = [{ id: 's1', title: 'سارا', rows }];
    periodData.income.sections = [{ id: 's1', title: 'سارا', rows: [Object.assign(emptyRow('income'), { day: '3', desc: 'حقوق', amount: 50000000, status: 'paid', account: 'ملی' }), Object.assign(emptyRow('income'), { day: '25', desc: 'اجاره', amount: 8000000, status: 'unpaid', fromRecurringId: 'rq9' })] }];
    /* سه ماه قبل: نان کم */
    [4, 5, 6].forEach(m => { archive['1405-' + m] = { income: { sections: [] }, expense: { sections: [{ id: 's1', title: 'سارا', rows: [Object.assign(emptyRow('expense'), { day: '2', desc: 'نان بربری', amount: 3000000, status: 'paid' }), Object.assign(emptyRow('expense'), { day: '3', desc: 'خرید', amount: 30000000, status: 'paid' })] }] } }; });
    plans.length = 0;
    plans.push({ id: 'pz', name: 'وام خانه', count: 12, paidCount: 6, amount: 24000000 /* 2000000 × 12 */, startYear: 1405, startMonth: 1, startDay: 25, expenseSectionId: 's1', expenseSectionTitle: 'سارا', createdAt: 1 });
    persistCurrent(); saveArchive();
    const D = spCollect('سارا');
    const out = {};
    out.ov = strip(spPageOverview(D));
    out.up = strip(spPageUpcoming(D));
    out.jump = strip(spPageJump(D));
    out.big = strip(spPageBiggest(D));
    out.fix = strip(spPageFix(D));
    out.obl = strip(spPageObligations(D));
    /* ماه دیگر (فروردین ۱۴۰۵، بی تراکنش پروژه/قسط پرداخت‌نشده) */
    navigateToPeriod(1405, 3); await w(250);
    const D3 = spCollect('سارا');
    out.obl3 = strip(spPageObligations(D3));
    out.proj3 = spPageProjects(D3);
    out.up3 = spPageUpcoming(D3);
    navigateToPeriod(1405, 7); await w(250);
    /* لولهٔ منفی */
    periodData.expense.sections[0].rows.push(Object.assign(emptyRow('expense'), { day: '9', desc: 'تعمیر', amount: 40000000, status: 'unpaid' }));
    out.ovNeg = strip(spPageOverview(spCollect('سارا')));
    return out;
  });
  ok(/^وضعیت این ماه پس‌انداز کارت ۸٬?۰۰۰٬?۰۰۰|پس‌انداز کارت/.test(sm.ov) && /دریافت‌نشده/.test(sm.ov) && /پرداخت‌نشده/.test(sm.ov) && /بودجهٔ روزانه/.test(sm.ov) && !/کسری کل|کسری این ماه|مانده کنونی/.test(sm.ov), 'یک لوله: «پس‌انداز کارت» (درآمد کل − مخارج کل ماه) با مبلغ و درصد؛ زیرش دریافت‌نشده / پرداخت‌نشده / بودجهٔ روزانه (' + sm.ov + ')');
  ok(/کسری کارت/.test(sm.ovNeg), 'منفی = «کسری کارت»');
  ok(/۷ روز آینده/.test(sm.up) && /وام خانه/.test(sm.up) && /اجاره/.test(sm.up), 'اسلاید «۷ روز آینده»: قسط و درآمد ثابتِ دریافت‌نشده (' + sm.up + ')');
  ok(/جهش خرج/.test(sm.jump) && /نان|خوراکی/.test(sm.jump), 'اسلاید «جهش خرج»: دسته‌ای که از میانگین ۳ ماه قبل خیلی بیشتر شده (' + sm.jump + ')');
  ok(/بزرگ‌ترین خرج/.test(sm.big) && /تعداد خرج‌ها/.test(sm.big), 'اسلاید «خرج‌های ماه»: بزرگ‌ترین خرج و تعداد تراکنش‌ها');
  ok(/تکمیل اطلاعات/.test(sm.fix) && /ردیف بدون حساب/.test(sm.fix), 'اسلاید «تکمیل اطلاعات»: ردیف‌های بی‌حساب (' + sm.fix + ')');
  ok(/قسط‌های خرداد/.test(sm.obl3) && /پرداخت‌شده/.test(sm.obl3) && sm.proj3 === null && sm.up3 === null, 'ماه دیگر: فقط قسط‌های همان ماه با وضعیت؛ پروژه/سررسید آینده بی‌تراکنش = بدون اسلاید');

  /* ---------- آرشیو درآمد ثابت ---------- */
  console.log('• آرشیو درآمد ثابت');
  const ar = await p2.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const item = { id: 'rq1', name: 'اجاره واحد', amount: 8000000, day: 4, account: 'ملی', sectionId: 's1', sectionTitle: 'سارا', contractStart: { d: 4, m: 1, y: 1405 }, contractEnd: { d: 4, m: 1, y: 1406 }, fromKey: 140401, genKey: 140407 };
    recurringIncomes.length = 0; recurringIncomes.push(item);
    archive['1405-1'] = { income: { sections: [{ id: 's1', title: 'سارا', rows: [Object.assign(emptyRow('income'), { day: '6', desc: '', amount: 8000000, status: 'paid', account: 'ملی' })] }] }, expense: { sections: [] } };
    archive['1405-2'] = { income: { sections: [{ id: 's1', title: 'سارا', rows: [Object.assign(emptyRow('income'), { day: '5', desc: 'واریز', amount: 8000000, status: 'paid', account: 'ملی' })] }] }, expense: { sections: [] } };
    /* از قبل وصل‌شده ولی بی‌شرح (نسخهٔ قبل) */
    archive['1405-3'] = { income: { sections: [{ id: 's1', title: 'سارا', rows: [Object.assign(emptyRow('income'), { day: '4', desc: '', amount: 8000000, status: 'paid', account: 'ملی', fromRecurringId: 'rq1', recLinked: true })] }] }, expense: { sections: [] } };
    saveArchive();
    hkRecDescMigrate();
    const out = { migrated: archive['1405-3'].income.sections[0].rows[0].desc };
    recAddPreviousFlow(item, function () {}); await w(150);
    const m = document.getElementById('recAddPrevModal');
    out.all = m ? (m.querySelector('.rec-prev-all') || {}).textContent : '';
    out.labels = m ? [...m.querySelectorAll('input[data-i]')].map(x => x.parentNode.textContent.trim()) : [];
    m.querySelector('.rec-prev-allchk').click(); await w(30);
    out.allChecked = [...m.querySelectorAll('input[data-i]')].every(x => x.checked);
    m.querySelector('[data-act="ok"]').click(); await w(150);
    out.desc1 = archive['1405-1'].income.sections[0].rows[0].desc;
    out.desc2 = archive['1405-2'].income.sections[0].rows[0].desc;
    out.trash = (() => { try { openTrashModal && openTrashModal(); } catch (e) {} const l = document.querySelector('.trash-toolbar label'); const t = l ? l.textContent.trim() : ''; try { document.querySelectorAll('.modal-overlay.open').forEach(x => x.classList.remove('open')); } catch (e) {} return t; })();
    return out;
  });
  ok(ar.migrated === 'اجاره واحد', 'تراکنشی که قبلاً وصل شده و شرح نداشت، بعد از آپدیت اسم درآمد ثابت را گرفت');
  ok(ar.all === 'همه' && ar.allChecked, '«افزودن واریزهای قبلی»: ردیف «همه» که همه را تیک می‌زند');
  ok(ar.labels[0] && /^۶ فروردین ۱۴۰۵ — /.test(ar.labels[0]) && !/ملی ۱۴۰۵/.test(ar.labels[0]), 'تاریخ دقیقاً «۶ فروردین ۱۴۰۵» کنار روز و ماه (نه کنار بانک): ' + ar.labels[0]);
  ok(ar.desc1 === 'اجاره واحد' && ar.desc2 === 'واریز', 'وصل کردن واریز بی‌شرح = اسم درآمد ثابت در شرح؛ شرحِ موجود دست نمی‌خورد');
  ok(!ar.trash || ar.trash === 'همه', 'سطل زباله هم «همه» (نه «انتخاب همه»)');

  /* ---------- پشتیبان ---------- */
  console.log('• پشتیبان خودکار و باز کردن فایل');
  const mock = `
    (function(){ const st = { internal: {}, downloads: {} }; window.__st = st; let opened = null; window.__setOpened = (o) => { opened = o; };
      const S = o => st[(o && o.store === 'internal') ? 'internal' : 'downloads'];
      for (let i = 1; i <= 5; i++) st.downloads['hesab-auto-1405-07-0' + i + '-120000.json'] = { data: 'x', modified: 1 };
      st.downloads['hesab-safety-1405-07-01-120000-reset.json'] = { data: 'x', modified: 1 };
      st.downloads['hesab-manual-note.json'] = { data: 'x', modified: 1 };
      window.Capacitor.Plugins.NativeFileExport = {
        saveAutoBackup: async o => { const s = S(o); if (s[o.filename]) throw new Error('name_exists'); s[o.filename] = { data: o.data, modified: Math.floor(Date.now() / 1000) }; return { ok: true, verified: true, filename: o.filename }; },
        listAutoBackups: async o => ({ files: Object.keys(S(o)).filter(n => /^hesab-(auto|safety|latest)-/.test(n)).map(n => ({ name: n, size: 1, modified: S(o)[n].modified })) }),
        deleteAutoBackup: async o => { delete S(o)[o.name]; return { deleted: 1 }; },
        readAutoBackup: async o => ({ data: (S(o)[o.name] || {}).data, size: 1 }),
        takeOpenedFile: async () => { const r = opened || {}; opened = null; return r; }
      };
    })();`;
  const p3 = await page(b, [], mock); p3.on('pageerror', e => errors.push(e.message));
  await p3.goto(INDEX); await p3.waitForTimeout(1800);
  const bk = await p3.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    periodData.expense.sections = [{ id: 's1', title: 'سارا', rows: [Object.assign(emptyRow('expense'), { day: '2', desc: 'نان', amount: 30000, status: 'paid' })] }];
    persistCurrent();
    const ok1 = await writeAutoBackup('daily');
    const out = { ok: ok1, internal: Object.keys(__st.internal), downloads: Object.keys(__st.downloads).sort() };
    await w(1100);
    await writeAutoBackup('daily');
    out.downloads2 = Object.keys(__st.downloads).filter(n => /^hesab-latest-/.test(n));
    out.internal2 = Object.keys(__st.internal).filter(n => /^hesab-auto-/.test(n)).length;
    /* فایلی که با «باز کردن با…» آمد → همان پنجرهٔ بازیابی */
    const payload = buildBackupPayload(null);
    __setOpened({ name: 'hesab-latest-1405-07-21.json', data: btoa(unescape(encodeURIComponent(JSON.stringify(payload)))) });
    window.dispatchEvent(new Event('hkFileOpened')); await w(800);
    out.restore = !!document.getElementById('backupRestoreOverlay');
    return out;
  });
  ok(bk.ok && bk.internal.length === 1 && /^hesab-auto-/.test(bk.internal[0]), 'پشتیبان روزانه در حافظهٔ داخلی نرم‌افزار (در فایل‌منیجر دیده نمی‌شود)');
  ok(bk.downloads.filter(n => /^hesab-latest-/.test(n)).length === 1 && !bk.downloads.some(n => /^hesab-(auto|safety)-/.test(n)) && bk.downloads.indexOf('hesab-manual-note.json') >= 0, 'در Downloads/HesabKetab فقط یک «آخرین پشتیبان»؛ روزانه/ایمنی‌های قدیمی برداشته شدند، فایل‌های دیگر دست نخوردند');
  ok(bk.downloads2.length === 1 && bk.downloads2[0] !== bk.downloads.find(n => /^hesab-latest-/.test(n)) && bk.internal2 >= 1 && bk.internal2 <= 2 /* ساعت ثابتِ آزمون: نام‌ها فقط در دو نویسهٔ تصادفی فرق دارند */, 'پشتیبان بعدی جای «آخرین» قبلی را می‌گیرد (همیشه یک فایل)؛ در حافظهٔ داخلی از هر روز جدیدترین نسخه');
  ok(bk.restore, 'زدن روی فایل پشتیبان (باز کردن با حساب‌کتاب) = همان پنجرهٔ بازیابی');

  ok(errors.length === 0, 'بدون خطای JS' + (errors.length ? ': ' + errors.join(' | ') : ''));
  console.log(`\n${passed} passed, ${failed} failed`);
  await b.close();
  process.exit(failed ? 1 : 0);
})();

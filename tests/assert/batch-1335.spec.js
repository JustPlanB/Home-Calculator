// نسخهٔ ۱.۳.۳۵: تشخیص قسط با قانون ساده (کلمهٔ قسط در پیامک / مبلغ و سررسید با تلرانس کوچک، ضریب ۲ و ۳ برای معوقه)،
// ثبت معوقه (ردیف ماه سررسید «پرداخت در …»، پرداخت در ماه پرداخت با «(معوق ماه)»)، ساعت ردیف‌های قبلی از صندوق پیامک،
// عرض روز/شرح، منوی جستجو (حالت عادی فقط جدول نتیجه، رنگ‌ها)، × و دکمهٔ پخش پیوست، پشتیبان دستی با پیوست‌ها،
// بک روی پنجرهٔ تکراری‌ها در ثبت گروهی، فرمت اسلایدهای باکس هوشمند. فقط دادهٔ مصنوعی.
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');

let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const T = (y, m, d, h) => Date.UTC(y, m - 1, d, h || 8);
const melli = (body, ts) => ({ address: 'Bank Melli', date: ts, body });

async function page(b, inbox) {
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, hasTouch: true });
  await ctx.addInitScript(() => { ['tourDone', 'bankSetupDone', 'cardSwipeHintDone', 'recCleanupAsked', 'instRevert1337', 'instRepair1335', 'timeFill1335'].forEach(k => localStorage.setItem('hesabKetabArchive_v5_' + k, '1')); });
  await ctx.addInitScript({ content: `window.__inbox = ${JSON.stringify(inbox || [])}.sort((a, b) => b.date - a.date);
    window.Capacitor = { isNativePlatform: () => true, Plugins: {
      BankSms: { readInbox: () => Promise.resolve({ items: window.__inbox }), getAllPending: () => Promise.resolve({ items: [] }), getPendingSms: () => Promise.resolve({ has: false }), cancelHandledNotifications: () => Promise.resolve(), markHandled: () => Promise.resolve(), permStatus: () => Promise.resolve({ sms: true, notif: true }) }
    } };` });
  const p = await ctx.newPage();
  await p.clock.setFixedTime(new Date('2026-10-13T09:00:00Z'));   /* ۲۱ مهر ۱۴۰۵ */
  return p;
}

(async () => {
  const b = await chromium.launch();
  const errors = [];

  /* ---------- قسط ---------- */
  /* از ۱.۳.۴۶ اقساط خاموش است (batch-1346) */
  if (false) {
  console.log('• قسط: قانون ساده و ثبت معوقه');
  const inbox = [
    melli('بانك ملي ايران\nبرداشت:10,050,000-\nحساب:62002\nمانده:89,950,000\n0612-10:00', T(2026, 9, 3, 7)),   /* ۱۲ شهریور: معوقهٔ مرداد + شهریور + ۵ هزار دیرکرد */
    melli('بانك ملي ايران\nبرداشت:5,000,000-\nحساب:62002\nمانده:84,950,000\n0710-11:00', T(2026, 10, 2, 7)),    /* ۱۰ مهر: قسط مهر */
    melli('بانك ملي ايران\nبرداشت:5,200,000-\nحساب:62002\nمانده:79,750,000\n0711-12:00', T(2026, 10, 3, 7))     /* ۱۱ مهر: ۴٪ بیشتر و بی کلمه → قسط نیست */
  ];
  const p1 = await page(b, inbox); p1.on('pageerror', e => errors.push(e.message));
  await p1.goto(INDEX); await p1.waitForTimeout(1500);
  const q = await p1.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    selectedBankAccounts.push({ id: 'bm', bank: 'بانک ملی', label: 'ملی', openingBalance: 0, createdAt: { y: 1405, m: 1, d: 1 } }); saveBankAccountsSelection();
    smsAccountBankMap['L4:2002'] = 'ملی'; saveSmsAccountBankMap();
    periodData.expense.sections = [{ id: 's1', title: 'سارا', rows: [emptyRow('expense')] }];
    /* قسط ۵۰۰ هزار تومانی، موعد ۱۰ هر ماه؛ چهار قسط اول پرداخت‌شده */
    plans.push({ id: 'pa', name: 'وام خانه', count: 12, paidCount: 4, amount: 6000000, startYear: 1405, startMonth: 1, startDay: 10, expenseSectionId: 's1', expenseSectionTitle: 'سارا', createdAt: 1 });
    try { syncPlansToExpenseAll(); } catch (e) {}
    for (const m of [5, 6]) { archive['1405-' + m] = { income: { sections: [] }, expense: { sections: [{ id: 's1', title: 'سارا', rows: [emptyRow('expense')] }] } }; syncPlansToExpensePeriod(archive['1405-' + m], 1405, m); }
    persistCurrent(); saveArchive();
    const out = {};
    /* تابع تشخیص به‌تنهایی (وام دیگر) */
    plans.push({ id: 'pz', name: 'وام ماشین', count: 10, paidCount: 0, amount: 10000000, startYear: 1405, startMonth: 7, startDay: 5, expenseSectionId: 's1', expenseSectionTitle: 'سارا', createdAt: 2 });
    const mt = (amt, d, raw) => { const r = hkMatchInstallment(amt, { y: 1405, m: 7, d }, raw || '', 'ملی', {}); return r && r.plan.id === 'pz' ? r.k + ':' + r.idxs.join(',') : null; };
    const keepPa = plans.splice(0, 1);
    out.direct = [mt(1000000, 6), mt(1040000, 6), mt(1040000, 6, 'پرداخت قسط وام'), mt(1000000, 25), mt(1000000, 25, 'قسط'), mt(990000, 3)];
    plans.pop(); plans.unshift(keepPa[0]);
    openSmsBulkModal(); await w(150);
    const ov = document.getElementById('smsBulkOv'); const sels = ov._fromSel.querySelectorAll('.dark-select');
    [...sels[1]._list.querySelectorAll('.dark-select-item')].find(x => x.dataset.value === '6').click(); await w(50);
    await hkBulkRead(); await w(1000);
    /* بک روی پنجرهٔ «تکراری‌های قبلی»: فقط همان پنجره بسته شود */
    openDupCleanup0 && (function () { try { var o = document.createElement('div'); o.id = 'hkDupOv'; o.className = 'hk-bulk-ov'; o.innerHTML = '<div class="hk-bulk-box"><button type="button" class="hk-bulk-close">بستن</button></div>'; o.querySelector('.hk-bulk-close').onclick = function () { o.remove(); }; document.body.appendChild(o); } catch (e) {} })();
    onBackGuard(); await w(300);
    out.back = !document.getElementById('hkDupOv') && !!document.getElementById('smsBulkOv');
    document.querySelector('.hk-bulk-allchk').click(); await w(60);
    document.querySelector('.hk-bulk-ok').click(); await w(900);
    const rows = pd => pd.expense.sections.flatMap(s => s.rows).filter(x => x.amount || x.desc);
    out.mordad = rows(archive['1405-5']).map(x => [x.fromPlanIndex, x.amount, x.desc].join('|'));
    out.shah = rows(archive['1405-6']).map(x => [x.fromPlanIndex, x.day, x.amount, x.account, x.desc].join('|'));
    out.mehr = rows(archive['1405-7'] || periodData).map(x => [x.fromPlanIndex === undefined ? '-' : x.fromPlanIndex, x.amount, x.status].join('|'));
    out.paid = plans[0].paidCount;
    /* جمع مخارج مرداد: قسط دیرپرداخت دوباره حساب نمی‌شود */
    out.mordadTotal = archive['1405-5'].expense.sections.reduce((t, s) => t + sectionPaidUnpaidTotal(s).total, 0);
    const done = document.querySelector('.hk-bulk-done'); if (done) done.click(); await w(200);
    return out;
  });
  ok(JSON.stringify(q.direct) === JSON.stringify(['1:0', null, '1:0', null, '1:0', '1:0']), 'بی کلمه: تلرانس کوچک (۱٪ کمتر تا ۳٪ بیشتر، ۵ روز قبل تا ۱۵ روز بعد)؛ با «قسط» در پیامک: ۵٪ و ۲۰ روز (' + JSON.stringify(q.direct) + ')');
  ok(q.back, 'بک روی پنجرهٔ تکراری‌های قبلی: فقط همان پنجره بسته شد، ثبت گروهی باز ماند');
  /* ۱.۳.۳۷: ثبت گروهی دیگر قسط پیدا نمی‌کند: سه برداشت سه ردیف معمولی؛ قسط‌ها همان پرداخت‌نشده/معوق (بی «پرداخت در …») */
  ok(q.mordad.every(x => !/پرداخت در/.test(x)) && q.shah.filter(x => /^\|/.test(x) && /\|ملی\|/.test(x)).length === 1 && q.shah.every(x => !/^\d+\|.*\|ملی\|/.test(x)), 'ثبت گروهی: ۱٬۰۰۵٬۰۰۰ ردیف معمولی شد و به هیچ قسطی وصل نشد (' + q.shah.join(' ; ') + ')');
  ok(q.paid === 4 && q.mehr.filter(x => /^-\|/.test(x)).length === 2, 'مهر: ۵۰۰٬۰۰۰ و ۵۲۰٬۰۰۰ هر دو ردیف معمولی؛ شمار قسط‌های پرداخت‌شده همان ۴ (' + q.mehr.join(' ; ') + ')');

  }
  console.log('• ساعت ردیف‌های قبلی از صندوق پیامک');
  const p2 = await page(b, [melli('بانك ملي ايران\nبرداشت:250,000-\nحساب:62002\nمانده:1,000,000\n1405/07/03 14:25:33', T(2026, 9, 25, 10)), melli('بانك ملي ايران\nواريز:900,000+\nحساب:62002\nمانده:1,900,000\nساعت ۰۸:۰۵', T(2026, 9, 25, 4))]);
  p2.on('pageerror', e => errors.push(e.message));
  await p2.goto(INDEX); await p2.waitForTimeout(1200);
  const tm = await p2.evaluate(async () => {
    smsAccountBankMap['L4:2002'] = 'ملی';
    periodData.expense.sections[0].rows = [Object.assign(emptyRow('expense'), { day: '3', desc: 'خرید', amount: 25000, status: 'paid', account: 'ملی' })];
    periodData.income.sections[0].rows = [Object.assign(emptyRow('income'), { day: '3', desc: 'واریز', amount: 90000, status: 'paid', account: 'ملی' })];
    persistCurrent();
    const n = await hkBackfillTimes();
    return { n, e: periodData.expense.sections[0].rows[0].time, i: periodData.income.sections[0].rows[0].time };
  });
  ok(tm.n === 2 && tm.e === '14:25' && tm.i === '08:05', 'ردیف‌های قبلی ساعت گرفتند (قالب «۱۴۰۵/۰۷/۰۳ ۱۴:۲۵:۳۳» و «ساعت ۰۸:۰۵») (' + JSON.stringify(tm) + ')');

  /* ---------- جدول، جستجو، پیوست، پشتیبان، باکس هوشمند ---------- */
  console.log('• جدول، جستجو، پیوست، پشتیبان، باکس هوشمند');
  const u = await p2.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const out = {};
    const t = allPersonTitles()[0];
    openPersonDetail(t, 'expense'); await w(400);
    const cols = [...document.querySelectorAll('#panel-expense .person-detail-sticky col')].map(c => c.style.width);
    out.cols = cols.slice(1, 3).join(',');
    openPersonDetail(t, 'balance'); await w(500);
    const ms = document.getElementById('searchMonthSummary');
    out.normal = (!ms || getComputedStyle(ms).display === 'none') && getComputedStyle(document.getElementById('searchResultBox')).display !== 'none';
    const i = document.getElementById('balanceSearchInput'); i.value = 'خرید'; i.dispatchEvent(new Event('input')); await w(400);
    out.td = getComputedStyle(document.querySelector('#search-result-body td')).backgroundColor;
    out.fh = getComputedStyle(document.getElementById('balanceFixedHeader')).backgroundColor === getComputedStyle(document.querySelector('#searchResultBox .summary-header')).backgroundColor;
    out.msOn = !!ms && getComputedStyle(ms).display !== 'none';
    /* پیوست */
    await HKAttach.put('a1', new Blob([new Uint8Array(64)], { type: 'audio/wav' }));
    const c = document.createElement('canvas'); c.width = 20; c.height = 20; const img = await new Promise(r => c.toBlob(r, 'image/jpeg'));
    await HKAttach.put('i1', img);
    const row = periodData.expense.sections[0].rows[0]; row.att = [{ id: 'i1', kind: 'img', size: img.size }, { id: 'a1', kind: 'aud', size: 64, dur: 2 }];
    openRowAttachments(row); await w(300);
    const x1 = getComputedStyle(document.querySelector('#hkAttachOv .hk-att-item:not(.aud) .hk-att-del')), x2 = getComputedStyle(document.querySelector('#hkAttachOv .hk-att-item.aud .hk-att-del'));
    out.x = [x1.backgroundColor, x2.backgroundColor, x1.color, x2.color].join(',');
    out.play = getComputedStyle(document.querySelector('#hkAttachOv .hk-aud-play')).width;
    hkCloseAttach();
    /* پشتیبان دستی: پیوست دارد → پرسش؛ رفت‌وبرگشت فایل‌ها */
    exportFullBackup(); await w(200);
    const a3 = document.getElementById('hkAsk3'); out.ask = a3 ? a3.textContent : ''; if (a3) a3._hkCancel();
    const packed = await hkAttachmentsForBackup(hkAllAttachments());
    await HKAttach.del('a1'); await HKAttach.del('i1');
    hkRestoreAttachments(packed); await w(300);
    const back = await HKAttach.get('a1');
    out.round = packed.length === 2 && !!back && back.size === 64;
    /* باکس هوشمند */
    const D = { title: 'سارا', inc: 30000000, incPaid: 30000000, exp: 9700000, expPaid: 9700000, expUnpaid: 0, led: { credit: 2000000, debt: 500000, list: [{ who: 'علی', amount: 2000000, type: 'credit' }, { who: 'رضا', amount: 500000, type: 'debt' }] } };
    const el = document.createElement('div'); el.innerHTML = spPageOverview(D);
    const blk = el.querySelector('.sp-blk');
    out.ov = [blk.children[0].className, blk.children[0].querySelector('.sp-v').textContent, blk.children[1].className.indexOf('sp-tube') >= 0, blk.children[2].className.indexOf('sp-right') >= 0, blk.children[2].textContent].join('|');
    el.innerHTML = spPageLedger(D);
    out.led = [...el.querySelectorAll('.sp-tip')].map(x => x.textContent).join(' | ');
    periodData.expense.sections[0].rows = [['انتقال به کارت مامان', 9000000], ['نان', 200000], ['بنزین', 500000]].map(([d, a], k) => Object.assign(emptyRow('expense'), { day: String(k + 2), desc: d, amount: a, status: 'paid' }));
    el.innerHTML = spPageBiggest({ title: t });
    out.big = [el.querySelector('.sp-h').textContent, el.querySelector('.sp-item .sp-l').textContent, el.querySelector('.sp-item .sp-v').textContent].join('|');
    return out;
  });
  /* ۱.۳.۶۸: ستون روز همان ۲٫۴em؛ شرح عرض ثابت ندارد و هرچه از ستون مبلغِ باریک‌شده بماند مال اوست */
  ok(u.cols === '2.4em,', 'ستون روز ۲٫۴em و شرح باقی عرض (' + u.cols + ')');
  ok(u.normal && !u.msOn, 'جستجو فقط یک جدول دارد: «نتیجهٔ جستجو» (جدول ماه‌ها برداشته شد)');
  ok(u.td === 'rgba(0, 0, 0, 0)' && u.fh, 'جدول‌های جستجو مثل جدول‌های درآمد/مخارج (ردیف‌ها روی زمینهٔ جدول)؛ کادر فیلترها همرنگ عنوان جدول‌ها');
  ok(u.x === 'rgba(0, 0, 0, 0),rgba(0, 0, 0, 0),rgb(255, 69, 58),rgb(255, 69, 58)' && u.play === '26px', '× پیوست‌ها بی پس‌زمینه (فقط ضربدر قرمز)؛ دکمهٔ پخش کوچک‌تر (' + u.x + ' / ' + u.play + ')');
  ok(/پیوست‌ها هم پشتیبان شوند/.test(u.ask) && /۲ فایل/.test(u.ask) && u.round, 'پشتیبان دستی: پیشنهاد پشتیبان از عکس‌ها و صداها؛ فایل‌ها در پشتیبان ذخیره و با بازیابی برمی‌گردند');
  ok(/^sp-row\|.*٪.*\|true\|true\|.*میلیون/.test(u.ov), 'وضعیت این ماه: درصد بالای لوله (چپ‌چین)، مبلغ زیر لوله (راست‌چین) (' + u.ov + ')');
  ok(u.led === '«سارا» از «علی» ۲ میلیون طلبکار است | «سارا» به «رضا» ۵۰۰,۰۰۰ بدهکار است', 'طلب و بدهی: «x از y مبلغ طلبکار است» / «x به y مبلغ بدهکار است»');
  /* ۱.۳.۶۸: اسلاید «بزرگ‌ترین خرج‌های ماه»: هر خرج یک سطر (شرح و مبلغ) */
  ok(/^بزرگ‌ترین خرج‌های ماه\|انتقال به کارت مامان\|۹ میلیون$/.test(u.big), 'بزرگ‌ترین خرج‌ها: شرح و مبلغ هر خرج در یک سطر (' + u.big + ')');

  ok(errors.length === 0, 'بدون خطای JS' + (errors.length ? ': ' + errors.join(' | ') : ''));
  console.log(`\n${passed} passed, ${failed} failed`);
  await b.close();
  process.exit(failed ? 1 : 0);
})();

// نسخهٔ ۱.۳.۲۹: فیلترهای جستجو (اسم فیلتر داخل باکس، طوسی؛ فهرست سفید؛ شرح دوبرابر؛ C برای مبلغ)،
// جدول آرشیو درآمد ثابت مثل جدول درآمد/مخارج، و حرکت بی‌پرش بازه/پوشه‌ها در ثبت گروهی. فقط دادهٔ مصنوعی.
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');

let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const T = (y, m, d, h) => Date.UTC(y, m - 1, d, h || 8);

(async () => {
  const b = await chromium.launch();
  const errors = [];
  const inbox = [];
  for (let i = 0; i < 3; i++) inbox.push({ address: 'Bank Mellat', date: T(2026, 10, 3 + i), body: 'بانک ملت\nبرداشت 10,000\nحساب 0000***' + (1000 + i) + '\nمانده ' + (900000 - i * 1000).toLocaleString('en') });
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, hasTouch: true });
  await ctx.addInitScript(() => { ['tourDone', 'bankSetupDone', 'cardSwipeHintDone', 'recCleanupAsked'].forEach(k => localStorage.setItem('hesabKetabArchive_v5_' + k, '1')); });
  await ctx.addInitScript({ content: `window.__inbox = ${JSON.stringify(inbox)};
    window.Capacitor = { isNativePlatform: () => true, Plugins: { BankSms: { readInbox: () => Promise.resolve({ items: window.__inbox }), getAllPending: () => Promise.resolve({ items: [] }), getPendingSms: () => Promise.resolve({ has: false }), cancelHandledNotifications: () => Promise.resolve(), permStatus: () => Promise.resolve({ sms: true, notif: true }) } } };` });
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
  await p.clock.setFixedTime(new Date('2026-10-13T09:00:00Z'));
  await p.goto(INDEX); await p.waitForTimeout(1600);

  console.log('• فیلترهای جستجو');
  const f = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    periodData.expense.sections = [{ id: 's1', title: 'سارا', rows: [Object.assign(emptyRow('expense'), { day: '2', desc: 'نان', amount: 30000, status: 'paid' })] }];
    persistCurrent(); renderAll();
    openPersonDetail('سارا', 'balance'); await w(500);
    const cells = [...document.querySelectorAll('#balanceFixedHeader .bsr-cell:not(.bs-arange-row)')];
    const sel = cells.filter(c => c.querySelector('.fancy-select-btn, .dark-select-btn'));
    const out = {};
    out.def = sel.map(c => { const bt = c.querySelector('.fancy-select-btn, .dark-select-btn'); const bs = getComputedStyle(bt, '::before'); return { name: bt.dataset.name, def: bt.classList.contains('bsr-def'), before: bs.content, fs: getComputedStyle(bt).fontSize, col: bs.color, align: getComputedStyle(bt).textAlign }; });
    out.labelsHidden = cells.every(c => getComputedStyle(c.querySelector('.balance-acc-label')).display === 'none');
    /* «نوع» → «برداشت» */
    const ty = document.getElementById('balanceSearchType'), tyBtn = ty.parentNode.querySelector('.fancy-select-btn');
    tyBtn.click(); await w(80);
    const list = ty._fancyList;
    out.listOpts = [...list.querySelectorAll('.fancy-select-opt')].map(o => ({ t: o.textContent, sel: o.classList.contains('selected'), c: getComputedStyle(o).color }));
    [...list.querySelectorAll('.fancy-select-opt')].find(o => o.textContent === 'برداشت').click(); await w(80);
    out.afterPick = { def: tyBtn.classList.contains('bsr-def'), txt: tyBtn.textContent, fs: getComputedStyle(tyBtn).fontSize };
    /* شرح و مبلغ */
    const desc = document.getElementById('balanceSearchInput'), dW = desc.getBoundingClientRect().width, oneW = sel[0].getBoundingClientRect().width;
    out.desc = { ph: desc.placeholder, ratio: Math.round(dW / oneW * 100) / 100, align: getComputedStyle(desc).textAlign };
    const mn = document.getElementById('balanceSearchAmtMin'), clr = mn.parentNode.querySelector('.bs-amt-clr');
    out.amt = { ph: mn.placeholder, hint: mn.getAttribute('enterkeyhint'), clrHidden0: getComputedStyle(clr).display === 'none' };
    mn.value = '50000'; mn.dispatchEvent(new Event('input', { bubbles: true })); await w(80);
    out.amt.clrShown = getComputedStyle(clr).display !== 'none' && clr.textContent === 'C';
    clr.click(); await w(80);
    out.amt.cleared = mn.value === '' && getComputedStyle(clr).display === 'none';
    resetBalanceSearch(); await w(80);
    out.resetDef = tyBtn.classList.contains('bsr-def');
    closePersonDetail(); await w(200);
    return out;
  });
  ok(f.def.length === 6 && f.def.every(x => x.def && x.before === '"' + x.name + '"' && x.fs === '0px'), 'در حالت پیش‌فرض داخل هر باکس فقط اسم فیلتر (' + f.def.map(x => x.name).join('، ') + ')');
  ok(f.def.every(x => { const m = x.col.match(/\d+/g).map(Number); return m[0] > 110 && m[0] < 185 && Math.abs(m[0] - m[2]) < 12 && x.align === 'right'; }) && f.labelsHidden, 'نوشتهٔ باکس‌ها طوسی و راست‌چین؛ برچسب بیرونی نیست');
  ok(f.listOpts[0].t === 'همه' && f.listOpts[0].sel && f.listOpts.every(o => o.c === 'rgb(255, 255, 255)'), 'با باز شدن: «همه» انتخاب‌شده و بالا، گزینه‌ها سفید (' + f.listOpts.map(o => o.t).join('، ') + ')');
  ok(!f.afterPick.def && f.afterPick.txt === 'برداشت' && f.afterPick.fs !== '0px' && f.resetDef, 'گزینهٔ غیرپیش‌فرض در باکس دیده می‌شود («برداشت») و با پاک کردن جستجو دوباره «نوع»');
  ok(f.desc.ph === 'جستجوی شرح' && f.desc.ratio >= 1.9 && f.desc.align === 'right', 'باکس شرح: فقط «جستجوی شرح» داخلش، دو برابر بقیه (×' + f.desc.ratio + ')');
  ok(f.amt.ph === 'مبلغ از' && f.amt.hint === 'done' && f.amt.clrHidden0 && f.amt.clrShown && f.amt.cleared, 'مبلغ: دکمهٔ «C» داخل باکس عدد را پاک می‌کند؛ دکمهٔ کیبورد «تأیید»');

  console.log('• جدول آرشیو درآمد ثابت');
  const a = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const item = { id: 'rq1', name: 'اجاره واحد', amount: 8000000, day: 4, sectionId: 's1', sectionTitle: 'سارا', contractStart: { d: 4, m: 6, y: 1405 }, contractEnd: { d: 4, m: 6, y: 1406 }, fromKey: 140406, genKey: 140406 };
    recurringIncomes.push(item);
    const r = Object.assign(emptyRow('income'), { day: '4', desc: 'اجارهٔ واحد دوم طبقهٔ سوم ساختمان شمالی بابت شهریور ماه و قبض‌ها', amount: 8000000, status: 'paid', fromRecurringId: 'rq1' });
    periodData.income.sections = [{ id: 's1', title: 'سارا', rows: [r] }];
    persistCurrent(); saveArchive();
    recOpenArchive(item, 0); await w(150);
    const m = document.getElementById('recArchiveModal'), t = m.querySelector('table');
    const th = t.querySelector('thead th'), amt = t.querySelector('.pd-amt'), d = t.querySelector('.rec-arch-desc');
    const out = { cls: t.className, thBg: getComputedStyle(th).backgroundColor, amtCol: getComputedStyle(amt).color, h0: Math.round(d.getBoundingClientRect().height), ws0: getComputedStyle(d).whiteSpace };
    d.click(); await w(50);
    out.h1 = Math.round(d.getBoundingClientRect().height); out.ws1 = getComputedStyle(d).whiteSpace;
    m._hkCancel && m._hkCancel(); const m2 = document.getElementById('recArchiveModal'); if (m2) m2.remove();
    return out;
  });
  ok(/person-detail-table/.test(a.cls) && a.thBg === 'rgb(10, 22, 40)' && a.amtCol === 'rgb(158, 232, 88)', 'آرشیو: همان جدول درآمد/مخارج (ردیف تایتل ' + a.thBg + '، مبلغ دریافت‌شده سبز)');
  ok(a.ws0 === 'nowrap' && a.ws1 === 'normal' && a.h1 > a.h0, 'شرح طولانی یک‌خطی است و با زدن رویش کامل نشان داده می‌شود (' + a.h0 + '→' + a.h1 + 'px)');

  console.log('• ثبت گروهی: جمع شدن بازه و آمدن پوشه‌ها بی‌پرش');
  const mv = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    openSmsBulkModal(); await w(200);
    const box = document.querySelector('#smsBulkOv .hk-bulk-box');
    const hs = []; let foldersAt = -1, wrapGoneAt = -1, i = 0;
    hkBulkRead();
    const t0 = performance.now();
    while (performance.now() - t0 < 1400) {
      await new Promise(r => requestAnimationFrame(r));
      hs.push(box.getBoundingClientRect().height);
      const wr = document.querySelector('#smsBulkOv .hk-bulk-rwrap');
      if (wrapGoneAt < 0 && wr && getComputedStyle(wr).display === 'none') wrapGoneAt = i;
      if (foldersAt < 0 && document.querySelector('#hkBulkList .hk-bulk-folder')) foldersAt = i;
      i++;
    }
    let maxStep = 0; for (let k = 1; k < hs.length; k++) maxStep = Math.max(maxStep, Math.abs(hs[k] - hs[k - 1]));
    const total = Math.max(...hs) - Math.min(...hs);
    closeSmsBulkModal();
    return { hs: hs.map(Math.round), maxStep: Math.round(maxStep), total: Math.round(total), frames: hs.length, foldersAt, wrapGoneAt };
  });
  ok(mv.wrapGoneAt >= 0 && mv.foldersAt >= mv.wrapGoneAt, 'اول بازه جمع شد، بعد پوشه‌ها آمدند');
  ok(mv.maxStep <= Math.max(40, mv.total * 0.35), 'ارتفاع باکس پیوسته عوض شد، بی‌پرش (بیشترین گام ' + mv.maxStep + 'px از ' + mv.total + 'px در ' + mv.frames + ' فریم)');

  ok(errors.length === 0, 'بدون خطای JS' + (errors.length ? ': ' + errors.join(' | ') : ''));
  console.log(`\n${passed} passed, ${failed} failed`);
  await b.close();
  process.exit(failed ? 1 : 0);
})();

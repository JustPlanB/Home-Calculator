// ۱.۴.۲۰ — بخش ۵: جیب به جیب (فقط همان روز، باکس مقایسه، پیش‌انتخاب در باکس ثبت)، چنددسته در ویرایش ردیف، انتخاب‌نشدن متن ردیف،
// حلقهٔ چرخان دستهٔ انتخابی، جدول تراکنش‌های دسته. فقط دادهٔ ساختگی.
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');
const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1', [P + '_p2pIntro']: '1' };
let failed = 0, passed = 0;
function ok(c, m) { if (c) { passed++; console.log('  ✓ ' + m); } else { failed++; console.log('  ✗ ' + m); } }
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 384, height: 750 }, timezoneId: 'Asia/Tehran', hasTouch: true });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, BASE_LS);
  const page = await ctx.newPage(); page.on('pageerror', e => errs.push(e.message));
  await page.goto(INDEX); await page.waitForTimeout(2200);

  console.log('• جفت‌یابی جیب به جیب: فقط همان روز');
  const A = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)); const o = {};
    selectedBankAccounts.push({ id: 'a1', bank: 'بانک ملت', label: 'ملت نمونه', openingBalance: 0, createdAt: { y: 1400, m: 1 } });
    selectedBankAccounts.push({ id: 'a2', bank: 'بانک ملی', label: 'ملی نمونه', openingBalance: 0, createdAt: { y: 1400, m: 1 } });
    normalizeSelectedBanks(); saveBankAccountsSelection();
    const t = hkMainTitle(), ex = findSectionByTitle('expense', t), inc = findSectionByTitle('income', t), now = Date.now();
    /* ثبت گروهی: زمان ساخت یکسان، دو هفته فاصلهٔ روز ← نباید جفت شود */
    ex.rows = [Object.assign(emptyRow('expense'), { day: '2', desc: 'برداشت الف', amount: 410000, status: 'paid', account: 'ملت نمونه', createdAt: now })];
    inc.rows = [Object.assign(emptyRow('income'), { day: '16', desc: 'واریز الف', amount: 410000, status: 'paid', account: 'ملی نمونه', createdAt: now })];
    /* واریز از کارت دیگران به کارت من و برداشت همان مبلغ از همان کارت، همان روز ← جیب به جیب نیست */
    inc.rows.push(Object.assign(emptyRow('income'), { day: '5', desc: 'واریز ب', amount: 777000, status: 'paid', account: 'ملی نمونه', createdAt: now }));
    ex.rows.push(Object.assign(emptyRow('expense'), { day: '5', desc: 'برداشت ب', amount: 777000, status: 'paid', account: 'ملی نمونه', createdAt: now }));
    o.n1 = hkP2PFindPairs().length;
    /* همان روز، دو کارت خودم، ساعت‌های دور از هم ← جفت */
    ex.rows.push(Object.assign(emptyRow('expense'), { day: '9', desc: 'برداشت ج', amount: 530000, status: 'paid', account: 'ملت نمونه', time: '08:10', createdAt: now }));
    inc.rows.push(Object.assign(emptyRow('income'), { day: '9', desc: 'واریز ج', amount: 530000, status: 'paid', account: 'ملی نمونه', time: '22:40', createdAt: now }));
    o.n2 = hkP2PFindPairs().length;
    persistCurrent(); await w(1500);
    const ask = document.getElementById('hkP2PAsk');
    o.cards = ask ? ask.querySelectorAll('.hk-dc-card').length : 0;
    o.txt = ask ? ask.textContent : '';
    if (ask) ask.querySelector('.hk-p2p-no').click();
    await w(300);
    return o;
  });
  ok(A.n1 === 0, 'دو هفته فاصله (حتی با زمان ثبت یکسان) و واریز/برداشتِ همان کارت: جیب به جیب پیشنهاد نمی‌شود');
  ok(A.n2 === 1, 'همان روز، دو کارت خودم: جفت پیدا می‌شود (ساعت فرقی نمی‌کند)');
  ok(A.cards === 2 && /ملت نمونه/.test(A.txt) && /ملی نمونه/.test(A.txt) && /۵۳۰/.test(A.txt) && /برداشت/.test(A.txt) && /واریز/.test(A.txt), 'باکس سؤال: دو کارت (برداشت و واریز)، هر کارت مبلغ، روز، ساعت و بانک (۱.۴.۲۱)');

  console.log('• پیش‌انتخاب در باکس ثبت پیامک');
  const B = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)); const o = {};
    const t = hkMainTitle(), ex = findSectionByTitle('expense', t);
    ex.rows.push(Object.assign(emptyRow('expense'), { day: '12', desc: 'برداشت د', amount: 260000, status: 'paid', account: 'ملت نمونه', createdAt: Date.now() }));
    persistCurrent(); await w(1300); document.querySelectorAll('#hkP2PAsk').forEach(x => x.remove());
    const pe = { raw: 'بانك ملي\nواريز:260,000+\n0812-11:00', amount: 260000, type: 'income', bank: 'ملی نمونه', day: '12', month: currentMonth, year: currentYear };
    pendingSmsEntry = pe; openSmsConfirmModal(pe); await w(300);
    const bs = document.getElementById('smsConfirmBank'); if (bs) { bs.value = 'ملی نمونه'; }
    hkSmsCatGrid(pe); await w(100);
    const d = document.getElementById('smsConfirmDesc');
    o.sel = window._hkSmsCat; o.desc = d.value;
    d.focus(); d.click(); await w(50);
    o.all = d.selectionStart === 0 && d.selectionEnd === d.value.length;
    confirmSmsEntry(); await w(1600);
    const r1 = findSectionByTitle('expense', t).rows.find(r => r.desc === 'برداشت د'), r2 = [];
    findSectionByTitle('income', t).rows.forEach(r => { if (Number(r.amount) === 260000) r2.push(r); });
    o.dbg = JSON.stringify({ r1: r1 && { p2p: r1.p2p, pd: r1.p2pPaired, ask: r1.p2pAsked, no: r1.p2pNo }, r2: r2.map(r => ({ p2p: r.p2p, pd: r.p2pPaired, d: r.day, acc: r.account, ca: r.createdAt })), pairs: hkP2PFindPairs().length, busy: [...document.querySelectorAll('.modal-overlay.open, [data-hk-back]')].filter(x => x.getClientRects().length).map(x => x.id || x.className).join(',') });
    o.paired = !!(r1 && r1.p2pPaired && r2[0] && r2[0].p2pPaired);
    o.ask = !!document.getElementById('hkP2PAsk');
    return o;
  });
  ok(B.sel === 'p2p' && B.desc === 'جیب به جیب', 'جفتِ ثبت‌شده هست: «جیب به جیب» پیش‌انتخاب و شرح «جیب به جیب»');
  ok(B.all, 'یک لمس روی شرح: کل «جیب به جیب» انتخاب می‌شود');
  ok(B.paired && !B.ask, 'بعد از ثبت، دو طرف بی‌سؤال جفت شدند ' + (B.paired ? '' : B.dbg));

  console.log('• چنددسته در ویرایش ردیف');
  const C = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)); const o = {};
    const t = hkMainTitle(), sec = findSectionByTitle('expense', t);
    const row = Object.assign(emptyRow('expense'), { day: '5', desc: 'خرید نمونه الف', amount: 120000, status: 'paid' }); sec.rows.push(row);
    HKCategorizer.learn('خرید نمونه الف', ['food', 'home']); persistCurrent();
    hkOpenRowEdit({ row, tab: 'expense', title: t, sec, num: 1, onSaved: function () {} }); await w(300);
    const cb = [...document.querySelectorAll('#hkRowEdit .hk-re-sel')].find(x => /دسته/.test(x.textContent));
    const cnt = cb.querySelector('.hk-re-cnt'), rv = cb.querySelector('.hk-re-rv'), ch = cb.querySelector('.hk-re-chev');
    o.cnt = cnt && cnt.textContent; o.first = rv.textContent;
    const rc = cnt.getBoundingClientRect(), rr = rv.getBoundingClientRect(), hc = ch.getBoundingClientRect();
    o.between = rc.right <= rr.left + 1 && rc.left >= hc.right - 1; /* راست‌به‌چپ: اسم، بعد دایره، بعد فلش */
    o.bg = getComputedStyle(cnt).backgroundColor; o.col = getComputedStyle(cnt).color;
    cb.click(); await w(250);
    o.on = [...document.querySelectorAll('#hkCatPick .sms-cat.on')].map(x => x.dataset.cat).sort().join(',');
    o.ring = getComputedStyle(document.querySelector('#hkCatPick .sms-cat.on i'), '::after').animationName;
    document.querySelector('#hkCatPick .sms-cat[data-cat="transport"]').click(); await w(50);
    document.querySelector('#hkCatPick .hk-cp-ok').click(); await w(100);
    o.cnt2 = (cb.querySelector('.hk-re-cnt') || {}).textContent;
    document.querySelector('#hkRowEdit .hk-re-ok').click(); await w(300);
    o.cats = (row.cats || []).join(',');
    return o;
  });
  ok(C.first === 'خوراکی' && C.cnt === '+۱' && C.between, 'اسم دستهٔ اول و دایرهٔ «+۱» بین اسم و فلش');
  ok(C.col === 'rgb(8, 181, 245)' && /rgba\(8, 181, 245/.test(C.bg), 'دایره آبی کمی تیره‌تر با نوشتهٔ آبی نرم‌افزار');
  ok(C.on === 'food,home', 'باز شدن دسته‌ها: هر دو دسته انتخاب‌شده دیده می‌شوند');
  ok(C.ring === 'hkCatSpin', 'دور دستهٔ انتخاب‌شده نوار چرخان');
  ok(C.cnt2 === '+۲' && C.cats === 'food,home,transport', 'دستهٔ سوم: «+۲» و ذخیرهٔ هر سه دسته');

  console.log('• انتخاب‌نشدن متن ردیف');
  const D = await page.evaluate(async () => {
    openPersonDetail(hkMainTitle(), 'expense'); await new Promise(r => setTimeout(r, 600));
    const el = document.querySelector('tbody tr textarea[readonly], tbody tr input[readonly]') || document.querySelector('tbody tr td');
    const ev = new Event('selectstart', { bubbles: true, cancelable: true }); el.dispatchEvent(ev);
    const cm = new Event('contextmenu', { bubbles: true, cancelable: true }); el.dispatchEvent(cm);
    return { pre: ev.defaultPrevented, cm: cm.defaultPrevented, us: getComputedStyle(el).userSelect || getComputedStyle(el).webkitUserSelect };
  });
  ok(D.pre && D.cm && D.us === 'none', 'لانگ‌پرس روی ردیف: شروع انتخاب متن و منوی متن گرفته می‌شود');

  console.log('• جدول تراکنش‌های دسته');
  const E = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)); const o = {};
    const t = hkMainTitle(), sec = findSectionByTitle('expense', t);
    sec.rows.push(Object.assign(emptyRow('expense'), { day: '7', desc: 'نان سنگک نمونه', amount: 60000, status: 'paid', account: 'ملت نمونه' }));
    HKCategorizer.learn('نان سنگک نمونه', ['food']); persistCurrent();
    openCategoryReviewSheet(t); await w(900);
    const row = [...document.querySelectorAll('.sp-cat-sheet .sp-cat-row')].find(x => /نان سنگک نمونه/.test(x.textContent));
    row.querySelector('.sp-cat-desc').click(); await w(900);
    let tx = document.getElementById('hkStCatTx'), tb = tx && tx.querySelector('table.hk-stcat-t');
    o.head = tb ? [...tb.querySelectorAll('thead th')].map(x => x.textContent).join('|') : '';
    const tr = tb && [...tb.querySelectorAll('tbody tr')].find(x => /نان سنگک نمونه/.test(x.textContent));
    o.acc = tr ? tr.children[3].textContent : '';
    o.center = tr ? [...tr.children].every(td => getComputedStyle(td).textAlign === 'center') : false;
    o.hbg = tb ? getComputedStyle(tb.querySelector('thead th')).backgroundColor : '';
    o.grid = tr ? getComputedStyle(tr.children[0]).borderLeftWidth : '';
    o.fit = tb ? [...tb.querySelectorAll('td.hk-fit')].every(td => td.scrollWidth <= td.clientWidth + 1) : false;
    const dtd = tr && tr.querySelector('td.hk-stcat-d'); if (dtd) { dtd.click(); await w(200); }
    o.pop = !!document.querySelector('.cell-text-popup, .hk-cell-pop, [class*="cell-text"]');
    tx.querySelector('.hk-bulk-close').click(); await w(300);
    /* شرحِ جیب به جیب ← جدول همهٔ جیب به جیب‌ها */
    const p2 = [...document.querySelectorAll('.sp-cat-sheet .sp-cat-row')].find(x => /برداشت د/.test(x.textContent));
    o.p2row = !!p2;
    if (p2) { p2.querySelector('.sp-cat-desc').click(); await w(900); }
    tx = document.getElementById('hkStCatTx'); tb = tx && tx.querySelector('table.hk-stcat-t');
    o.p2title = tx ? (tx.querySelector('.hk-pg-t, .hk-bulk-title') || {}).textContent : '';
    o.p2rows = tb ? tb.querySelectorAll('tbody tr').length : 0;
    return o;
  });
  ok(E.head === 'تاریخ|شرح|مبلغ|حساب' && E.acc === 'ملت نمونه', 'جدول: ستون آخر «حساب» با نام حساب همان تراکنش');
  ok(E.center && E.grid === '1px' && E.hbg !== 'rgba(0, 0, 0, 0)' && E.fit, 'خط‌کشی، سرستون رنگی، همه وسط‌چین، نوشته‌ها کامل در عرض ستون');
  ok(E.pop, 'یک ضربه روی شرح: باکس شناور تک‌خطی');
  ok(E.p2row && /جیب به جیب/.test(E.p2title || '') && E.p2rows >= 2, 'زدن شرحِ جیب به جیب: جدول همهٔ جیب به جیب‌ها (واریز و برداشت)');
  ok(errs.length === 0, 'خطای اسکریپت ندارد ' + errs.join('|').slice(0, 160));
  console.log('batch-1416: ' + passed + ' passed, ' + failed + ' failed');
  await b.close(); process.exit(failed ? 1 : 0);
})();

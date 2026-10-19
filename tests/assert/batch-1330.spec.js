// نسخهٔ ۱.۳.۳۰: پوشهٔ شخصی بی‌خط‌چین، کادر آبی/قرمز حساب، فاصلهٔ شرح و نوار خلاصهٔ آرشیو، حرکت یک‌طرفهٔ ثبت گروهی با نوار فلش‌دار،
// فیلترهای هم‌ارتفاع، مبلغ چپ‌به‌راست با «C» نارنجی سمت راست، و اسلایدر بازهٔ مبلغ با درجه‌های خودکار. فقط دادهٔ مصنوعی.
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
  inbox.push({ address: '+989351112233', date: T(2026, 10, 10), body: 'بانک ملت\nبرداشت 1,000,000\nحساب 0000***7777\nمانده 9,000,000' });
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, hasTouch: true });
  await ctx.addInitScript(() => { ['tourDone', 'bankSetupDone', 'cardSwipeHintDone', 'recCleanupAsked', 'instRevert1337'].forEach(k => localStorage.setItem('hesabKetabArchive_v5_' + k, '1')); });
  await ctx.addInitScript({ content: `window.__inbox = ${JSON.stringify(inbox)};
    window.Capacitor = { isNativePlatform: () => true, Plugins: { BankSms: { readInbox: () => Promise.resolve({ items: window.__inbox }), getAllPending: () => Promise.resolve({ items: [] }), getPendingSms: () => Promise.resolve({ has: false }), cancelHandledNotifications: () => Promise.resolve(), permStatus: () => Promise.resolve({ sms: true, notif: true }) } } };` });
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
  await p.clock.setFixedTime(new Date('2026-10-13T09:00:00Z'));
  await p.goto(INDEX); await p.waitForTimeout(1600);

  console.log('• ثبت گروهی: یک حرکت یک‌طرفه، نوار بازه با فلش');
  const mv = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    selectedBankAccounts.push({ id: 'bx1', bank: 'بانک ملی', label: 'ملی', openingBalance: 0, createdAt: { y: 1405, m: 7, d: 1 } }); saveBankAccountsSelection();
    openSmsBulkModal(); await w(200);
    const ov = document.getElementById('smsBulkOv'), box = ov.querySelector('.hk-bulk-box');
    const hs = [];
    hkBulkRead();
    const t0 = performance.now();
    while (performance.now() - t0 < 1000) { await new Promise(r => requestAnimationFrame(r)); hs.push(box.getBoundingClientRect().height); }
    let up = 0, down = 0, maxStep = 0;
    for (let k = 1; k < hs.length; k++) { const d = hs[k] - hs[k - 1]; if (d > 0.5) up++; if (d < -0.5) down++; maxStep = Math.max(maxStep, Math.abs(d)); }
    const bar = ov.querySelector('.hk-bulk-rbar'), wrap = ov.querySelector('.hk-bulk-rwrap');
    const out = { up, down, maxStep: Math.round(maxStep), total: Math.round(Math.max(...hs) - Math.min(...hs)), frames: hs.length };
    out.bar = { shown: getComputedStyle(bar).display !== 'none', txt: bar.textContent, chev: !!bar.querySelector('.hk-chev svg'), pencil: /✎/.test(bar.textContent), open: bar.classList.contains('ropen') };
    out.wrapHidden = getComputedStyle(wrap).display === 'none';
    bar.click(); await w(650);
    out.reopen = { wrap: getComputedStyle(wrap).display !== 'none', bar: getComputedStyle(bar).display !== 'none', rot: bar.classList.contains('ropen') };
    bar.click(); await w(650);
    out.reclose = { wrap: getComputedStyle(wrap).display === 'none', bar: getComputedStyle(bar).display !== 'none', rot: !bar.classList.contains('ropen') };
    return out;
  });
  ok(mv.down === 0 && mv.up > 4, 'ارتفاع باکس فقط در یک جهت عوض شد (' + mv.up + ' فریم بالا، ' + mv.down + ' فریم پایین؛ بی جمع‌شدن و باز شدن دوباره)');
  ok(mv.maxStep <= Math.max(40, mv.total * 0.2), 'حرکت پیوسته و آرام (بیشترین گام ' + mv.maxStep + 'px از ' + mv.total + 'px در ' + mv.frames + ' فریم)');
  ok(mv.bar.shown && mv.wrapHidden && /بازه: ۱ مهر تا ۲۱ مهر/.test(mv.bar.txt) && mv.bar.chev && !mv.bar.pencil && !mv.bar.open, 'بعد از خواندن، نوار «' + mv.bar.txt.trim() + '» با فلش (بی ✎) ماند');
  ok(mv.reopen.wrap && mv.reopen.bar && mv.reopen.rot && mv.reclose.wrap && mv.reclose.bar && mv.reclose.rot, 'زدن نوار بازه را باز می‌کند و فلش می‌چرخد؛ زدن دوباره می‌بندد؛ نوار همیشه می‌ماند');

  console.log('• پوشهٔ شخصی و کادر حساب');
  const fo = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const pc = document.querySelector('.hk-bulk-folder.personal');
    const cs0 = getComputedStyle(pc);
    const out = { style0: cs0.borderTopStyle, bc0: cs0.borderTopColor, bg: cs0.backgroundColor };
    pc.querySelector('.hk-bulk-chk').click(); await w(60);
    const cs1 = getComputedStyle(pc), dsel = pc.querySelector('.hk-bulk-dsel');
    out.style1 = cs1.borderTopStyle; out.bc1 = cs1.borderTopColor; out.bw1 = cs1.borderTopWidth;
    out.pick = pc.classList.contains('pick'); out.need = pc.classList.contains('need'); out.outline = getComputedStyle(dsel).outlineColor;
    document.querySelector('.hk-bulk-ok').click(); await w(150);
    out.afterOk = { need: pc.classList.contains('need'), outline: getComputedStyle(dsel).outlineColor, sum: !!document.querySelector('.hk-bulk-sum') };
    dsel.setValue && dsel.setValue('');
    const it = [...dsel._list.querySelectorAll('.dark-select-item')].find(x => x.dataset.value && x.dataset.value !== '__add_account__');
    if (it) it.click(); await w(60);
    out.afterPick = { need: pc.classList.contains('need'), pick: pc.classList.contains('pick') };
    pc.querySelector('.hk-bulk-chk').click(); await w(60);
    out.unchecked = !pc.classList.contains('need') && !pc.classList.contains('pick');
    closeSmsBulkModal();
    return out;
  });
  ok(fo.style0 !== 'dashed' && fo.style1 !== 'dashed' && /255, 159, 10/.test(fo.bg), 'پوشهٔ شخصی: بی‌خط‌چین، پس‌زمینهٔ نارنجی (' + fo.bg + ')');
  ok(fo.bc0 === 'rgba(0, 0, 0, 0)' && fo.bc1 === 'rgb(255, 159, 10)' && fo.bw1 === '1px', 'با تیک خوردن، دورش یک خط نازک نارنجی');
  ok(fo.pick && !fo.need && fo.outline === 'rgb(10, 132, 255)', 'پوشهٔ تیک‌خوردهٔ بی‌حساب: کادر حساب آبی');
  ok(fo.afterOk.need && fo.afterOk.outline === 'rgb(255, 69, 58)' && !fo.afterOk.sum, 'زدن «ثبت» بدون انتخاب حساب → کادر قرمز و ثبت نشد');
  ok(!fo.afterPick.need && !fo.afterPick.pick && fo.unchecked, 'با انتخاب حساب (یا برداشتن تیک) رنگ کادر رفت');

  console.log('• آرشیو درآمد ثابت');
  const ar = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const item = { id: 'rq1', name: 'اجاره واحد', amount: 8000000, day: 4, sectionId: 's1', sectionTitle: 'سارا', contractStart: { d: 4, m: 6, y: 1405 }, contractEnd: { d: 4, m: 6, y: 1406 }, fromKey: 140406, genKey: 140406 };
    recurringIncomes.push(item);
    periodData.income.sections = [{ id: 's1', title: 'سارا', rows: [Object.assign(emptyRow('income'), { day: '4', desc: 'اجارهٔ مهر', amount: 8000000, status: 'paid', fromRecurringId: 'rq1' })] }];
    persistCurrent(); saveArchive();
    recOpenArchive(item, 0); await w(150);
    const m = document.getElementById('recArchiveModal');
    const td = m.querySelector('.rec-arch-desc').parentNode, cs = getComputedStyle(td);
    const sum = m.querySelector('.rec-arch-sum'), parts = sum ? [...sum.children] : [];
    const out = { pr: cs.paddingRight, pl: cs.paddingLeft, n: parts.length, sumW: sum ? Math.round(sum.getBoundingClientRect().width) : 0, headW: Math.round(sum.parentNode.getBoundingClientRect().width), divs: parts.slice(1).map(x => getComputedStyle(x).borderRightStyle), tops: parts.map(x => Math.round(x.getBoundingClientRect().top)), cols: parts.map(x => getComputedStyle(x.querySelector('b')).color) };
    m.remove();
    return out;
  });
  ok(ar.pr === '8px' && ar.pl === '8px', 'شرح جدول آرشیو با فاصلهٔ ۸px از لبه (مثل بقیهٔ جدول‌ها)');
  ok(ar.n === 3 && new Set(ar.tops).size === 1 && ar.divs.every(x => x === 'solid') && ar.sumW >= ar.headW - 30, 'جمع دریافتی / دریافت‌شده / دریافت نشده: یک نوار تمام‌عرض با خط‌های عمودی');
  ok(ar.cols[0] === 'rgb(48, 209, 88)' && ar.cols[2] === 'rgb(255, 107, 74)', 'عددهای سبز/قرمز همان قبلی');

  console.log('• فیلترهای جستجو، مبلغ و اسلایدر');
  const f = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const rows = []; for (let i = 1; i <= 40; i++) rows.push(Object.assign(emptyRow('expense'), { day: String(i % 28 + 1), desc: 'خرید ' + i, amount: i * 700000, status: 'paid' }));
    periodData.expense.sections = [{ id: 's1', title: 'سارا', rows }];
    periodData.income.sections = [];
    persistCurrent(); renderAll();
    openPersonDetail('سارا', 'balance'); await w(500);
    const out = {};
    out.amtHidden = [...document.querySelectorAll('#balanceFixedHeader .bs-amt-row')].every(c => getComputedStyle(c).display === 'none');
    out.hs = [...document.querySelectorAll('#balanceFixedHeader .bsr-cell:not(.bs-arange-row):not(.bs-amt-row)')].map(c => { const e = c.querySelector('.fancy-select-btn, .dark-select-btn, input:not([type=hidden])'); return Math.round(e.getBoundingClientRect().height); });
    const mn = document.getElementById('balanceSearchAmtMin'), mx = document.getElementById('balanceSearchAmtMax'), clr = mn.parentNode.querySelector('.bs-amt-clr');
    const pcs = getComputedStyle(mn, '::placeholder');
    out.ph = { align: pcs.textAlign };
    out.clr0 = getComputedStyle(clr).display;
    mn.value = '2500000'; mn.dispatchEvent(new Event('input', { bubbles: true })); await w(300);
    const ir = mn.getBoundingClientRect(), cr = clr.getBoundingClientRect(), ccs = getComputedStyle(clr);
    out.amt = { val: mn.value, dir: getComputedStyle(mn).direction, align: getComputedStyle(mn).textAlign, clrShown: ccs.display !== 'none', clrRight: cr.right > ir.right - 6 && cr.left > ir.left + ir.width / 2, col: ccs.color, bg: ccs.backgroundColor, radius: ccs.borderTopLeftRadius, divider: ccs.borderLeftStyle + ' ' + ccs.borderLeftWidth };
    /* اسلایدر */
    const host = document.getElementById('balanceAmtRange');
    out.ticks = host._ticks.slice();
    out.tickTxt = [...host.querySelectorAll('.hk-ar-tick')].map(t => t.textContent);
    const tk = [...host.querySelectorAll('.hk-ar-tick')].map(t => t.getBoundingClientRect().left + t.getBoundingClientRect().width / 2);
    out.tickGaps = tk.slice(1).map((x, i) => Math.round(x - tk[i]));
    const tr = host.querySelector('.hk-ar-track').getBoundingClientRect(), trs = getComputedStyle(host.querySelector('.hk-ar-track'));
    out.track = { h: Math.round(tr.height), r: trs.borderTopLeftRadius, fill: getComputedStyle(host.querySelector('.hk-ar-fill')).backgroundColor };
    const hs = host.querySelectorAll('.hk-ar-h'), hc = h => { const r = h.getBoundingClientRect(); return r.left + r.width / 2; };
    out.hMinAt = Math.round((hc(hs[0]) - tr.left) / tr.width * 100);
    out.hMaxAtLeft = Math.abs(hc(hs[1]) - tr.right) < 3;
    out.shape = hs[0].querySelector('path').getAttribute('d');
    out.vals = [...host.querySelectorAll('.hk-ar-val')].map(v => ({ t: v.textContent, c: getComputedStyle(v).color, below: v.getBoundingClientRect().bottom <= tr.top + 1 /* ۱.۳.۳۶: بالای ریل */ }));
    /* ۱.۳.۳۶: درجه‌ها زیر ریل، اولی و آخری بالای ریل (مقدار انتخاب‌شده هم بالای ریل) */
    const _tk = [...host.querySelectorAll('.hk-ar-tick')];
    out.ticksAbove = _tk.slice(1, -1).every(t => t.getBoundingClientRect().top >= tr.bottom - 1) && [_tk[0], _tk[_tk.length - 1]].every(t => t.getBoundingClientRect().top >= tr.bottom - 1);   /* ۱.۳.۴۰: سرها هم زیر ریل */
    /* کشیدن دستگیرهٔ «تا» به وسط (۵ میلیون) */
    const drag = async (h, x) => {
      const r = h.getBoundingClientRect(), y = r.top + r.height / 2, x0 = r.left + r.width / 2;
      h.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 7, clientX: x0, clientY: y, pointerType: 'touch' }));
      for (let s = 1; s <= 6; s++) { h.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, cancelable: true, pointerId: 7, clientX: x0 + (x - x0) * s / 6, clientY: y, pointerType: 'touch' })); await w(16); }
      h.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerId: 7, clientX: x, clientY: y, pointerType: 'touch' }));
      await w(350);
    };
    const n = host._ticks.length - 1, xOf = f => tr.left + f * tr.width;
    const i5 = host._ticks.indexOf(5000000);
    await drag(hs[1], xOf(i5 / n));
    out.afterMax = { val: mx.value, title: document.getElementById('searchResultTitle').textContent };
    /* «تا» از «از» رد نمی‌شود */
    await drag(hs[1], tr.left + 2);
    out.noCross = { mx: parseAmount(mx.value), mn: parseAmount(mn.value) };
    /* «از» روی ۰ → پاک؛ «تا» تا انتها → پاک */
    await drag(hs[0], tr.left - 10); await drag(hs[1], tr.right + 10);
    out.cleared = { mn: mn.value, mx: mx.value, clr: getComputedStyle(clr).display };
    /* نوشتن در باکس → دستگیره جابه‌جا */
    mx.value = '10,000,000'; mx.dispatchEvent(new Event('input', { bubbles: true })); await w(60);
    const i10 = host._ticks.indexOf(10000000);
    out.typed = Math.abs(hc(hs[1]) - xOf(i10 / n)) < 3;
    resetBalanceSearch(); await w(60);
    out.reset = Math.abs(hc(hs[0]) - tr.left) < 3 && Math.abs(hc(hs[1]) - tr.right) < 3;
    out.touch = getComputedStyle(hs[0]).touchAction;
    closePersonDetail(); await w(200);
    return out;
  });
  ok(f.hs.length === 7 && f.hs.every(h => h === 36) && f.amtHidden, 'همهٔ فیلترها و شرح دقیقاً ۳۶px؛ باکس‌های مبلغ از ۱.۳.۳۱ حذف (فقط محور)')
  ok(f.ticks.join() === '0,100000,500000,1000000,5000000,10000000,50000000', 'درجه‌ها خودکار تا صدک ۹۵ مبلغ‌ها: ' + f.tickTxt.join(' | '));
  ok(f.tickTxt[0] === '۰' && /\+۵۰میلیون/.test(f.tickTxt[f.tickTxt.length - 1]) && /هزار/.test(f.tickTxt[1]), 'برچسب دوخطی (عدد + هزار/میلیون) و آخری «+۵۰ میلیون»');
  ok(f.tickGaps.every(g => Math.abs(g - f.tickGaps[0]) <= 2) && f.tickGaps[0] > 0, 'فاصلهٔ درجه‌ها برابر، ۰ سمت چپ (از ۱.۳.۳۱) (' + f.tickGaps[0] + 'px)');
  ok(f.track.h >= 6 && f.track.h <= 12 && parseFloat(f.track.r) >= 3 && f.track.fill === 'rgb(10, 132, 255)', 'ریل ضخیم (' + f.track.h + 'px) با سرهای گرد و بازهٔ آبی');
  ok(/Q/.test(f.shape) && /L11 24\.5/.test(f.shape) && f.ticksAbove && f.vals.every(v => v.below && v.c === 'rgb(10, 132, 255)'), 'دستگیرهٔ سپری (بالا گرد، پایین تیز)؛ همهٔ درجه‌ها زیر ریل و مقدارها بالای ریل به رنگ آبی');
  ok(f.hMinAt > 0 && f.amt.val && f.vals[0].t === '۲٫۵ میلیون' && f.hMaxAtLeft && /و بیشتر/.test(f.vals[1].t), 'مبلغ نوشته‌شده دستگیره را جابه‌جا کرد («' + f.vals[0].t + '»، «' + f.vals[1].t + '»)');
  ok(f.afterMax.val === '۵,۰۰۰,۰۰۰', 'کشیدن دستگیرهٔ «تا» عدد باکس را عوض کرد (' + f.afterMax.val + ')');
  ok(f.noCross.mx >= f.noCross.mn && f.noCross.mx === 2500000, 'دستگیره‌ها از هم رد نمی‌شوند');
  ok(f.cleared.mn === '' && f.cleared.mx === '' && f.cleared.clr === 'none', 'دستگیره روی ۰ / انتها = باکس خالی (بی‌حد)');
  ok(f.typed && f.reset && f.touch === 'none', 'نوشتن در باکس دستگیره را می‌برد؛ پاک کردن جستجو دستگیره‌ها را برمی‌گرداند');

  ok(errors.length === 0, 'بدون خطای JS' + (errors.length ? ': ' + errors.join(' | ') : ''));
  console.log(`\n${passed} passed, ${failed} failed`);
  await b.close();
  process.exit(failed ? 1 : 0);
})();

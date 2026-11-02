// ۱.۳.۷۳: منوی میان‌برها مات و از اول؛ میان‌بر سطل زباله قرمز با تکان در؛ عرض ماه/سال و جا شدن روز و تاریخ؛
// جدول درآمد/مخارج دو ردیف کمتر + دایرهٔ اسکرول؛ باکس «+» با پروژه‌های زیر هم؛ باز/بسته شدن روابط قرض (بازنویسی)؛
// خروجی‌ها (تاریخ شمسی/میلادی و ساعت، قرض کامل، آرشیو درآمد ثابت)؛ برچسب باکس هوشمند؛ راهنمای سه‌قدمی دور موجودی.
// فقط دادهٔ مصنوعی در پروفایل‌های تازه و جدا.
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');

const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const allErrors = [];

async function fresh(b, opts) {
  opts = opts || {};
  const ctx = await b.newContext({ viewport: { width: opts.w || 390, height: opts.h || 844 }, timezoneId: 'Asia/Tehran' });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, Object.assign({}, BASE_LS, opts.theme ? { hesabTheme: opts.theme } : {}));
  const page = await ctx.newPage();
  page.on('pageerror', e => allErrors.push(e.message));
  await page.clock.setFixedTime(new Date(opts.now || '2026-11-02T09:10:00Z'));
  await page.goto(INDEX); await page.waitForTimeout(1800);
  return { ctx, page };
}

(async () => {
  const b = await chromium.launch();

  console.log('• منوی میان‌برها و سطل زباله');
  const A = await fresh(b);
  const dk = await A.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    hkPrefSet('dockL', 'trash'); hkRenderDock(); await w(100);
    const L = document.querySelector('#homeDockTop .hk-dock-L'), svg = L.querySelector('svg');
    const red = /255, 69, 58|214, 58, 48/.test(getComputedStyle(svg).stroke);
    const lid = L.querySelector('.hk-lid'), anim = lid ? getComputedStyle(lid).animationName : '';
    hkPrefSet('dockL', 'projects'); hkPrefSet('dockR', 'stats'); hkRenderDock(); await w(80);
    hkDockOpenPop(document.querySelector('#homeDockTop .hk-dock-R'), 'R'); await w(300);
    const pop = document.querySelector('#hkDockPop .hk-dock-pop'), cs = getComputedStyle(pop);
    const top0 = pop.scrollTop === 0, firstK = pop.querySelector('.hk-dock-pi').dataset.k;
    const mask = cs.webkitMaskImage || cs.maskImage || 'none';
    const bg = cs.backgroundColor;
    document.getElementById('hkDockPop')._hkCancel(); await w(200);
    hkPrefSet('dockR', 'recurring'); hkRenderDock();
    return { red, anim, top0, firstK, mask, bg };
  });
  ok(dk.red && dk.anim === 'trashLidRock', 'میان‌بر سطل زباله قرمز است و درش هر چند ثانیه تکان می‌خورد');
  ok(dk.top0 && dk.firstK === 'projects', 'فهرست میان‌برها همیشه از گزینهٔ اول باز می‌شود (حتی اگر انتخاب‌شده پایین‌تر باشد)');
  ok(dk.mask === 'none' && !/rgba\(.*, 0\)|transparent/.test(dk.bg), 'باکس فهرست کاملاً مات است (از زیرش چیزی دیده نمی‌شود) (' + dk.bg + ')');
  await A.ctx.close();

  console.log('• عرض ماه/سال و روز و تاریخ');
  for (const w of [360, 390, 412]) {
    const T = await fresh(b, { w, now: '2026-11-04T09:10:00Z' });
    const m = await T.page.evaluate(async () => {
      window.getTodayPersian = () => ({ y: 1405, m: 2, d: 31 });
      navigateToPeriod(1405, 2); await new Promise(r => setTimeout(r, 300)); hkMonthTodayMark();
      const btn = document.querySelector('#monthSelectWrap .dark-select-btn'), sm = btn.querySelector('.hk-mtoday');
      const br = btn.getBoundingClientRect(), sr = sm.getBoundingClientRect();
      const s = sm.querySelector('small').getBoundingClientRect(), d = sm.querySelector('b').getBoundingClientRect();
      const mw = document.getElementById('monthSelectWrap').getBoundingClientRect().width, yw = document.getElementById('yearSelectWrap').getBoundingClientRect().width;
      return { txt: sm.textContent, fits: sr.right <= br.right && sr.left >= br.left && btn.scrollWidth <= btn.clientWidth + 1, gap: d.top - s.bottom, ratio: mw / yw };
    });
    ok(m.txt === 'چهارشنبه۳۱' && m.fits && m.gap >= 1.5, w + 'px: بدترین حالت (اردیبهشت، چهارشنبه، ۳۱) داخل باکس جا می‌شود و دو خط روی هم نمی‌روند (فاصله ' + m.gap.toFixed(1) + ')');
    ok(m.ratio > 1.4 && m.ratio < 1.6, w + 'px: عرض ماه حدود ۱٫۵ برابر سال (' + m.ratio.toFixed(2) + ')');
    await T.ctx.close();
  }

  console.log('• جدول درآمد/مخارج و دایرهٔ اسکرول');
  const C = await fresh(b);
  const tb = await C.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const t = hkMainTitle(), exp = findSectionByTitle('expense', t);
    exp.rows = []; for (let i = 0; i < 30; i++) exp.rows.push(Object.assign(emptyRow('expense'), { day: String(1 + (i % 28)), desc: 'خرج ' + i, amount: (i + 1) * 10000, status: 'paid' }));
    persistCurrent(); touchLocal(); await saveArchive(); renderAll(); openPersonDetail(t, 'expense'); await w(1200);
    const sc = document.querySelector('.person-detail-scroll'), box = sc.closest('.person-detail-box'), hint = box.querySelector('.person-detail-hint');
    const rh = sc.querySelector('tbody tr').getBoundingClientRect().height, n = sc.clientHeight / rh;
    const full = Math.floor(((innerHeight - 12) - sc.getBoundingClientRect().top - 28 - 2) / rh);
    const fab = document.getElementById('hkScrollFab'), fcs = getComputedStyle(fab), fr = fab.getBoundingClientRect(), hr = hint.getBoundingClientRect();
    const rg = document.createRange(); rg.selectNodeContents(hint); const gap = rg.getClientRects()[0].top - sc.getBoundingClientRect().bottom;
    return { n: Math.round(n), full, gap, circ: fcs.borderRadius === '50%' && !/rgba\(0, 0, 0, 0\)/.test(fcs.backgroundColor) && fcs.boxShadow !== 'none', size: Math.round(fr.width), mid: Math.abs((fr.top + fr.height / 2) - (hr.top + hr.height / 2)) < 2 };
  });
  ok(tb.n === tb.full - 2, 'دو ردیف کمتر از جای کامل (' + tb.n + ' از ' + tb.full + ')');
  ok(tb.gap >= 8, 'فاصلهٔ بیشتر بین جدول و ردیف راهنما (' + Math.round(tb.gap) + 'px)');
  ok(tb.circ && tb.size === 36 && tb.mid, 'دکمهٔ اسکرول خودکار در دایره با همان سایهٔ دکمه‌های گرد، هم‌ردیف راهنما');
  await C.ctx.close();

  console.log('• باکس «+» با چند پروژه');
  const D = await fresh(b);
  const ad = await D.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    window.loadFinancialSubjects = () => [['p1', 'ساختمان آسمان', 'orange'], ['p2', 'سهراب', 'blue'], ['p3', 'ویلا', 'green'], ['p4', 'بازسازی آشپزخانهٔ مامان و بابا و خانهٔ قدیمی', 'purple'], ['p5', 'مغازه', 'red']].map(x => ({ id: x[0], name: x[1], highlightColor: x[2] }));
    hkHomeAddMenu(document.querySelector('.home-circle-add')); await w(250);
    const pop = document.querySelector('#hkAddPop .hk-add-pop'), chips = pop.querySelector('.hk-add-chips'), list = [...chips.children];
    const pr = pop.getBoundingClientRect(), cr = chips.getBoundingClientRect();
    const col = list.every((c, i) => i === 0 || c.getBoundingClientRect().top > list[i - 1].getBoundingClientRect().top + 5);
    const firstVis = list[0].getBoundingClientRect().top >= cr.top - 0.5;
    const long = list[3].querySelector('span'), cut = long.scrollWidth > long.clientWidth && getComputedStyle(long).textOverflow === 'ellipsis';
    const scrolls = chips.scrollHeight > chips.clientHeight + 4;
    document.getElementById('hkAddPop')._hkCancel();
    window.loadFinancialSubjects = () => [{ id: 'p2', name: 'سهراب', highlightColor: 'blue' }];
    hkHomeAddMenu(document.querySelector('.home-circle-add')); await w(250);
    const narrow = document.querySelector('#hkAddPop .hk-add-pop').getBoundingClientRect().width;
    document.getElementById('hkAddPop')._hkCancel();
    return { w: pr.width, col, firstVis, cut, scrolls, narrow };
  });
  ok(ad.col && ad.firstVis && ad.scrolls, 'پروژه‌ها زیر هم؛ بیشتر از چهار تا اسکرول و اولی از بالا دیده می‌شود');
  ok(ad.w <= 241, 'عرض باکس حداکثر ۲۴۰ (' + Math.round(ad.w) + ')');
  ok(ad.cut && ad.narrow < ad.w, 'اسم خیلی بلند با «…»؛ با اسم کوتاه باکس باریک‌تر است (' + Math.round(ad.narrow) + ')');
  await D.ctx.close();

  console.log('• باز/بسته شدن روابط قرض');
  const E = await fresh(b);
  const lg = await E.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const led = ensureLedger(); led.sections = [];
    for (let s = 0; s < 3; s++) { const rows = []; for (let i = 0; i < 6; i++) rows.push(Object.assign(emptyLedgerRow(), { day: String(1 + i), desc: 'ردیف ' + i, amount: 10000 * (i + 1), ly: currentYear, lm: currentMonth })); led.sections.push({ id: 'S' + s, personA: 'من', personB: 'نفر ' + s, collapsed: true, rows }); }
    persistCurrent(); touchLocal(); await saveArchive(); openFeatureSheet('ledger'); await w(1800);
    const sec = document.querySelector('#sections-ledger .section[data-sec-id="S1"]'), hdr = sec.querySelector('.section-header'), lw = sec.querySelector('.hk-lw');
    const closedH = lw.getBoundingClientRect().height;
    const hdrH = [], secH = []; let run = true;
    const tick = () => { hdrH.push(Math.round(hdr.getBoundingClientRect().height)); secH.push(sec.getBoundingClientRect().height); if (run) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    const t0 = performance.now(); hdr.click(); const click = performance.now() - t0;
    await w(600);
    const openH = lw.getBoundingClientRect().height, rows = sec.querySelectorAll('tbody tr').length, fab = sec.querySelector('.ledger-add-row').getBoundingClientRect();
    hdr.click(); await w(150); hdr.click(); await w(600); /* وسط بسته شدن دوباره باز */
    const reopened = !sec.classList.contains('collapsed') && Math.abs(lw.getBoundingClientRect().height - openH) < 1;
    hdr.click(); await w(600); run = false;
    let mono = true; /* ارتفاع باکس در هر حرکت بی‌پرش: هیچ گام ناگهانی بزرگ‌تر از نصف کل تغییر نیست */
    for (let i = 1; i < secH.length; i++) if (Math.abs(secH[i] - secH[i - 1]) > (openH * 0.5)) mono = false;
    return { closedH, openH, rows, click, hdrSame: new Set(hdrH).size === 1, reopened, mono, closedEnd: sec.classList.contains('collapsed') && sec.querySelector('.hk-lw').getBoundingClientRect().height < 1, fabLeft: fab.left < sec.getBoundingClientRect().left + 80 };
  });
  ok(lg.closedH < 1 && lg.openH > 150 && lg.rows === 6, 'بسته = قاب بدنه صفر؛ باز = همهٔ ردیف‌ها (' + Math.round(lg.openH) + 'px)');
  ok(lg.click < 30, 'ضربه هیچ کار سنگینی ندارد (' + Math.round(lg.click) + 'ms)');
  ok(lg.hdrSame && lg.mono, 'سربرگ در طول حرکت ثابت و ارتفاع باکس بی‌پرش عوض می‌شود');
  ok(lg.reopened && lg.closedEnd, 'ضربهٔ دوباره وسط حرکت جهت را برمی‌گرداند؛ در پایان بسته کامل');
  ok(lg.fabLeft, 'دکمهٔ ردیف تازه مثل قبل سمت چپ باکس');
  await E.ctx.close();

  console.log('• خروجی‌ها');
  const F = await fresh(b);
  const ex = await F.page.evaluate(async () => {
    const t = hkMainTitle(), exp = findSectionByTitle('expense', t);
    exp.rows = [Object.assign(emptyRow('expense'), { day: '3', desc: 'سوپرمارکت', amount: 1800000, status: 'paid', time: '13:15' })];
    const led = ensureLedger(); led.sections = [{ id: 'L1', personA: 'من', personB: 'علی', collapsed: true, rows: [Object.assign(emptyLedgerRow(), { day: '4', desc: 'قرض نهار', amount: 250000, status: 'credit', ly: 1405, lm: 8, time: '12:30' })] }];
    archive['1405-7'] = archive['1405-7'] || emptyPeriodData();
    archive['1405-7'].ledger = { sections: [{ id: 'L1', personA: 'من', personB: 'علی', rows: [Object.assign(emptyLedgerRow(), { day: '20', desc: 'قرض مهر باز', amount: 1500000, status: 'credit', ly: 1405, lm: 7 }), Object.assign(emptyLedgerRow(), { day: '22', desc: 'تسویه قدیمی', amount: 100000, status: 'debt', ly: 1405, lm: 7, settled: true, settledN: 140507 })] }], nextId: 3 };
    recurringIncomes.length = 0;
    recurringIncomes.push({ id: 'r1', name: 'اجاره واحد ۱', amount: 9000000, day: '5', account: 'ملت', contractStart: { y: 1405, m: 1, d: 5 } }, { id: 'r2', name: 'اجاره واحد ۲', amount: 7000000, day: '10', account: 'ملت', contractStart: { y: 1405, m: 1, d: 10 } });
    const inc = findSectionByTitle('income', t);
    inc.rows = [Object.assign(emptyRow('income'), { day: '5', desc: 'اجاره واحد ۱', amount: 9000000, status: 'paid', fromRecurringId: 'r1', time: '08:40' }), Object.assign(emptyRow('income'), { day: '10', desc: 'اجاره واحد ۲', amount: 7000000, status: 'paid', fromRecurringId: 'r2' })];
    archive['1405-7'].income = { sections: [{ title: t, rows: [Object.assign(emptyRow('income'), { day: '5', desc: 'اجاره واحد ۱ مهر', amount: 9000000, status: 'paid', fromRecurringId: 'r1' })] }] };
    persistCurrent(); touchLocal(); await saveArchive();
    _hkExportOpts = { range: 'month', sections: { expense: 1, ledger: 1 } };
    const pdf = buildPdfBlocks().map(x => x.html).join('');
    const sheets = buildXlsxSheets().sheets;
    const ledSheet = (sheets.find(s => s.name === 'قرض') || { rows: [] }).rows.map(r => (r || []).map(c => c && c.v).join('|'));
    const expSheet = (sheets.find(s => s.name === 'مخارج') || { rows: [] }).rows.map(r => (r || []).map(c => c && c.v).join('|'));
    _hkExportOpts = null;
    /* آرشیو درآمد ثابت: فقط واحد ۱ و فقط آبان */
    _hkRecArc = { ids: { r1: 1 }, keys: { 140508: 1 } };
    const rpdf = buildPdfBlocks().map(x => x.html).join(''), rsh = buildXlsxSheets().sheets, base = hkExportFileBase();
    _hkRecArc = null;
    return {
      dateCell: /<td class="c dt"><b>۱۴۰۵\/۰۸\/۰۳<\/b><i>25 Oct 2026<\/i><\/td><td class="c tm">۱۳:۱۵<\/td>/.test(pdf),
      ledCarried: /قرض مهر باز/.test(pdf) && !/تسویه قدیمی/.test(pdf) && /<b>۱۴۰۵\/۰۷\/۲۰<\/b>/.test(pdf) && /علی به من بدهکار است/.test(pdf),
      ledStatus: /<td class="c">باز<\/td>/.test(pdf),
      xlsDate: expSheet.some(r => /۱۴۰۵\/۰۸\/۰۳ +· +25 Oct 2026\|۱۳:۱۵\|سوپرمارکت/.test(r)),
      xlsLed: ledSheet[0] === 'رابطه|تاریخ (شمسی · میلادی)|ساعت|شرح|بدهکار|بستانکار|مبلغ|وضعیت|ثبت‌کننده' && ledSheet.some(r => /قرض مهر باز/.test(r)) && ledSheet.some(r => /^مانده .*علی به من بدهکار است/.test(r)),
      rec: /اجاره واحد ۱/.test(rpdf) && !/اجاره واحد ۲/.test(rpdf) && !/مهر<\/td>/.test(rpdf) && /۰۸:۴۰/.test(rpdf),
      recX: rsh.length === 1 && rsh[0].name === 'آرشیو درآمد ثابت' && rsh[0].rows.filter(r => r && r[0] && r[0].s === 2).length === 1,
      base
    };
  });
  ok(ex.dateCell, 'PDF درآمد/مخارج: تاریخ شمسی بالا و میلادی پایین در یک خانه، به‌علاوهٔ ساعت');
  ok(ex.xlsDate, 'اکسل درآمد/مخارج: ستون تاریخ (شمسی · میلادی) و ساعت');
  ok(ex.ledCarried && ex.ledStatus, 'خروجی قرض: ردیف تسویه‌نشدهٔ ماه قبل هم هست، تسویه‌شدهٔ قدیمی نه؛ با وضعیت و مانده درست');
  ok(ex.xlsLed, 'اکسل قرض: همهٔ ستون‌ها و مانده هر رابطه');
  ok(ex.rec && ex.recX && ex.base === 'hesab-recurring-archive', 'خروجی آرشیو درآمد ثابت فقط همان درآمد و ماه انتخاب‌شده');
  await F.ctx.close();

  console.log('• پنجرهٔ خروجی آرشیو و فهرست درآمدهای ثابت');
  const G = await fresh(b);
  const rx = await G.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    recurringIncomes.length = 0;
    for (let i = 0; i < 9; i++) recurringIncomes.push({ id: 'r' + i, name: 'درآمد ثابت ' + (i + 1), amount: 1000000 * (i + 1), day: String(1 + i), account: 'ملت', contractStart: { y: 1405, m: 1, d: 1 + i } });
    const t = hkMainTitle(), inc = findSectionByTitle('income', t);
    inc.rows = [Object.assign(emptyRow('income'), { day: '2', desc: 'درآمد ثابت ۱', amount: 1000000, status: 'paid', fromRecurringId: 'r0' })];
    persistCurrent(); touchLocal(); await saveArchive();
    openRecurringFromMenu(); await w(700);
    const box = document.getElementById('recurringBox'), list = box.querySelector('.rec-list-scroll');
    const btn = document.getElementById('recExportBtn');
    const outside = btn && !box.contains(btn) && btn.getBoundingClientRect().top >= box.getBoundingClientRect().bottom - 1;
    const scrollable = list && list.scrollHeight > list.clientHeight + 10;
    const b0 = btn.getBoundingClientRect().top; list.scrollTop = 200; await w(100); const fixed = Math.abs(btn.getBoundingClientRect().top - b0) < 1;
    btn.click(); await w(300);
    const ov = document.getElementById('hkRecArcEx');
    const items = ov.querySelectorAll('.hk-rax-chk[data-g="i"]').length, months = ov.querySelectorAll('.hk-rax-chk[data-g="k"]').length;
    const allI = ov.querySelector('.hk-rax-chk[data-g="i"][value="*"]');
    allI.checked = false; allI.dispatchEvent(new Event('change')); await w(50);
    const goOff = ov.querySelector('.hk-rax-go').disabled;
    ov.querySelector('.hk-rax-chk[data-g="i"][value="r0"]').checked = true; ov.querySelector('.hk-rax-chk[data-g="i"][value="r0"]').dispatchEvent(new Event('change')); await w(50);
    const goOn = !ov.querySelector('.hk-rax-go').disabled, indet = allI.indeterminate;
    onBackGuard(); await w(250);
    return { outside, scrollable, fixed, items, months, goOff, goOn, indet, closed: !document.getElementById('hkRecArcEx') };
  });
  ok(rx.scrollable, 'بیش از ۷ درآمد ثابت: فهرست داخل باکس اسکرول می‌شود');
  ok(rx.outside && rx.fixed, 'دکمهٔ خروجی بیرون از باکس و با اسکرول فهرست جابه‌جا نمی‌شود');
  ok(rx.items === 10 && rx.months === 2, 'پنجرهٔ خروجی: چک‌باکس «همه» + هر درآمد ثابت، و «همه» + هر ماهِ دارای واریز');
  ok(rx.goOff && rx.goOn && rx.indet && rx.closed, 'بدون انتخاب دکمهٔ ساخت خاموش است؛ «همه» نیمه‌تیک می‌شود؛ بازگشت پنجره را می‌بندد');
  await G.ctx.close();

  console.log('• باکس هوشمند و راهنما');
  const H = await fresh(b);
  const sb = await H.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const t = hkMainTitle(), inc = findSectionByTitle('income', t);
    inc.rows = [Object.assign(emptyRow('income'), { day: '1', desc: 'حقوق', amount: 30000000, status: 'paid' })];
    persistCurrent(); touchLocal(); await saveArchive(); renderHomeCards(); await w(700);
    const el = document.querySelector('#homeSmartBox .pc-smart-box'), pg = (el._spPages || []).find(p => p.key === 'overview');
    return { ov: pg ? pg.html.replace(/<[^>]+>/g, ' ') : '' };
  });
  ok(/پس‌انداز کارت با احتساب پروژه‌ها/.test(sb.ov), 'وضعیت این ماه: «پس‌انداز کارت با احتساب پروژه‌ها»');
  await H.page.evaluate(() => startAppTour(true)); await H.page.waitForTimeout(400);
  for (let i = 0; i < 7; i++) { await H.page.click('#appTour .tour-next'); await H.page.waitForTimeout(520); }
  const tour = [];
  for (let k = 0; k < 3; k++) {
    tour.push(await H.page.evaluate(() => {
      const spot = document.querySelector('#appTour .tour-spot'), cut = spot.querySelector('.tour-cut'), r = spot.getBoundingClientRect();
      const bc = document.getElementById('homeBalanceCircle').getBoundingClientRect();
      const cr = cut.getBoundingClientRect(), cutOn = getComputedStyle(cut).display !== 'none';
      return { t: document.querySelector('#appTour .tour-title').textContent, cutOn, round: spot.classList.contains('round'),
        cutCentered: cutOn && Math.abs((cr.left + cr.width / 2) - (bc.left + bc.width / 2)) < 1.5 && Math.abs((cr.top + cr.height / 2) - (bc.top + bc.height / 2)) < 1.5 && cr.width > bc.width,
        spotOnCircle: Math.abs((r.left + r.width / 2) - (bc.left + bc.width / 2)) < 2 && Math.abs((r.top + r.height / 2) - (bc.top + bc.height / 2)) < 2 };
    }));
    await H.page.click('#appTour .tour-next'); await H.page.waitForTimeout(560);
  }
  ok(tour[0].t === 'میان‌برها' && tour[0].cutOn && tour[0].cutCentered, 'راهنما ۱: باکس بالایی، نیمهٔ بالایی دایره داخل هایلایت نیست');
  ok(tour[1].t === 'ثبت و جستجو' && tour[1].cutOn && tour[1].cutCentered, 'راهنما ۲: باکس پایینی (فقط «+» و جستجو)، نیمهٔ پایینی دایره بیرون');
  ok(tour[2].t === 'موجودی' && tour[2].round && !tour[2].cutOn && tour[2].spotOnCircle, 'راهنما ۳: فقط دور دایرهٔ موجودی');
  await H.ctx.close();

  ok(allErrors.length === 0, 'هیچ خطای JS ' + allErrors.slice(0, 3).join(' | '));
  await b.close();
  console.log('\nbatch-1373: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();

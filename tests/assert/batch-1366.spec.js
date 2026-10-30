// ۱.۳.۶۶: حذف رابطهٔ قرض از همهٔ ماه‌ها (بی‌برگشت خودکار)، باز/بسته شدن روابط بی‌ذخیره و بی‌گیر، متن سفید دکمه‌های آبی،
// باکس «حساب جدید» ویرایش ردیف (هم‌اندازهٔ منو + برگشت به فهرست)، خط لاتین زیر زمان، باکس «+» سمت راست دایره، اسکرول منوی جستجو.
// فقط دادهٔ مصنوعی در پروفایل‌های تازه و جدا.
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');

const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const allErrors = [];

async function fresh(b, theme) {
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, timezoneId: 'Asia/Tehran' });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, Object.assign({}, BASE_LS, theme ? { [P + '_theme']: theme } : {}));
  const page = await ctx.newPage();
  page.on('pageerror', e => allErrors.push(e.message));
  await page.clock.setFixedTime(new Date('2026-10-29T09:10:00Z'));
  await page.goto(INDEX); await page.waitForTimeout(1800);
  return { ctx, page };
}

(async () => {
  const b = await chromium.launch();

  console.log('• حذف رابطهٔ قرض از همهٔ ماه‌ها');
  const A = await fresh(b);
  const lsec = (rows) => ({ id: 'L66', personA: 'من', personB: 'علی', collapsed: true, rows: rows });
  const d1 = await A.page.evaluate(async (base) => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const mk = (m, amt) => { const pd = archive['1405-' + m] || emptyPeriodData(); pd.ledger = { sections: [Object.assign(JSON.parse(JSON.stringify(base)), { rows: [Object.assign(emptyLedgerRow(), { day: '3', desc: 'قرض ' + m, amount: amt, ly: 1405, lm: m })] })], nextId: 2 }; archive['1405-' + m] = pd; };
    mk(6, 100000); mk(7, 200000);
    touchLocal(); await saveArchive();
    loadCurrent(); renderAll(); await w(200);
    const carried = (periodData.ledger.sections || []).some(s => s.id === 'L66');
    deleteLedgerSection('L66'); await w(150);
    document.getElementById('confirmYes').click(); await w(900);
    const left = Object.keys(archive).filter(k => archive[k] && archive[k].ledger && (archive[k].ledger.sections || []).some(s => s && s.id === 'L66'));
    loadTrash();
    const tr = trashItems.find(t => t.type === 'ledger_section');
    return { carried, left, cur: (periodData.ledger.sections || []).some(s => s.id === 'L66'), months: tr && tr.data && tr.data.months ? Object.keys(tr.data.months).sort() : [], trashN: trashItems.filter(t => t.type === 'ledger_section').length };
  }, lsec([]));
  ok(d1.carried, 'پیش از حذف: رابطه از ماه قبل به ماه جاری آمده بود');
  ok(!d1.cur && d1.left.length === 0, 'بعد از حذف: در هیچ ماهی نمانده (' + d1.left.join(',') + ')');
  ok(d1.trashN === 1 && d1.months.join() === ['1405-6', '1405-7', '1405-8'].join(), 'یک بستهٔ سطل زباله با هر سه ماه (' + d1.months.join(',') + ')');
  await A.page.waitForTimeout(1500);
  await A.page.reload(); await A.page.waitForTimeout(2200);
  const d2 = await A.page.evaluate(() => {
    const w = (periodData.ledger.sections || []).some(s => s.id === 'L66');
    /* حتی اگر نسخهٔ قدیمی رابطه از جایی (همگام‌سازی) به ماه قبل برگردد، به ماه جاری نمی‌آید */
    archive['1405-7'].ledger.sections.push({ id: 'L66', personA: 'من', personB: 'علی', rows: [] });
    loadCurrent();
    const w2 = (periodData.ledger.sections || []).some(s => s.id === 'L66');
    archive['1405-7'].ledger.sections = archive['1405-7'].ledger.sections.filter(s => s.id !== 'L66'); loadCurrent();
    return { w, w2 };
  });
  ok(!d2.w, 'بعد از باز شدن دوباره: رابطه برنگشت');
  ok(!d2.w2, 'نشان «حذف‌شده»: نسخهٔ جامانده در ماه قبل دوباره به ماه جاری کشیده نمی‌شود');
  const d3 = await A.page.evaluate(() => {
    loadTrash();
    const idx = trashItems.findIndex(t => t.type === 'ledger_section');
    const okR = restoreTrashData(trashItems[idx]);
    const has = ['1405-6', '1405-7'].map(k => (archive[k].ledger.sections || []).some(s => s.id === 'L66'));
    const rows = (archive['1405-6'].ledger.sections.find(s => s.id === 'L66').rows || []).length;
    return { okR, has, cur: (periodData.ledger.sections || []).some(s => s.id === 'L66'), rows, gone: hkLedGone().indexOf('L66') };
  });
  ok(d3.okR && d3.has.every(Boolean) && d3.cur && d3.rows === 1 && d3.gone < 0, 'بازگردانی از سطل زباله: رابطه با ردیف‌هایش به همهٔ ماه‌ها برگشت');
  await A.ctx.close();

  console.log('• باز/بسته شدن روابط');
  const L = await fresh(b);
  await L.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const led = ensureLedger();
    led.sections = [];
    for (let s = 0; s < 4; s++) {
      const rows = []; for (let i = 0; i < 18; i++) rows.push(Object.assign(emptyLedgerRow(), { day: String(1 + i), desc: 'ردیف ' + i, amount: 10000 * (i + 1), ly: currentYear, lm: currentMonth }));
      led.sections.push({ id: 'S' + s, personA: 'من', personB: 'نفر ' + s, collapsed: true, rows });
    }
    persistCurrent(); touchLocal(); await saveArchive();
    openFeatureSheet('ledger'); await w(600);
  });
  const lz = await L.page.evaluate(() => {
    const secs = [...document.querySelectorAll('#sections-ledger .section')];
    return { n: secs.length, allCollapsed: secs.every(s => s.classList.contains('collapsed')), rows: secs.map(s => s.querySelectorAll('tbody tr').length) };
  });
  ok(lz.n === 4 && lz.allCollapsed && lz.rows.every(n => n === 0), 'منو با روابط بسته باز می‌شود و ردیف‌ها تا اولین باز شدن ساخته نمی‌شوند (' + lz.rows.join(',') + ')');
  await L.page.evaluate(() => {
    window.__saves = 0;
    const s0 = window.scheduleSave, a0 = window.saveArchive, t0 = window.touchLocal;
    window.scheduleSave = function () { window.__saves++; return s0.apply(this, arguments); };
    window.saveArchive = function () { window.__saves++; return a0.apply(this, arguments); };
    window.touchLocal = function () { window.__saves++; return t0.apply(this, arguments); };
  });
  const cdp = await L.ctx.newCDPSession(L.page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  let best = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const fr = await L.page.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const hdr = document.querySelector('#sections-ledger .section[data-sec-id="S1"] .section-header');
      const sec = hdr.closest('.section');
      const gaps = []; let last = performance.now(), run = true;
      const tick = t => { gaps.push(t - last); last = t; if (run) requestAnimationFrame(tick); };
      requestAnimationFrame(t => { last = t; requestAnimationFrame(tick); });
      await w(50);
      const t0 = performance.now();
      hdr.click();
      const clickMs = performance.now() - t0;
      await w(700);
      const opened = !sec.classList.contains('collapsed'), built = sec.querySelectorAll('tbody tr').length;
      const capped = !!sec.querySelector('.section-body').style.getPropertyValue('max-height');
      hdr.click(); await w(700);
      run = false;
      return { clickMs: Math.round(clickMs), maxGap: Math.round(Math.max.apply(null, gaps.slice(1))), opened, built, capped, closed: sec.classList.contains('collapsed') };
    });
    if (!best || fr.maxGap < best.maxGap) best = fr;
    if (fr.maxGap < 120) break;
  }
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  ok(best.opened && best.built === 18 && best.capped && best.closed, 'باز شدن: ۱۸ ردیف همان لحظه ساخته و سقف ۱۰ ردیف یک بار اندازه گرفته شد؛ بسته شدن دوباره');
  ok(best.maxGap < 120, 'پردازندهٔ ۴ برابر کندتر: بلندترین فاصلهٔ فریم در باز/بسته شدن ' + best.maxGap + 'ms (کلیک ' + best.clickMs + 'ms)');
  await L.page.waitForTimeout(800);
  const sv = await L.page.evaluate(() => window.__saves);
  ok(sv === 0, 'باز و بسته کردن رابطه هیچ ذخیره‌ای راه نمی‌اندازد (' + sv + ')');
  const cl = await L.page.evaluate(async () => { window.__saves = 0; closeFeatureSheet(); await new Promise(r => setTimeout(r, 900)); return window.__saves; });
  ok(cl === 0, 'بستن منوی قرض هم ذخیرهٔ کامل راه نمی‌اندازد');
  await L.ctx.close();

  console.log('• ویرایش ردیف و باکس «+»');
  const R = await fresh(b);
  const re = await R.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const sec = periodData.expense.sections[0];
    const row = Object.assign(emptyRow('expense'), { day: '5', desc: 'نان', amount: 50000, status: 'paid', time: '14:05' });
    sec.rows.push(row);
    hkOpenRowEdit({ row, tab: 'expense', sec, num: 1, title: sec.title }); await w(300);
    const pills = [...document.querySelectorAll('#hkRowEdit .hk-re-pill')];
    const tSmall = pills[1].querySelector('.hk-re-greg'), dSmall = pills[0].querySelector('.hk-re-greg');
    const out = { t: pills[1].querySelector('b').textContent, tg: tSmall ? tSmall.textContent : null, dg: dSmall ? dSmall.textContent : null };
    const acc = document.querySelector('#hkRowEdit .hk-re-pair .hk-re-f:first-child .hk-re-sel');
    const r0 = acc.getBoundingClientRect();
    acc.click(); await w(150);
    const opts = [...document.querySelectorAll('.hk-re-list .dark-select-option')];
    opts[opts.length - 1].click(); await w(250);
    const box = document.querySelector('#hkRowEdit .hk-re-newacc .hk-bulk-newacc');
    const r1 = box.getBoundingClientRect();
    out.same = ['left', 'top', 'width', 'height'].every(k => Math.abs(r0[k] - r1[k]) < 0.6);
    out.dims = [r0.width, r0.height, r1.width, r1.height].map(v => Math.round(v * 10) / 10).join('/');
    out.focus = document.activeElement === box.querySelector('.hk-bulk-newinp');
    out.label = (box.querySelector('.hk-bulk-newlab') || {}).textContent;
    document.querySelector('#hkRowEdit .hk-re-newback').click(); await w(200);
    out.back = !document.querySelector('#hkRowEdit .hk-re-newacc') && acc.style.display !== 'none' && !!document.querySelector('.hk-re-list') && !!document.getElementById('hkRowEdit');
    const opts2 = [...document.querySelectorAll('.hk-re-list .dark-select-option')];
    out.listN = opts2.length;
    document.querySelectorAll('.hk-re-list').forEach(l => l.remove());
    document.getElementById('hkRowEdit')._hkCancel();
    return out;
  });
  ok(re.t === '۱۴:۰۵' && re.tg === '14:05' && !!re.dg, 'زمان: زیر ساعت شمسی، همان ساعت با رقم لاتین (' + re.t + ' / ' + re.tg + ')');
  ok(re.same && re.focus && re.label === 'حساب جدید:', 'باکس «حساب جدید» دقیقاً جای منوی حساب با همان پهنا و ارتفاع (' + re.dims + ')');
  ok(re.back && re.listN >= 2, 'فلش کنار باکس: برگشت به فهرست حساب‌ها بی‌آنکه پنجرهٔ ویرایش بسته شود');
  const ap = await R.page.evaluate(async () => {
    const btn = document.querySelector('.home-circle-add'), bc = document.getElementById('homeBalanceCircle');
    hkHomeAddMenu(btn); await new Promise(r => setTimeout(r, 200));
    const pop = document.querySelector('#hkAddPop .hk-add-pop'), r = btn.getBoundingClientRect(), p = pop.getBoundingClientRect(), c = bc.getBoundingClientRect();
    const out = { right: p.left >= r.left + r.width / 2 - 1 && p.left + p.width / 2 > r.right, between: p.right <= c.left + 12, top: Math.abs(p.top - Math.max(8, r.top - p.height - 10)) < 1.5, above: p.bottom <= r.top };
    document.getElementById('hkAddPop').remove();
    return out;
  });
  ok(ap.right && ap.between && ap.top && ap.above, 'باکس «+» سمت راست دایره، میان آن و دایرهٔ موجودی، در همان ارتفاع قبلی (' + JSON.stringify(ap) + ')');
  await R.ctx.close();

  console.log('• متن سفید دکمه‌های آبی');
  for (const theme of ['dark', 'light']) {
    const T = await fresh(b, theme);
    const bad = await T.page.evaluate(th => {
      document.documentElement.setAttribute('data-theme', th);
      const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map(parseFloat); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
      const out = [];
      document.querySelectorAll('button, .btn, [role=button], .modal-btn').forEach(el => {
        const cs = getComputedStyle(el), bg = parse(cs.backgroundColor), fg = parse(cs.color);
        if (!bg || bg.a < 0.6 || !(bg.b > 150 && bg.b > bg.r + 70 && bg.b > bg.g + 15)) return;
        if (!(fg && fg.r > 235 && fg.g > 235 && fg.b > 235)) out.push(el.id || el.className);
      });
      return out;
    }, theme);
    ok(bad.length === 0, 'پوستهٔ ' + (theme === 'dark' ? 'تیره' : 'روشن') + ': همهٔ دکمه‌های آبی متن سفید دارند (' + bad.join(', ') + ')');
    await T.ctx.close();
  }

  console.log('• اسکرول منوی جستجو');
  const S = await fresh(b);
  const ss = await S.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    periodData.expense.sections[0].rows = Array.from({ length: 40 }, (_, i) => Object.assign(emptyRow('expense'), { day: String((i % 28) + 1), desc: 'خرید ' + i, amount: 10000 * (i + 1), status: 'paid' }));
    persistCurrent();
    openPersonDetail(allPersonTitles()[0], 'balance'); await w(500);
    const i = document.getElementById('balanceSearchInput'); i.value = 'خرید'; i.dispatchEvent(new Event('input')); await w(400);
    const sc = document.getElementById('balanceScrollBody'), h = document.getElementById('balanceFixedHeader'), panel = document.getElementById('panel-balance');
    const th = () => document.querySelector('#searchResultBox thead th').getBoundingClientRect().top;
    const out = { innerOn: document.getElementById('searchResultScroll').classList.contains('on'), ov: getComputedStyle(sc).overflowY, pov: getComputedStyle(panel).overflowY };
    sc.scrollTop = 120; sc.dispatchEvent(new Event('scroll')); await w(30);
    sc.scrollTop = 260; sc.dispatchEvent(new Event('scroll')); await w(800);
    out.collapsed = h.classList.contains('bsr-collapsed');
    out.keptTop = Math.round(sc.scrollTop);
    out.headPinned = Math.abs(th() - sc.getBoundingClientRect().top) <= 1;
    const ft = document.querySelector('#search-result-foot tr:last-child td');
    out.footPinned = ft && Math.abs(ft.getBoundingClientRect().bottom - sc.getBoundingClientRect().bottom) <= 1;
    sc.scrollTop = 0; sc.dispatchEvent(new Event('scroll')); await w(900);
    out.reopened = !h.classList.contains('bsr-collapsed');
    return out;
  });
  ok(!ss.innerOn && ss.ov === 'auto' && ss.pov === 'hidden', 'یک ناحیهٔ اسکرول برای جدول‌ها؛ کادر فیلترها بیرون از آن و جدول نتیجه بی‌اسکرول داخلی');
  ok(ss.collapsed && ss.keptTop === 260, 'جمع شدن کادر هنگام اسکرول، جای اسکرول را عوض نمی‌کند (بی‌پرش)');
  ok(ss.headPinned && ss.footPinned, 'عنوان ستون‌ها بالای ناحیه و ردیف جمع پایین آن چسبیده‌اند');
  ok(ss.reopened, 'برگشت به بالا: کادر فیلترها دوباره باز شد');
  await S.ctx.close();

  ok(allErrors.length === 0, 'هیچ خطای JS ' + (allErrors[0] || ''));
  await b.close();
  console.log('\nbatch-1366: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();

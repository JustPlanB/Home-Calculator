// نسخهٔ ۱.۳.۳۶: تاریخ ساخت فهرست در اسلاید «کارهای من»، پرسش کوتاه‌تر پشتیبان با گزینه‌های هم‌اندازه، منوی جستجو با یک جدول
// (نتیجه + جمع کل چند مورد)، ضربدر شرح = پاک + کیبورد، درجه‌های بازهٔ مبلغ زیر محور و اولی/آخری بالا. فقط دادهٔ مصنوعی.
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');

let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }

(async () => {
  const b = await chromium.launch();
  const errors = [];
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, hasTouch: true });
  await ctx.addInitScript(() => { ['tourDone', 'bankSetupDone', 'cardSwipeHintDone', 'recCleanupAsked', 'instRevert1337', 'instRepair1335', 'timeFill1335'].forEach(k => localStorage.setItem('hesabKetabArchive_v5_' + k, '1')); });
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
  await p.clock.setFixedTime(new Date('2026-10-13T09:00:00Z'));   /* ۲۱ مهر ۱۴۰۵ */
  await p.goto(INDEX); await p.waitForTimeout(1500);
  const r = await p.evaluate(async () => {
    const w = ms => new Promise(res => setTimeout(res, ms));
    const out = {};
    const t = allPersonTitles()[0];
    /* کارهای من: تاریخ ساخت فهرست کنار عنوان */
    saveTodoList(t, 'l' + Date.now().toString(36) + 'abc', [{ text: 'شیر', done: false }]);
    const pg = spPageTodo({ title: t });
    const html = Array.isArray(pg) ? pg[0].html : pg;
    const d = document.createElement('div'); d.innerHTML = html;
    out.todo = d.querySelector('.sp-h').textContent;
    /* پشتیبان: پرسش کوتاه، دو گزینهٔ هم‌اندازه */
    await HKAttach.put('i1', new Blob([new Uint8Array(500)], { type: 'image/jpeg' }));
    periodData.expense.sections[0].rows = [['نان', 20000], ['نان بربری', 30000], ['شیر', 40000]].map(([ds, a], i) => Object.assign(emptyRow('expense'), { day: String(i + 1), desc: ds, amount: a, status: 'paid' }));
    periodData.expense.sections[0].rows[0].att = [{ id: 'i1', kind: 'img', size: 500 }];
    persistCurrent();
    exportFullBackup(); await w(200);
    const a3 = document.getElementById('hkAsk3');
    out.ask = a3 ? a3.querySelector('.hk-ask3-txt').textContent : '';
    const bs = a3 ? [...a3.querySelectorAll('.hk-ask3-btn')].map(x => Math.round(x.getBoundingClientRect().width)) : [];
    out.btnEq = bs.length === 2 && Math.abs(bs[0] - bs[1]) <= 1; out.bs = bs.join(',') + ' ' + (a3 ? [...a3.querySelectorAll('.hk-ask3-btn')].map(x => x.className + ':' + getComputedStyle(x).flex).join(';') : '');
    if (a3) a3._hkCancel();
    /* جستجو */
    openPersonDetail(t, 'balance'); await w(500);
    const vis = id => { const el = document.getElementById(id); return !!el && getComputedStyle(el).display !== 'none'; };
    const i = document.getElementById('balanceSearchInput');
    i.value = 'نان'; i.dispatchEvent(new Event('input')); await w(300);
    out.onlyResult = vis('searchResultBox') && !vis('searchMonthSummary');
    out.foot = [...document.querySelectorAll('#search-result-foot tr')].map(tr => tr.textContent.replace(/\s+/g, ' ').trim());
    /* ضربدر شرح: پاک + فوکوس (کیبورد) */
    i.focus(); document.querySelector('.bs-desc-clr').click(); await w(200);
    out.clr = i.value === '' && document.activeElement === i;
    /* بازهٔ مبلغ */
    const host = document.getElementById('balanceAmtRange'), tr = host.querySelector('.hk-ar-track').getBoundingClientRect();
    const ticks = [...host.querySelectorAll('.hk-ar-tick')];
    out.ends = [ticks[0], ticks[ticks.length - 1]].every(x => x.getBoundingClientRect().top >= tr.bottom - 1);   /* ۱.۳.۴۰: سرها هم زیر محور */
    out.mids = ticks.slice(1, -1).every(x => x.getBoundingClientRect().top >= tr.bottom - 1);
    out.nMid = ticks.length - 2;
    return out;
  });
  ok(/^کارهای من \(۲۱ مهر\)$/.test(r.todo), 'اسلاید کارهای من: تاریخ ساخت فهرست داخل پرانتز (' + r.todo + ')');
  ok(/^پیوست‌ها هم پشتیبان شوند؟/.test(r.ask) && r.ask.length < 55 && r.btnEq, 'پشتیبان: پرسش کوتاه (' + r.ask + ') و دو گزینهٔ هم‌اندازه ' + r.bs);
  ok(r.onlyResult, 'منوی جستجو فقط جدول «نتیجهٔ جستجو» (جدول ماه‌ها برداشته شد)');
  ok(r.foot.length === 1 && /جمع مخارج \(۲ مورد\)/.test(r.foot[0]) && /۵۰,۰۰۰/.test(r.foot[0]), 'شرحی که چند بار پیدا شد: جمع کلش زیر جدول (' + r.foot.join(' | ') + ')');
  ok(r.clr, 'ضربدر شرح: نوشته پاک و فیلد فعال می‌ماند (کیبورد بالا)');
  ok(r.ends && r.mids && r.nMid >= 1, 'بازهٔ مبلغ: همهٔ درجه‌ها (اولی و آخری هم) زیر محور');
  ok(errors.length === 0, 'بدون خطای JS' + (errors.length ? ': ' + errors.join(' | ') : ''));
  console.log(`\n${passed} passed, ${failed} failed`);
  await b.close();
  process.exit(failed ? 1 : 0);
})();

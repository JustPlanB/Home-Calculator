// جستجو بر اساس دسته و بازهٔ زمانی، آرشیو هر درآمد ثابت (به ترتیب ماه)، و باز شدن نرم‌افزار روی ماه امروز.
// فقط دادهٔ مصنوعی؛ «امروز» با ساعت ساختگی (۲۱ مهر ۱۴۰۵).
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');

let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const ACC = 'ملت مصنوعی';

(async () => {
  const b = await chromium.launch();
  const errors = [];
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 } });
  await ctx.addInitScript(() => {
    ['tourDone', 'bankSetupDone', 'cardSwipeHintDone', 'recCleanupAsked'].forEach(k => localStorage.setItem('hesabKetabArchive_v5_' + k, '1'));
    localStorage.setItem('hesabKetabArchive_v5_autoBackup', JSON.stringify({ enabled: false }));
  });
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
  await p.clock.setFixedTime(new Date('2026-10-13T09:00:00Z'));
  await p.goto(INDEX); await p.waitForTimeout(1500);

  await p.evaluate((ACC) => {
    selectedBankAccounts.push({ id: 'ba_syn', bank: 'بانک ملت', label: ACC, openingBalance: 0, createdAt: { y: 1405, m: 1 } });
    const row = (day, desc, amount, st) => Object.assign(emptyRow('expense'), { day: String(day), desc, amount, status: st || 'paid', account: ACC });
    const inc = (day, desc, amount) => Object.assign(emptyRow('income'), { day: String(day), desc, amount, status: 'paid', account: ACC });
    const P = (exp, incs) => ({ expense: { sections: [{ id: 's1', title: 'سارا', rows: exp }], nextId: 2 }, income: { sections: [{ id: 's1', title: 'سارا', rows: incs }], nextId: 2 }, ledger: { sections: [], nextId: 1 }, cardMeta: {} });
    archive[periodKey(1405, 5)] = P([row(3, 'نانوایی سنگک', 50000)], [inc(4, 'اجاره واحد ۲', 15000000)]);
    archive[periodKey(1405, 6)] = P([row(2, 'نان', 40000), row(9, 'بنزین', 300000)], [inc(4, 'اجاره واحد ۲', 15000000)]);
    periodData.expense.sections = [{ id: 's1', title: 'سارا', rows: [row(5, 'نان بربری', 30000), row(7, 'بنزین', 350000), row(8, 'زرتک قلمبه', 900000)] }];
    periodData.income.sections = [{ id: 's1', title: 'سارا', rows: [inc(5, 'اجاره واحد ۲', 15000000)] }];
    persistCurrent(); saveArchive(); renderAll();
  }, ACC);

  console.log('• جستجو بر اساس دسته و بازه');
  const s = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const run = async (cat, range, q) => {
      document.getElementById('balanceSearchInput').value = q || '';
      bsFillCategories();
      const c = document.getElementById('balanceSearchCat'), r = document.getElementById('balanceSearchRange');
      c.value = cat; r.value = range;
      renderBalanceSearch(); await w(50);
      return { rows: [...document.querySelectorAll('#search-result-body tr')].map(tr => tr.textContent), foot: [...document.querySelectorAll('#search-result-foot tr')].map(tr => tr.textContent), shown: document.getElementById('searchResultBox').style.display !== 'none' };
    };
    bsFillCategories();
    const opts = [...document.getElementById('balanceSearchCat').options].map(o => o.textContent);
    const food = await run('food', 'all');
    const foodMonth = await run('food', 'month');
    const foodQ = await run('food', 'all', 'بربری');
    const none = await run('__none__', 'all');
    const monthAll = await run('', 'month');
    const reset = (resetBalanceSearch(), document.getElementById('searchResultBox').style.display === 'none' && document.getElementById('balanceSearchCat').value === '' && document.getElementById('balanceSearchRange').value === 'all');
    return { opts, food, foodMonth, foodQ, none, monthAll, reset };
  });
  ok(s.opts.some(o => /خوراکی \(۳\)/.test(o)) && s.opts.some(o => /حمل‌ونقل \(۲\)/.test(o)) && s.opts.some(o => /بدون دسته \(۱\)/.test(o)), 'منوی دسته فقط دسته‌های دارای ردیف را با تعداد نشان می‌دهد (' + s.opts.join('، ') + ')');
  ok(s.food.shown && s.food.rows.length === 3 && s.food.rows.every(t => /نان/.test(t)) && !s.food.rows.some(t => /اجاره|بنزین/.test(t)), 'دستهٔ «خوراکی» بدون نوشتن کلمه: هر سه ردیف نان از همهٔ ماه‌ها، بدون درآمد و دسته‌های دیگر');
  ok(s.food.foot.filter(t => /^جمع (مرداد|شهریور|مهر)/.test(t)).length === 3, 'بازه بیش از یک ماه: جمع هر ماه زیر جدول');
  ok(s.foodMonth.rows.length === 1 && /بربری/.test(s.foodMonth.rows[0]), 'بازهٔ «این ماه»: فقط نان مهر');
  ok(s.foodQ.rows.length === 1 && /بربری/.test(s.foodQ.rows[0]), 'دسته + کلمه با هم ترکیب می‌شوند');
  ok(s.none.rows.length === 1 && /زرتک/.test(s.none.rows[0]), '«بدون دسته»: ردیف‌هایی که دسته‌ای ندارند');
  ok(s.monthAll.rows.length === 4 && s.monthAll.rows.some(t => /اجاره/.test(t)), 'بدون دسته و فقط بازهٔ «این ماه»: درآمد و مخارج مهر');
  ok(s.reset, 'پاک کردن جستجو دسته و بازه را هم به حالت اول برمی‌گرداند');
  const recat = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    document.getElementById('balanceSearchCat').value = '__none__'; renderBalanceSearch(); await w(50);
    document.querySelector('#search-result-body td.sec-name').click(); await w(100);
    const opt = [...document.querySelectorAll('#recPickModal .rec-pick-opt')].find(o => o.textContent.trim() === (HKCategorizer.byId.gift ? HKCategorizer.byId.gift.label : HKCategorizer.categories[HKCategorizer.categories.length - 1].label));
    const label = opt ? opt.textContent.trim() : '';
    if (opt) opt.click(); await w(100);
    const c = HKCategorizer.classify('زرتک قلمبه');
    resetBalanceSearch();
    return { label, now: c && c.label };
  });
  ok(recat.label && recat.now === recat.label, 'با زدن روی ردیف، دستهٔ آن عوض و برای همان شرح یاد گرفته شد (' + recat.now + ')');

  console.log('• آرشیو درآمد ثابت');
  const ar = await p.evaluate(async (ACC) => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const item = { id: 'rec_arch', name: 'پناهی', amount: 15000000, day: 4, account: ACC, sectionId: 's1', sectionTitle: 'سارا', contractStart: { d: 4, m: 4, y: 1405 }, contractEnd: { d: 4, m: 4, y: 1406 }, fromKey: 140507, genKey: 140507 };
    recurringIncomes.push(item);
    /* مهر و شهریور وصل؛ مرداد هنوز وصل نیست */
    recLinkRow(item, periodData.income.sections[0].rows[0]);
    recLinkRow(item, archive[periodKey(1405, 6)].income.sections[0].rows[0]);
    openFeatureSheet('recurring'); await w(400);
    document.querySelector('[data-rec-arch="' + (recurringIncomes.length - 1) + '"].rec-arch-btn').click(); await w(150);
    const m = document.getElementById('recArchiveModal');
    const months = [...m.querySelectorAll('.rec-arch-row td:first-child')].map(td => td.textContent);
    const text = m.innerText;
    /* افزودن واریزهای قبلی */
    document.getElementById('recArchAddPrev').click(); await w(150);
    const pm = document.getElementById('recAddPrevModal');
    const candText = pm ? pm.innerText : '';
    if (pm) { pm.querySelector('input[type=checkbox]').checked = true; pm.querySelector('[data-act="ok"]').click(); }
    await w(200);
    const months2 = [...document.querySelectorAll('#recArchiveModal .rec-arch-row td:first-child')].map(td => td.textContent);
    /* بازگشت: فقط آرشیو بسته شود */
    onBackGuard(); await w(300);
    const afterBack = { modal: !!document.getElementById('recArchiveModal'), feature: _featureActive === 'recurring' };
    return { months, text, candText, months2, afterBack };
  }, ACC);
  ok(ar.months.join('|') === 'شهریور ۱۴۰۵|مهر ۱۴۰۵', 'آرشیو به ترتیب ماه: شهریور بالای مهر (' + ar.months.join('، ') + ')');
  ok(/جمع دریافتی/.test(ar.text) && /۳۰,۰۰۰,۰۰۰/.test(ar.text) && /ملت مصنوعی/.test(ar.text), 'خلاصه: جمع دریافتی ۳۰ میلیون، با بانک و جزئیات هر واریز');
  ok(/مرداد/.test(ar.candText), '«افزودن واریزهای قبلی»: واریز مرداد (وصل‌نشده) پیشنهاد شد');
  ok(ar.months2.join('|') === 'مرداد ۱۴۰۵|شهریور ۱۴۰۵|مهر ۱۴۰۵', 'بعد از افزودن: مرداد بالای شهریور و مهر');
  ok(!ar.afterBack.modal && ar.afterBack.feature, 'بازگشت: آرشیو بسته شد و منوی درآمد ثابت ماند');
  await ctx.close();

  console.log('• باز شدن روی ماه امروز');
  {
    const c2 = await b.newContext({ viewport: { width: 412, height: 915 } });
    await c2.addInitScript(() => {
      ['tourDone', 'bankSetupDone', 'cardSwipeHintDone', 'recCleanupAsked'].forEach(k => localStorage.setItem('hesabKetabArchive_v5_' + k, '1'));
      localStorage.setItem('hesabKetabArchive_v5_autoBackup', JSON.stringify({ enabled: false }));
      if (!sessionStorage.getItem('__m')) { sessionStorage.setItem('__m', '1'); localStorage.setItem('hesabKetabArchive_v5_meta', JSON.stringify({ currentYear: 1405, currentMonth: 9 })); }
    });
    const p2 = await c2.newPage(); p2.on('pageerror', e => errors.push(e.message));
    await p2.clock.setFixedTime(new Date('2026-10-13T09:00:00Z'));
    await p2.goto(INDEX); await p2.waitForTimeout(1500);
    const m = await p2.evaluate(() => [currentYear, currentMonth]);
    ok(m[0] === 1405 && m[1] === 7, 'بسته شده روی آذر (آینده) → دوباره روی مهر (ماه امروز) باز شد');
    await c2.close();
  }

  await b.close();
  ok(errors.length === 0, 'هیچ خطای JS در صفحه' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  console.log('\nsearch-archive: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e && e.stack || e); process.exit(1); });

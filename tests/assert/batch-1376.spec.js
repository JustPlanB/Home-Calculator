// ۱.۳.۷۶: پیشنهاد شرح از اولین حرف؛ دسته‌های رنگی دو ردیف پنج‌تایی (باکس پیامک و ویرایش ردیف)؛ جدول درآمد/مخارج تا پایین صفحه؛
// برچسب قسط روی برداشت هم‌مبلغ؛ کادر راهنما با شکل دقیق باکس. فقط دادهٔ مصنوعی.
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');

const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const allErrors = [];
async function fresh(b, vh) {
  const ctx = await b.newContext({ viewport: { width: 390, height: vh || 844 }, timezoneId: 'Asia/Tehran' });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, BASE_LS);
  const page = await ctx.newPage();
  page.on('pageerror', e => allErrors.push(e.message));
  await page.clock.setFixedTime(new Date('2026-11-03T09:10:00Z'));
  await page.goto(INDEX); await page.waitForTimeout(1800);
  return { ctx, page };
}

(async () => {
  const b = await chromium.launch();

  console.log('• پیشنهاد شرح');
  const A = await fresh(b);
  const a = await A.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const t = hkMainTitle(), exp = findSectionByTitle('expense', t), inc = findSectionByTitle('income', t);
    const mk = (d, n) => { for (let i = 0; i < n; i++) exp.rows.push(Object.assign(emptyRow('expense'), { day: String(1 + i % 20), desc: d, amount: 1000 * (i + 1), status: 'paid' })); };
    mk('سوپرمارکت', 5); mk('سبزی', 2); mk('کافه سپهر', 3); mk('اسنپ', 4);
    inc.rows.push(Object.assign(emptyRow('income'), { day: '1', desc: 'سود سپرده', amount: 5000, status: 'paid' }));
    persistCurrent();
    const L = hkDescSuggestList('expense', 'س');
    const Li = hkDescSuggestList('income', 'س');
    /* فیلد واقعی ویرایش ردیف */
    hkOpenRowEdit({ row: Object.assign(emptyRow('expense'), {}), tab: 'expense', sec: exp, isNew: true }); await w(300);
    const ds = document.querySelector('#hkRowEdit .hk-re-desc');
    ds.focus(); ds.value = 'س'; ds.dispatchEvent(new Event('input', { bubbles: true })); await w(50);
    const pop = document.getElementById('hkDescSug'), items = pop ? [...pop.querySelectorAll('.hk-desc-sug-it')].map(x => x.textContent) : [];
    pop.querySelector('.hk-desc-sug-it').click(); await w(50);
    const picked = ds.value, gone = !document.getElementById('hkDescSug');
    try { document.getElementById('hkRowEdit')._hkCancel ? document.getElementById('hkRowEdit')._hkCancel() : document.getElementById('hkRowEdit').remove(); } catch (e) {}
    return { L, Li, items, picked, gone };
  });
  ok(a.L.join('|') === 'سوپرمارکت|سبزی|کافه سپهر|اسنپ', 'از اولین حرف: اول شروع‌شونده‌ها به ترتیب بیشترین استفاده، بعد شروع کلمه، بعد بقیه (' + a.L.join('، ') + ')');
  ok(a.Li.join('|') === 'سود سپرده', 'پیشنهادهای درآمد جدا از خرج');
  ok(a.items[0] === 'سوپرمارکت' && a.picked === 'سوپرمارکت' && a.gone, 'ویرایش ردیف: با تایپ حرف اول فهرست می‌آید و زدن پیشنهاد شرح را پر می‌کند');
  await A.ctx.close();

  console.log('• دسته‌های رنگی');
  const C = await fresh(b);
  const c = await C.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    openSmsConfirmModal({ type: 'expense', amount: 120000, bank: '', day: '12', month: 8, year: 1405, raw: 'بانک ملت\nبرداشت:1,200,000\nمانده:5,000,000' }); await w(500);
    const g = document.getElementById('smsCatGrid'), tiles = [...g.querySelectorAll('.sms-cat')];
    const tops = [...new Set(tiles.map(x => Math.round(x.getBoundingClientRect().top)))];
    const cols = getComputedStyle(g).gridTemplateColumns.split(' ').length;
    const colors = new Set(tiles.filter(x => !x.classList.contains('sms-cat-more')).map(x => getComputedStyle(x.querySelector('i')).color));
    try { closeSmsConfirmModal('cancel'); } catch (e) {}
    await w(200);
    const t = hkMainTitle(), exp = findSectionByTitle('expense', t);
    const row = Object.assign(emptyRow('expense'), { day: '3', desc: 'خرید', amount: 50000, status: 'paid' }); exp.rows.push(row); persistCurrent();
    hkOpenRowEdit({ row, tab: 'expense', sec: exp }); await w(300);
    const catB = [...document.querySelectorAll('#hkRowEdit .hk-re-sel')].find(x => /دسته/.test(x.textContent));
    catB.click(); await w(200);
    const sh = document.getElementById('hkCatPick'), sg = sh && sh.querySelector('.sms-cat-grid');
    const same = !!sg && sg.classList.contains('hk-cat-colored') && getComputedStyle(sg).gridTemplateColumns.split(' ').length === 5;
    const food = sh.querySelector('[data-cat="food"]'); food.click(); await w(100);
    const chosen = catB.textContent;
    return { n: tiles.length, rows: tops.length, cols, colors: colors.size, same, chosen };
  });
  ok(c.n === 10 && c.rows === 2 && c.cols === 5, 'باکس پیامک: دو ردیف پنج‌تایی (۹ دسته + «بیشتر»)');
  ok(c.colors >= 7, 'هر دسته رنگ خودش را دارد (' + c.colors + ' رنگ)');
  ok(c.same && /خوراکی/.test(c.chosen), 'ویرایش ردیف: همان شبکهٔ رنگی ۵ستونی؛ انتخاب کار می‌کند');
  await C.ctx.close();

  console.log('• جدول درآمد/مخارج تا پایین صفحه');
  for (const vh of [844, 700]) {
    const T = await fresh(b, vh);
    const t = await T.page.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const tt = hkMainTitle(), exp = findSectionByTitle('expense', tt);
      exp.rows = []; for (let i = 0; i < 30; i++) exp.rows.push(Object.assign(emptyRow('expense'), { day: String(1 + (i % 28)), desc: 'خرج ' + i, amount: (i + 1) * 10000, status: 'paid' }));
      persistCurrent(); renderAll(); openPersonDetail(tt, 'expense'); await w(1200);
      const box = document.querySelector('.person-detail-box'), sc = box.querySelector('.person-detail-scroll'), hint = box.querySelector('.person-detail-hint'), fab = document.getElementById('hkScrollFab');
      const rh = sc.querySelector('tbody tr').getBoundingClientRect().height, full = Math.floor(((innerHeight - 12) - sc.getBoundingClientRect().top - 28 - 2) / rh);
      const rg = document.createRange(); rg.selectNodeContents(hint); const tr = rg.getClientRects()[0];
      const fr = fab.getBoundingClientRect();
      return { bottom: innerHeight - box.getBoundingClientRect().bottom, n: Math.round(sc.clientHeight / rh), full, gap: tr.top - sc.getBoundingClientRect().bottom, align: Math.abs((fr.top + fr.height / 2) - (tr.top + tr.height / 2)) < 2, col: getComputedStyle(fab).backgroundColor === getComputedStyle(box).backgroundColor };
    });
    ok(t.bottom <= 14 && t.n === Math.max(6, t.full - 2), vh + 'px: باکس تا پایین صفحه، تعداد ردیف‌ها همان (' + t.n + ')');
    ok(t.gap < 20, vh + 'px: راهنما نزدیک پایین جدول (' + Math.round(t.gap) + ')');
    ok(t.align && t.col, vh + 'px: دایرهٔ اسکرول هم‌رنگ زمینهٔ جدول و هم‌تراز نوشتهٔ راهنما');
    await T.ctx.close();
  }

  console.log('• برچسب قسط روی برداشت هم‌مبلغ');
  const I = await fresh(b);
  const ti = await I.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const t = hkMainTitle(), exp = findSectionByTitle('expense', t);
    exp.rows = [Object.assign(emptyRow('expense'), { id: 'x1', day: '6', desc: 'انتقال به مسکن', amount: 1850000, status: 'paid' }), Object.assign(emptyRow('expense'), { id: 'x2', day: '6', desc: 'نان', amount: 30000, status: 'paid' })];
    persistCurrent();
    enqueueBankSms('بانک مسکن\nواريز قسط به مبلغ:18,500,000ريال\nزمان:1405/08/06-09:05\nاز کارت:6280-23**-****-7711\nبه کارت:5047-06**-****-2979\nتعداد اقساط پرداختي :36\nمانده معوق :0\nمانده جريمه :0\nشماره پيگيري:770011', { silent: true });
    await w(900);
    const rows = findSectionByTitle('expense', t).rows;
    openPersonDetail(t, 'expense'); await w(900);
    const tags = [...document.querySelectorAll('.person-detail-box .hk-inst-tag')].map(x => x.textContent);
    const again = hkInstTagRows();
    return { tag: rows[0].instTag, desc: rows[0].desc, other: !rows[1].instTag, tags, again };
  });
  ok(ti.tag === 'قسط مسکن ۲۹۷۹ · ۳۶' && ti.desc === 'انتقال به مسکن' && ti.other, 'برداشت هم‌روز و هم‌مبلغ: برچسب جدای «قسط مسکن ۲۹۷۹ · ۳۶»؛ شرح کاربر دست نخورد');
  ok(ti.tags.length === 1 && ti.again === 0, 'برچسب زیر شرح در جدول؛ دوباره زده نمی‌شود');
  await I.ctx.close();

  console.log('• راهنما: شکل دقیق باکس');
  const G = await fresh(b);
  await G.page.evaluate(() => startAppTour(true)); await G.page.waitForTimeout(400);
  let shaped = null;
  for (let i = 0; i < 12; i++) {
    const s = await G.page.evaluate(() => { const t = document.querySelector('#appTour .tour-title').textContent, sp = document.querySelector('#appTour .tour-spot');
      return { t, shaped: sp.classList.contains('shaped'), rect: !!sp.querySelector('.tour-shape rect[mask]'), arc: !!sp.querySelector('.tour-shape circle[clip-path]'), pulse: getComputedStyle(sp.querySelector('.tour-pulse')).display }; });
    if (s.t === 'میان‌برها' || s.t === 'ثبت و جستجو') { shaped = shaped || []; shaped.push(s); }
    if (s.t === 'موجودی' && shaped) { shaped.push(Object.assign({ round: true }, s)); }
    if (s.t === 'ثبت و جستجو') break;
    await G.page.click('#appTour .tour-next'); await G.page.waitForTimeout(520);
  }
  ok(shaped && shaped.filter(x => !x.round).length === 2 && shaped.filter(x => !x.round).every(x => x.shaped && x.rect && x.arc && x.pulse === 'none'), 'میان‌برها و ثبت و جستجو: کادر سبز دقیقاً شکل باکس با فرورفتگی دور دایره');
  await G.ctx.close();

  ok(allErrors.length === 0, 'هیچ خطای JS ' + allErrors.slice(0, 3).join(' | '));
  await b.close();
  console.log('\nbatch-1376: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();

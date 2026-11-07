// ۱.۳.۸۲: «جیب به جیب» (در جمع‌ها نه، در موجودی بله)، جفت‌یابی، کاشی‌های آیکون‌دار دسته در باکس هوشمند، نام «پس‌انداز این ماه»،
// تاریخ روز غیر بولد، لغو ویرایش نام با بستن منو، ویجت پشته‌ای و فونت وزیر در صفحه‌های بومی. فقط دادهٔ مصنوعی.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');
const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const allErrors = [];
(async () => {
  console.log('• کد بومی اندروید');
  const pa = require('../lib/android-src')();
  ok(/<StackView android:id="@\+id\/hk_ws_list"[^>]*android:loopViews="true"/.test(pa), 'ویجت یک‌خطی: StackView با چرخش بی‌پایان');
  ok(!/LOOP_COUNT/.test(pa) && !/setScrollPosition\(R\.id\.hk_ws_list/.test(pa) && /return HkWidgetSmallProvider\.PAGES;/.test(pa), 'فهرست بی‌پایان و پرش اسکرول حذف شد؛ دو صفحه');
  const cfg = pa.slice(pa.indexOf('public class HkWidgetTxConfig'), pa.indexOf('public class HkWidgetTxConfig') + 4000);
  ok(/R\.font\.hk_vazir_bold/.test(cfg) && /hkVazir\(v\); super\.setContentView\(v\)/.test(cfg), 'پنجرهٔ تنظیم ویجت تراکنش‌ها با فونت وزیر');
  const qa = pa.slice(pa.indexOf('public class HkQuickActivity'), pa.indexOf('public class HkQuickActivity') + 9000);
  ok(/R\.font\.hk_vazir_regular/.test(qa) && (qa.match(/hkVazir\(box\)/g) || []).length === 2, 'پنجرهٔ ثبت سریع پیامک هم با فونت وزیر');
  const cl = fs.readFileSync(path.join(__dirname, '..', '..', 'CLAUDE.md'), 'utf8');
  ok(/فونت نرم‌افزار \(وزیر\) همه‌جا/.test(cl), 'قاعدهٔ فونت در دستورات پروژه');

  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Tehran' });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, BASE_LS);
  const page = await ctx.newPage();
  page.on('pageerror', e => allErrors.push(e.message));
  await page.clock.setFixedTime(new Date('2026-11-03T09:10:00Z'));
  await page.goto(INDEX); await page.waitForTimeout(1800);

  console.log('• جیب به جیب: بیرون از جمع‌ها، داخل موجودی');
  const r = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    selectedBankAccounts.push({ id: 'a1', bank: 'بانک ملت', label: 'ملت', openingBalance: 0, createdAt: { y: 1400, m: 1 } });
    selectedBankAccounts.push({ id: 'a2', bank: 'بانک ملی', label: 'ملی', openingBalance: 0, createdAt: { y: 1400, m: 1 } });
    normalizeSelectedBanks(); saveBankAccountsSelection();
    const t = hkMainTitle();
    const ex = periodData.expense.sections.find(s => s.title === t), inc = periodData.income.sections.find(s => s.title === t);
    const old = Date.now() - 86400000 * 400;
    ex.rows = [Object.assign(emptyRow('expense'), { day: '5', desc: 'خرید نان', amount: 100000, status: 'paid', account: 'ملت', createdAt: old }),
               Object.assign(emptyRow('expense'), { day: '6', desc: 'انتقال', amount: 500000, status: 'paid', account: 'ملت', p2p: true, createdAt: old })];
    inc.rows = [Object.assign(emptyRow('income'), { day: '1', desc: 'حقوق', amount: 2000000, status: 'paid', account: 'ملی', createdAt: old }),
                Object.assign(emptyRow('income'), { day: '6', desc: 'انتقال', amount: 500000, status: 'paid', account: 'ملی', p2p: true, createdAt: old })];
    persistCurrent(); renderAll(); await w(300);
    const pt = personTotals(t);
    const bal = globalAccountBalances();
    const cls = HKCategorizer.classify('انتقال', ex.rows[1]);
    const ov = document.createElement('div'); ov.innerHTML = spPageOverview(spCollect(t)) || '';
    return { inc: pt.incomeTotal, exp: pt.expenseTotal, melat: bal['ملت'], melli: bal['ملی'], cls: cls && cls.id, ovTxt: ov.textContent, formula: !!ov.querySelector('.sp-ov-formula') };
  });
  ok(r.inc === 2000000 && r.exp === 100000, 'جمع درآمد و مخارج بدون «جیب به جیب» (' + r.inc + ' / ' + r.exp + ')');
  ok(r.melat === -600000 && r.melli === 2500000, 'موجودی کارت‌ها جابه‌جایی را حساب می‌کند (' + r.melat + ' / ' + r.melli + ')');
  ok(r.cls === 'p2p', 'دستهٔ ردیف «جیب به جیب» است');
  ok(/پس‌انداز این ماه/.test(r.ovTxt) && !/پس‌انداز کارت/.test(r.ovTxt) && /درآمد این ماه − خرج این ماه/.test(r.ovTxt) && r.formula, 'اسلاید «وضعیت این ماه»: «پس‌انداز این ماه» + خط توضیح');

  const tb = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    openPersonDetail(hkMainTitle(), 'expense'); await w(600);
    const tr = document.querySelector('tr.hk-p2p-row');
    const ic = tr && tr.querySelector('td.hk-p2p-num .hk-p2p-rowic');
    return { tr: !!tr, after: ic ? 'icon' : '' };
  }).catch(() => ({ tr: false, after: '' }));
  ok(tb.tr && tb.after === 'icon', 'ردیف «جیب به جیب» در جدول کم‌رنگ با آیکون در ستون ردیف (۱.۳.۸۵)');

  console.log('• ویرایش ردیف و معرفی');
  const re = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    try { closePersonDetail && closePersonDetail(); } catch (e) {}
    await w(200);
    const t = hkMainTitle(), sec = periodData.income.sections.find(s => s.title === t);
    const row = sec.rows[0];
    hkOpenRowEdit({ row, tab: 'income', title: t, sec, num: 1, onSaved: function () {} }); await w(400);
    const catB = [...document.querySelectorAll('#hkRowEdit .hk-re-sel')].find(x => /دسته/.test(x.textContent));
    if (!catB) return { catB: false };
    catB.click(); await w(250);
    const tile = document.querySelector('#hkCatPick .sms-cat[data-cat="p2p"]');
    const sub = tile && tile.querySelector('.hk-p2p-sub') && tile.querySelector('.hk-p2p-sub').textContent;
    const info = !!(tile && tile.querySelector('.hk-p2p-info'));
    tile.click(); await w(300);
    const intro = !!document.getElementById('hkP2PIntro');
    const okb = document.querySelector('#hkP2PIntro .hk-p2p-ok'); if (okb) okb.click(); await w(200);
    document.querySelector('#hkRowEdit .hk-re-ok').click(); await w(400);
    const pt = personTotals(t);
    const intro2 = (hkP2PIntro(false), !!document.getElementById('hkP2PIntro'));
    return { catB: true, sub, info, intro, p2p: !!row.p2p, inc: pt.incomeTotal, intro2 };
  });
  ok(re.catB, 'دسته برای ردیف درآمد هم در ویرایش هست');
  ok(!re.sub && re.info, 'کاشی «جیب به جیب» با ⓘ (۱.۳.۸۳: بدون زیرنویس)');
  ok(re.intro && !re.intro2, 'معرفی کوتاه فقط بار اول');
  ok(re.p2p && re.inc === 0, 'ذخیره: ردیف «جیب به جیب» شد و از جمع درآمد بیرون رفت');

  console.log('• جفت‌یابی خودکار');
  const pr = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const t = hkMainTitle();
    const ex = periodData.expense.sections.find(s => s.title === t), inc = periodData.income.sections.find(s => s.title === t);
    const now = Date.now();
    ex.rows.push(Object.assign(emptyRow('expense'), { day: '12', desc: 'کارت به کارت', amount: 300000, status: 'paid', account: 'ملت', time: '10:00', createdAt: now }));
    inc.rows.push(Object.assign(emptyRow('income'), { day: '12', desc: 'واریز', amount: 300000, status: 'paid', account: 'ملی', time: '10:05', createdAt: now + 60000 }));
    persistCurrent(); await w(1400);
    const ask = document.getElementById('hkP2PAsk');
    const msg = ask && ask.querySelector('.hk-p2p-msg').textContent;
    if (ask) { ask.querySelector('.hk-p2p-always').checked = true; ask.querySelector('.hk-p2p-yes').click(); }
    await w(300);
    const a = ex.rows[ex.rows.length - 1], c = inc.rows[inc.rows.length - 1];
    const auto = JSON.parse(localStorage.getItem(STORAGE_KEY + '_p2pAuto') || 'null') || hkP2PAutoPairs();
    /* بار دوم بی‌سؤال */
    ex.rows.push(Object.assign(emptyRow('expense'), { day: '13', desc: 'کارت به کارت', amount: 70000, status: 'paid', account: 'ملی', createdAt: now + 1000 }));
    inc.rows.push(Object.assign(emptyRow('income'), { day: '13', desc: 'واریز', amount: 70000, status: 'paid', account: 'ملت', createdAt: now + 2000 }));
    persistCurrent(); await w(1400);
    const ask2 = !!document.getElementById('hkP2PAsk');
    const a2 = ex.rows[ex.rows.length - 1], c2 = inc.rows[inc.rows.length - 1];
    /* «نه» = دیگر نپرسد */
    ex.rows.push(Object.assign(emptyRow('expense'), { day: '14', desc: 'خرید', amount: 90000, status: 'paid', account: 'ملت', createdAt: now + 3000 }));
    selectedBankAccounts.push({ id: 'a3', bank: 'بانک صادرات', label: 'صادرات', openingBalance: 0, createdAt: { y: 1400, m: 1 } }); normalizeSelectedBanks(); saveBankAccountsSelection();
    inc.rows.push(Object.assign(emptyRow('income'), { day: '14', desc: 'فروش', amount: 90000, status: 'paid', account: 'صادرات', createdAt: now + 4000 }));
    persistCurrent(); await w(1400);
    const ask3 = document.getElementById('hkP2PAsk'); if (ask3) ask3.querySelector('.hk-p2p-no').click(); await w(300);
    const a3 = ex.rows[ex.rows.length - 1];
    persistCurrent(); await w(1400);
    return { msg, p2p: !!(a.p2p && c.p2p), auto: auto.length, ask2, p2p2: !!(a2.p2p && c2.p2p), ask3: !!ask3, no3: !!a3.p2pNo && !a3.p2p, again: !!document.getElementById('hkP2PAsk') };
  });
  ok(/۳۰۰٬۰۰۰|300,000|۳۰۰,۰۰۰/.test(pr.msg || '') && /ملی/.test(pr.msg || '') && /ملت/.test(pr.msg || ''), 'برداشت و واریز هم‌مبلغ بین دو کارت خودم: پرسیده می‌شود');
  ok(pr.p2p && pr.auto >= 1, '«بله» + «همیشه برای این دو کارت»: هر دو ردیف جیب به جیب شدند');
  ok(!pr.ask2 && pr.p2p2, 'بار بعد بین همان دو کارت بی‌سؤال جیب به جیب شد');
  ok(pr.ask3 && pr.no3 && !pr.again, '«نه، خرج و درآمد است»: دیگر پرسیده نمی‌شود');

  console.log('• باکس پیامک');
  const sm = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const d = document.createElement('input'); d.id = 'smsConfirmDesc'; document.body.appendChild(d);
    hkSmsCatGrid({ type: 'expense', raw: 'برداشت' }); await w(50);
    const g = document.getElementById('smsCatGrid');
    let has = !!(g && g.querySelector('[data-cat="p2p"]'));
    if (!has && g) { const m = g.querySelector('.sms-cat-more'); if (m) { m.click(); await w(200); has = !!document.querySelector('.sms-cat[data-cat="p2p"]'); } }
    document.querySelectorAll('.sms-cat-more-ov').forEach(x => x.remove());
    if (g) g.remove(); d.remove();
    return { has };
  });
  ok(sm.has, 'دستهٔ «جیب به جیب» در باکس ثبت پیامک');

  console.log('• کاشی‌های دسته در باکس هوشمند');
  const cs = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const t = hkMainTitle();
    openCategoryReviewSheet(t); await w(250);
    const row = document.querySelector('.sp-cat-sheet .sp-cat-row'); if (!row) return { row: false };
    row.click(); await w(250);
    const g = document.querySelector('.sp-cat-sheet .sp-pick-grid');
    const tiles = [...g.querySelectorAll('.sms-cat[data-id]')];
    const first = tiles[0];
    const svg = !!(first && first.querySelector('i svg'));
    const cc = first && first.style.getPropertyValue('--cc');
    const cols = getComputedStyle(g).gridTemplateColumns.split(' ').length;
    const last = tiles[tiles.length - 1].getAttribute('data-id');
    const xs = g.querySelectorAll('.sp-pick-t .sp-pick-x').length;
    const add = !!g.querySelector('.sp-pick-tadd');
    /* چندانتخابی */
    const off = tiles.filter(x => x.getAttribute('data-id') && x.getAttribute('data-id') !== 'p2p' && !x.classList.contains('on'));
    off[0].click(); await w(50); off[1].click(); await w(50);
    const on = g.querySelectorAll('.sms-cat.on').length;
    try { closeCategoryReviewSheet(); } catch (e) {}
    return { row: true, cls: g.className, svg, cc, cols, last, xs, add, on, n: tiles.length };
  });
  ok(cs.row && /hk-cat-colored/.test(cs.cls) && cs.svg && cs.cc, 'دسته‌ها کاشی رنگی آیکون‌دار، مثل پنجرهٔ دستهٔ ویرایش ردیف');
  ok(cs.cols === 5, 'چیدمان پنج‌ستونه (' + cs.cols + ')');
  ok(cs.last === '' && cs.xs === cs.n - 2 && cs.add, '«نامشخص» آخر؛ × حذف روی دسته‌ها (جز جیب به جیب) و «+» دستهٔ جدید سر جایشان');
  ok(cs.on >= 2, 'چند دسته با هم انتخاب می‌شود');

  console.log('• تاریخ روز و ویرایش نام');
  const tl = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const s = [...document.styleSheets].flatMap(x => { try { return [...x.cssRules]; } catch (e) { return []; } });
    const rule = s.filter(r => r.selectorText === '.hk-today-line b').pop();
    openSideMenu(); await w(300);
    document.getElementById('menuUserName').click(); await w(400);
    const old = hkMainTitle();
    document.querySelector('#menuUserNameText .hk-mprof-pen').click(); await w(150);
    const inp = document.querySelector('#menuUserNameText input'); const had = !!inp;
    if (inp) inp.value = 'اسم نیمه‌کاره';
    closeSideMenu(); await w(300);
    return { fw: rule && rule.style.fontWeight, had, gone: !document.querySelector('#menuUserNameText input'), same: hkMainTitle() === old, act: document.activeElement && document.activeElement.tagName };
  });
  ok(tl.fw === '500', 'تاریخ شمسی روز غیر بولد (' + tl.fw + ')');
  ok(tl.had && tl.gone && tl.same && tl.act !== 'INPUT', 'بستن منو ویرایش نام را لغو می‌کند و کیبورد باز نمی‌ماند');

  ok(allErrors.length === 0, 'بدون خطای صفحه' + (allErrors.length ? ': ' + allErrors.slice(0, 3).join(' | ') : ''));
  await b.close();
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

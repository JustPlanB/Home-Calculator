// ۱.۳.۸۶ (به‌روزرسانی ضروری): زرد پرداخت‌نشده، دستهٔ تازه با آیکون/رنگ، نام تکراری، جدول فقط‌خواندنی،
// آیکون دلار ردیف قسط و باکس توضیح، هشدار تکراری ماندگار، انتخاب متن فقط هنگام تایپ، ویجت «همه». فقط دادهٔ مصنوعی.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const INDEX = require('../lib/index-url');
const androidSource = require('../lib/android-src');
const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const allErrors = [];
(async () => {
  const root = path.join(__dirname, '..', '..');
  const ver = JSON.parse(fs.readFileSync(path.join(root, 'version.json'), 'utf8'));
  ok(ver.critical === true && ver.versionName === '1.3.86', 'نسخهٔ ۱.۳.۸۶ به‌عنوان به‌روزرسانی ضروری');

  console.log('• ویجت‌ها (کد بومی)');
  const pa = androidSource();
  ok(!/HkWidgetSmallProvider|HkWidgetListService|hk_widget_small/.test(pa), 'ویجت پشته‌ای کامل حذف شد (کلاس، سرویس، چیدمان، manifest)');
  ok(/btn\("همه", "all"/.test(pa) && /"tx_all"/.test(pa) && /static boolean isAll\(/.test(pa), 'ویجت ردیف‌ها: گزینهٔ «همه» با دادهٔ جدا');
  ok(/all \? "i"\.equals\(o\.optString\("x","e"\)\) : inc/.test(pa) && /all \? "همه"/.test(pa), '«همه»: رنگ هر ردیف از نوع خودش (درآمد/مخارج)، عنوان «همه»');

  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Tehran' });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, BASE_LS);
  const page = await ctx.newPage();
  page.on('pageerror', e => allErrors.push(e.message));
  await page.clock.setFixedTime(new Date('2026-11-03T09:10:00Z'));
  await page.goto(INDEX); await page.waitForTimeout(2600);

  console.log('• رنگ‌ها و دسته‌ها');
  const cat = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const o = { unpaid: getComputedStyle(document.documentElement).getPropertyValue('--hk-unsettled').trim().toLowerCase() };
    o.dupFood = HKCategorizer.labelTaken('خوراکی'); o.dupSalary = HKCategorizer.labelTaken('حقوق'); o.dupSpace = HKCategorizer.labelTaken('لوازم  خانه'); o.fresh = HKCategorizer.labelTaken('باغچه');
    const t = hkMainTitle(), ex = periodData.expense.sections.find(q => q.title === t);
    ex.rows = [Object.assign(emptyRow('expense'), { day: '2', desc: 'نان', amount: 30000, status: 'paid' })]; persistCurrent(); renderAll();
    openCategoryReviewSheet(t); await w(200); document.querySelector('.sp-cat-sheet .sp-cat-row').click(); await w(250);
    const g = document.querySelector('.sp-cat-sheet .sp-pick-grid');
    o.debtHidden = !g.querySelector('[data-id="debt"]');
    o.pencil = !!document.querySelector('.sp-pick-ed');
    /* ساخت دسته با اسم تکراری: پیام و ساخته نشدن */
    g.querySelector('.sp-pick-tadd').click(); await w(80);
    const inp = document.querySelector('.sp-cat-sheet .sp-pick-new input');
    o.enterDone = inp && inp.getAttribute('enterkeyhint') === 'done';
    const n0 = HKCategorizer.categories.length;
    inp.value = 'خوراکی'; inp.dispatchEvent(new Event('input', { bubbles: true })); await w(50);
    inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await w(150);
    o.dupMsg = !!document.querySelector('.sp-pick-err') && /دسته‌ای با این اسم/.test(document.querySelector('.sp-pick-err').textContent);
    o.dupNotMade = HKCategorizer.categories.length === n0;
    /* اسم تازه: بلافاصله پنجرهٔ آیکون و رنگ */
    inp.value = 'باغچه'; inp.dispatchEvent(new Event('input', { bubbles: true })); await w(50);
    inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await w(250);
    const st = document.getElementById('hkCatStyle');
    o.styleOpen = !!st; o.icons = st ? st.querySelectorAll('.hk-cst-ic').length : 0; o.cols = st ? st.querySelectorAll('.hk-cst-col').length : 0;
    o.gal = !!(st && st.querySelector('.hk-cst-gal'));
    const c = HKCategorizer.categories.find(x => x.label === 'باغچه');
    if (st) { st.querySelectorAll('.hk-cst-ic')[3].click(); st.querySelectorAll('.hk-cst-col')[2].click(); st.querySelector('.hk-cst-ok').click(); await w(150); }
    o.color = c ? hkCatColor(c.id) : ''; o.icon = c ? (hkCatUserMap('Icon')[c.id] || '') : '';
    o.builtinClash = Object.values(HK_CAT_COLORS).map(x => x.toLowerCase()).indexOf((o.color || '').toLowerCase()) >= 0;
    /* دستهٔ دوم: رنگ و آیکون برداشته‌شده قفل است */
    const c2 = HKCategorizer.addCustom('کلاس سفال');
    hkCatStyleSheet(c2, function () {}); await w(100);
    const st2 = document.getElementById('hkCatStyle');
    o.lockedIcon = !st2.querySelector('.hk-cst-ic[data-k="' + o.icon + '"]'); o.lockedColor = !st2.querySelector('.hk-cst-col[data-c="' + o.color + '"]');
    st2.querySelector('.hk-cst-ok').click(); await w(100);
    o.uniq = hkCatColor(c2.id) !== o.color && hkCatUserMap('Icon')[c2.id] !== o.icon;
    try { categorySheetBack(); categorySheetBack(); closeCategoryReviewSheet(); } catch (e) {}
    HKCategorizer.removeCat(c.id); HKCategorizer.removeCat(c2.id);
    o.cleaned = !hkCatUserMap('Color')[c.id] && !hkCatUserMap('Icon')[c.id];
    return o;
  });
  ok(cat.unpaid === '#ffec0a', 'رنگ پرداخت‌نشده/دریافت‌نشده #ffec0a (' + cat.unpaid + ')');
  ok(cat.dupFood && cat.dupSalary && cat.dupSpace && !cat.fresh, 'اسم تکراری (حتی با فاصلهٔ اضافه، مخارج یا درآمد) شناخته می‌شود');
  ok(cat.debtHidden && !cat.pencil, '«اقساط و وام» در انتخاب دسته نیست؛ مداد ویرایش هم نیست');
  ok(cat.enterDone && cat.dupMsg && cat.dupNotMade, 'دستهٔ تکراری ساخته نمی‌شود و پیام می‌دهد؛ دکمهٔ صفحه‌کلید «تمام»');
  ok(cat.styleOpen && cat.icons >= 28 && cat.cols >= 10 && cat.gal, 'ساخت دسته: بلافاصله انتخاب آیکون از بانک (' + cat.icons + ')، رنگ (' + cat.cols + ') یا عکس گالری');
  ok(cat.color && cat.icon && !cat.builtinClash, 'آیکون و رنگ انتخابی ذخیره شد؛ رنگ با دسته‌های ثابت یکی نیست (' + cat.color + ')');
  ok(cat.lockedIcon && cat.lockedColor && cat.uniq, 'آیکون و رنگ برداشته‌شده برای دستهٔ دیگر قفل است');
  ok(cat.cleaned, 'حذف دسته آیکون و رنگش را هم پاک می‌کند');

  console.log('• جدول: فقط‌خواندنی، آیکون‌های ستون ردیف');
  const tb = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const t = hkMainTitle(), ex = periodData.expense.sections.find(q => q.title === t);
    ex.rows = [
      Object.assign(emptyRow('expense'), { day: '2', desc: 'نان', amount: 30000, status: 'paid' }),
      Object.assign(emptyRow('expense'), { day: '3', desc: 'قسط وام', amount: 1500000, status: 'paid', instTag: 'قسط ۳ از ۱۲ «وام خودرو»' }),
      Object.assign(emptyRow('expense'), { day: '4', desc: 'انتقال', amount: 500000, status: 'paid', p2p: true }),
      emptyRow('expense')
    ];
    persistCurrent(); renderAll(); openPersonDetail(t, 'expense'); await w(500);
    const trs = [...document.querySelectorAll('.person-detail-box tbody tr')];
    const o = {};
    const empty = trs[3];
    const ins = [...empty.querySelectorAll('input, textarea')];
    o.allRO = ins.length >= 3 && ins.every(x => x.readOnly && x.tabIndex === -1);
    ins.forEach(x => x.click()); await w(100);
    o.noFocus = !ins.some(x => x === document.activeElement) && ins.every(x => x.readOnly);
    o.noTag = !document.querySelector('.hk-inst-tag');
    const ic = trs[1].querySelector('td.pd-num-cell .hk-inst-rowic');
    o.inst = !!ic; o.instColor = ic ? getComputedStyle(ic).stroke : '';
    o.instNoNum = !/[۰-۹]/.test(trs[1].querySelector('td.pd-num-cell').textContent);
    trs[1].querySelector('td.pd-num-cell').click(); await w(150);
    const pp = document.querySelector('.cell-text-popup');
    o.instPop = pp ? pp.textContent : '';
    try { closeCellTextPopups(); } catch (e) {}
    trs[2].querySelector('td.pd-num-cell').click(); await w(150);
    const pp2 = document.querySelector('.cell-text-popup');
    o.p2pPop = pp2 ? pp2.textContent : '';
    try { closeCellTextPopups(); } catch (e) {}
    /* انتخاب متن: هیچ‌جا جز خانهٔ در حال تایپ */
    o.bodySel = getComputedStyle(document.querySelector('.person-detail-box td')).userSelect;
    o.roSel = getComputedStyle(trs[0].querySelector('textarea.pd-desc')).userSelect;
    /* ویرایش ردیف: Enter = «تمام»، دوبار ضربه = انتخاب همه */
    hkOpenRowEdit({ row: ex.rows[0], tab: 'expense', title: t, sec: ex, num: 1, onSaved: function () {} }); await w(400);
    const ds = document.querySelector('#hkRowEdit .hk-re-desc'), am = document.querySelector('#hkRowEdit .hk-re-amt');
    o.reDone = ds.getAttribute('enterkeyhint') === 'done' && am.getAttribute('enterkeyhint') === 'done';
    ds.focus(); await w(50);
    o.focusSel = getComputedStyle(ds).userSelect;
    ds.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })); await w(200);
    o.selAll = ds.selectionStart === 0 && ds.selectionEnd === ds.value.length && ds.value.length > 0;
    ds.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); await w(50);
    o.enterBlur = document.activeElement !== ds && ds.value === 'نان';
    document.querySelector('#hkRowEdit .hk-re-no').click(); await w(200);
    return o;
  });
  ok(tb.allRO && tb.noFocus, 'خانه‌های جدول با یک ضربه تایپ نمی‌شوند (ویرایش فقط از لانگ‌پرس)');
  ok(tb.noTag && tb.inst && tb.instNoNum, 'ردیف قسط: برچسب زرد زیر شرح نیست؛ آیکون دلار در ستون ردیف');
  ok(/199, 199, 204/.test(tb.instColor), 'آیکون دلار نقره‌ای (' + tb.instColor + ')');
  ok(/^پرداخت قسط: قسط ۳ از ۱۲/.test(tb.instPop) && /مخارج حساب می‌شود/.test(tb.instPop), 'ضربه روی دلار: «پرداخت قسط: …» با توضیح');
  ok(/^جیب به جیب:/.test(tb.p2pPop) && /حساب نمی‌شود/.test(tb.p2pPop), 'ضربه روی آیکون جیب به جیب: توضیح اینکه در جمع حساب نمی‌شود');
  ok(tb.bodySel === 'none' && tb.roSel === 'none', 'متن و مبلغ جدول قابل انتخاب نیست');
  ok(tb.reDone && tb.focusSel === 'text' && tb.selAll && tb.enterBlur, 'ویرایش ردیف: «تمام» روی صفحه‌کلید، انتخاب فقط هنگام تایپ، دوبار ضربه = انتخاب همه');

  console.log('• هشدار تکراری');
  const dp = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const t = hkMainTitle(), ex = periodData.expense.sections.find(q => q.title === t);
    ex.rows = [
      Object.assign(emptyRow('expense'), { day: '5', desc: 'بنزین', amount: 400000, status: 'paid' }),
      Object.assign(emptyRow('expense'), { day: '5', desc: 'بنزین', amount: 400000, status: 'paid' })
    ];
    persistCurrent(); renderAll();
    const o = { n0: HKAlerts.duplicates(t).length };
    const html = spPageWarn({ alerts: HKAlerts.forCard(t) });
    o.hasId = /data-dup-id="dup:/.test(html || '');
    HKAlerts.dismiss(HKAlerts.duplicates(t)[0].id);
    o.n1 = HKAlerts.duplicates(t).length;
    /* ردیف تازه بالای آن‌ها اضافه شود: نادیده‌گرفتن نباید از بین برود */
    ex.rows.unshift(Object.assign(emptyRow('expense'), { day: '1', desc: 'شیر', amount: 50000, status: 'paid' }));
    persistCurrent(); renderAll(); await w(100);
    o.n2 = HKAlerts.duplicates(t).length;
    return o;
  });
  ok(dp.n0 === 1 && dp.hasId, 'هشدار تکراری با شناسهٔ خود هر مورد (زدن = هایلایت ردیف‌های همان مورد)');
  ok(dp.n1 === 0 && dp.n2 === 0, '«تکراری نیست» ماندگار است، حتی بعد از افزودن ردیف دیگر');

  console.log('• ویجت «همه»');
  const wx = await page.evaluate(() => {
    const t = hkMainTitle(), ex = periodData.expense.sections.find(q => q.title === t), inc = periodData.income.sections.find(q => q.title === t);
    ex.rows = [Object.assign(emptyRow('expense'), { day: '2', desc: 'نان', amount: 30000, status: 'paid' })];
    inc.rows = [Object.assign(emptyRow('income'), { day: '3', desc: 'حقوق آبان', amount: 9000000, status: 'paid' })];
    persistCurrent();
    const all = hkWidgetTxRows('all');
    return { n: all.length, first: all[0], second: all[1], exp: hkWidgetTxRows('expense').length };
  });
  ok(wx.n === 2 && wx.first.x === 'i' && /^\+/.test(wx.first.a) && wx.second.x === 'e' && /^−/.test(wx.second.a) && wx.exp === 1, '«همه»: درآمد و مخارج با هم، تازه‌ترین بالا، با + و −');

  ok(allErrors.length === 0, 'بدون خطای صفحه' + (allErrors.length ? ': ' + allErrors.slice(0, 3).join(' | ') : ''));
  await b.close();
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

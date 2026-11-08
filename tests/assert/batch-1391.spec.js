// ۱.۳.۹۱: پیامک قسط در ثبت تکی، انتخاب متن فقط با خود اندروید، لودینگ چرخان، حرکت نرم بین تب‌ها،
// اندازهٔ ثابت اولویت دسته‌ها، ویجت ردیف‌ها با بارگذاری ۲۰ تایی هنگام اسکرول. فقط دادهٔ مصنوعی.
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
  console.log('• ویجت ردیف‌ها (کد بومی)');
  const pa = androidSource();
  const patch = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'patch-android.js'), 'utf8');
  ok(/static final int PAGE=20;/.test(pa) && /getCount\(\)\{ return visible\(\)\+\(hasMore\(\) \? 1 : 0\); \}/.test(pa), 'اول ۲۰ ردیف و یک ردیف بارگذاری اگر ردیف بیشتری هست');
  ok(/R\.layout\.hk_widget_tx_more/.test(pa) && /postDelayed\([\s\S]*?notifyAppWidgetViewDataChanged\(id, R\.id\.hk_wt_list\)[\s\S]*?\}, 650\)/.test(pa), 'رسیدن به ردیف بارگذاری: کمی بعد ۲۰ ردیف بیشتر (بی دکمهٔ «بیشتر»)');
  ok(/HkWidgetTxService\.resetShown\(ctx, id\)/.test(pa), 'با تازه شدن ویجت دوباره ۲۰ ردیف اول');
  ok(/hk_widget_tx_more\.xml/.test(patch) && /<ProgressBar[\s\S]*?android:indeterminateTint="#FF08B5F5"/.test(patch) && !/بیشتر/.test(fs.readFileSync(path.join(__dirname, '..', '..', 'android-src', 'HkWidgetTxService.java'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')), 'ردیف بارگذاری: دایرهٔ چرخان کوچک آبی نرم‌افزار');

  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Tehran', hasTouch: true });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, BASE_LS);
  const page = await ctx.newPage();
  page.on('pageerror', e => allErrors.push(e.message));
  await page.clock.setFixedTime(new Date('2026-11-03T09:10:00Z'));
  await page.goto(INDEX); await page.waitForTimeout(2600);

  console.log('• پیامک قسط در ثبت تکی');
  const ins = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const toasts = []; const oT = window.showToast; window.showToast = function (m) { toasts.push(String(m)); try { return oT.apply(this, arguments); } catch (e) {} };
    const sms = 'بانک مسکن\nواريز قسط به مبلغ:21652000ريال\nزمان:1405/08/06 14:02:38\nاز کارت:6280231504468900\nبه کارت:6280238039282979\nتعداد اقساط پرداختي :36\nمانده معوق :0\nمانده جريمه :0\nشماره پيگيري:3481115289';
    const o = {};
    openSmsImportModal(); await w(100);
    document.getElementById('smsImportText').value = sms; parseAndPreviewSms(); await w(600);
    o.t1 = toasts.slice(-1)[0] || '';
    o.card = !!(hkInstCards().filter(c => c.id === '2979')[0]);
    o.confirm = !!document.querySelector('#smsConfirmModal.open, #smsConfirmModal[style*="flex"]');
    o.hist = !!document.querySelector('.hk-inst-hist, #hkInstHist, [data-inst-hist]') || toasts.length > 0;
    try { document.querySelectorAll('.modal-overlay.open').forEach(x => { if (x._hkCancel) x._hkCancel(); }); } catch (e) {}
    await w(300);
    openSmsImportModal(); await w(100);
    document.getElementById('smsImportText').value = sms; parseAndPreviewSms(); await w(300);
    o.t2 = toasts.slice(-1)[0] || '';
    o.n = (hkInstCards().filter(c => c.id === '2979')[0] || { log: [] }).log.length;
    try { document.querySelectorAll('.modal-overlay.open').forEach(x => { if (x._hkCancel) x._hkCancel(); }); } catch (e) {}
    window.showToast = oT;
    return o;
  });
  ok(!/نامعتبر/.test(ins.t1) && /۲,۱۶۵,۲۰۰|2,165,200/.test(ins.t1) && /کارت قسط ثبت شد/.test(ins.t1) && ins.card, 'ثبت تکی پیامک قسط: «… تومان در کارت قسط ثبت شد» به‌جای «نامعتبر» (' + ins.t1 + ')');
  ok(/قبلاً/.test(ins.t2) && ins.n === 1, 'همان پیامک دوباره: «قبلاً ثبت شده» و تکراری ثبت نمی‌شود (' + ins.t2 + ')');

  console.log('• انتخاب متن فقط با اندروید');
  const sel = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const o = {};
    const t = hkMainTitle(), ex = periodData.expense.sections.find(q => q.title === t);
    ex.rows = [Object.assign(emptyRow('expense'), { day: '2', desc: 'خرید نان سنگک', amount: 30000, status: 'paid' })]; persistCurrent();
    hkOpenRowEdit({ row: ex.rows[0], tab: 'expense', title: t, sec: ex, num: 1, onSaved: function () {} }); await w(400);
    const ds = document.querySelector('#hkRowEdit .hk-re-desc');
    ds.focus(); await w(50);
    const touch = (el) => { const r = el.getBoundingClientRect(); const tc = new Touch({ identifier: Date.now(), target: el, clientX: r.left + 10, clientY: r.top + 10 }); el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [tc], targetTouches: [tc], changedTouches: [tc] })); return tc; };
    /* نگه‌داشتن: اندروید یک کلمه را انتخاب می‌کند؛ نرم‌افزار دیگر آن را تا کل متن گسترش نمی‌دهد و جمعش هم نمی‌کند */
    touch(ds); ds.setSelectionRange(5, 8); await w(300);
    o.long = [ds.selectionStart, ds.selectionEnd].join(',');
    /* دوبار ضربه روی خانهٔ در حال تایپ: همان انتخاب خود گوشی می‌ماند */
    ds.setSelectionRange(0, 4); ds.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })); await w(200);
    o.dbl = [ds.selectionStart, ds.selectionEnd].join(',');
    o.selBg = getComputedStyle(ds, '::selection').backgroundColor;
    o.noFn = typeof window.hkSelectAllField === 'undefined';
    document.querySelector('#hkRowEdit .hk-re-no').click(); await w(200);
    return o;
  });
  ok(sel.long === '5,8' && sel.dbl === '0,4' && sel.noFn, 'نگه‌داشتن و دوبار ضربه: انتخاب خود اندروید دست نمی‌خورد (' + sel.long + ' / ' + sel.dbl + ')');
  ok(/8, 181, 245/.test(sel.selBg), 'هایلایت آبی انتخاب داخل خانهٔ ویرایش می‌ماند');

  console.log('• لودینگ، تب‌ها و اولویت دسته‌ها');
  const ui = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const o = {};
    const d = document.createElement('div'); d.innerHTML = hkLoadingHtml('در حال خواندن پیامک‌ها'); document.body.appendChild(d);
    const dots = d.querySelector('.hk-loading-dots'), is = [...dots.querySelectorAll('i')];
    o.wrap = getComputedStyle(dots).animationName + '|' + getComputedStyle(dots).animationIterationCount + '|' + getComputedStyle(dots).animationDuration;
    o.dots = is.map(x => getComputedStyle(x).animationName).join(',');
    o.blue = getComputedStyle(is[0]).backgroundColor;
    o.onlyTransform = !/background|opacity/.test([...document.styleSheets].map(s => { try { return [...s.cssRules].filter(r => r.name && /^hkLoad(Spin|D[123])$/.test(r.name)).map(r => r.cssText).join(''); } catch (e) { return ''; } }).join(''));
    d.remove();
    /* اولویت دسته‌ها: اندازهٔ باکس با عوض شدن تب ثابت */
    openCatPriority(); await w(200);
    const box = document.querySelector('#hkCatPriModal .modal-box'); const h0 = Math.round(box.getBoundingClientRect().height);
    box.querySelector('.hk-pri-tabs [data-k="out"]').click(); await w(80);
    const h1 = Math.round(box.getBoundingClientRect().height);
    box.querySelector('.hk-pri-tabs [data-k="in"]').click(); await w(80);
    o.pri = [h0, h1, Math.round(box.getBoundingClientRect().height)];
    o.priScroll = getComputedStyle(box).overflowY;
    document.getElementById('hkCatPriModal').remove();
    /* دُنگ مساوی ← نامساوی: باکس نرم بلند می‌شود (همان ۰٫۴۵ ثانیهٔ فیلد پروژه) */
    hkDongSave({ groups: [{ id: 'g1', name: 'سفر', members: [{ id: 'a', name: 'الف' }, { id: 'b', name: 'ب' }, { id: 'c', name: 'ج' }], expenses: [], settles: [] }] });
    openDongModal(); await w(250);
    document.querySelector('#hkDong .hk-dg-card').click(); await w(200);
    document.querySelector('#hkDong .hk-dg-add').click(); await w(200);
    const ed = document.getElementById('hkDongEd'), eb = ed.querySelector('.modal-box');
    const e0 = eb.getBoundingClientRect().height;
    ed.querySelector('.hk-dg-seg [data-v="uneq"]').click();
    await new Promise(r => requestAnimationFrame(() => r()));
    const an = eb.getAnimations().filter(a => a.effect && a.effect.getKeyframes().some(k => k.height));
    o.tabAnim = an.length === 1 && an[0].effect.getTiming().duration === 450;
    await w(150); const mid = eb.getBoundingClientRect().height;
    await w(500); const e1 = eb.getBoundingClientRect().height;
    o.tabH = [Math.round(e0), Math.round(mid), Math.round(e1)];
    o.tabMid = mid > e0 + 1 && mid < e1 - 1;
    return o;
  });
  ok(/^hkLoadSpin\|infinite\|0\.6s$/.test(ui.wrap) && ui.dots === 'hkLoadD1,hkLoadD2,hkLoadD3' && ui.blue === 'rgb(8, 181, 245)' && ui.onlyTransform, 'لودینگ مثل ویدیو: سه نقطهٔ آبی که دور هم می‌چرخند و دوباره ردیف می‌شوند، پشت سر هم (فقط transform)');
  ok(ui.pri[0] === ui.pri[1] && ui.pri[1] === ui.pri[2] && /auto|scroll/.test(ui.priScroll), 'اولویت دسته‌بندی: اندازهٔ باکس واریزی/برداشت ثابت و داخلش اسکرول (' + ui.pri.join('/') + ')');
  ok(ui.tabAnim && ui.tabMid, 'جابه‌جایی بین تب‌ها با اندازهٔ متفاوت: باکس نرم (۰٫۴۵ ثانیه) به اندازهٔ تازه می‌رود (' + ui.tabH.join('→') + ')');

  ok(!allErrors.length, 'هیچ خطای JS در صفحه' + (allErrors.length ? ' — ' + allErrors.join(' | ') : ''));
  await b.close();
  console.log('\nbatch-1391: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

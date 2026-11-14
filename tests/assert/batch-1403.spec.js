// ۱.۴.۳: «بستن/انصراف» در هیچ‌جا نیست (برگشت همان کار را می‌کند)، فیلدهای «… جدید» با آیکون بعلاوه زیر آخرین مورد،
// نام بالای هر صفحه = نام همان گزینه در منو، ثبت تکی/گروهی، حساب بانکی دلخواه، پرسش پیوست پشتیبان، امنیت (کلید روشن/خاموش)،
// «اندازه فونت»، راهنماها در ⓘ، آمار (فلش‌ها، مبلغ نارنجی)، قرض، جدول پروژه، PDF درآمد ثابت، «گزارش اشکال» پنهان، ویجت‌ها. فقط دادهٔ مصنوعی.
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');
const androidSource = require('../lib/android-src');
const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const allErrors = [];
(async () => {
  console.log('• کد بومی: ویجت‌ها');
  const pa = androidSource();
  ok(/public class HkWidgetLineProvider extends AppWidgetProvider/.test(pa) && /static Bitmap line\(Context c, int W, int H, float k, Data d\)/.test(pa) && /hk_widget_line_info/.test(pa) && /android:targetCellHeight="1"/.test(pa), 'ویجت یک‌خطی موجودی (۴ در ۱) با همان تنظیمات ظاهر');
  ok(!/android:targetCellWidth="3"/.test(pa) && (pa.match(/android:targetCellWidth="4"/g) || []).length === 4 && !/android:minWidth="180dp"/.test(pa), 'اندازهٔ پیش‌فرض ویجت‌ها ۴ در ۲ (یک‌خطی ۴ در ۱)');
  ok(/sp0\.getBoolean\("light",false\)!=lightNow/.test(pa) && /startsWith\("bg_mode_"\)/.test(pa), 'تم انتخاب‌شده در نرم‌افزار پیش‌فرض همهٔ ویجت‌ها می‌شود');
  ok(/float rr=android\.os\.Build\.VERSION\.SDK_INT>=31 \? 0 : 22\*k;/.test(pa) && /android:clipToOutline="true"/.test(pa), 'نوار عنوان ویجت تراکنش‌ها تا دو لبه');
  ok(/HkWidgetLineProvider\.refreshAll\(ctx\)/.test(pa) && /HkWidgetLineProvider\.render\(c, m, id\)/.test(pa), 'ویجت یک‌خطی با بقیه به‌روز می‌شود و تنظیماتش همان را دوباره می‌کشد');

  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Tehran', hasTouch: true });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, BASE_LS);
  const page = await ctx.newPage();
  page.on('pageerror', e => allErrors.push(e.message));
  await page.goto(INDEX); await page.waitForTimeout(2000);

  console.log('• دکمه‌ها و فیلدهای «… جدید»');
  const A = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const vis = el => !!(el && el.getClientRects().length && getComputedStyle(el).display !== 'none');
    const o = {};
    const L = loadFinancialSubjects(); L.push({ id: 'pa', name: 'ویلا', highlightColor: PROJECT_HIGHLIGHT_PALETTE[1].id }); saveFinancialSubjects();
    const out = {};
    for (const [fn, inp, ph] of [['openSubjectsModal', '#subjectNewName', 'پروژه جدید (مثلاً: سهراب/ساختمان آسمان)'], ['openSavingsModal', '#svNewName', 'پس‌انداز جدید'], ['openUserRemindersModal', '#urNewName', 'یادآور جدید'], ['openDongModal', '.hk-dg-newin', 'گروه جدید']]) {
      window[fn](); await w(900);
      const pg = [...document.querySelectorAll('.hk-page')].find(x => x.getClientRects().length);
      const i = pg.querySelector(inp), row = i && i.closest('.hk-newf'), plus = row && row.querySelector('.hk-newf-add');
      const closeVis = [...pg.querySelectorAll('button')].some(x => vis(x) && /^(بستن|انصراف|افزودن)$/.test(x.textContent.trim()));
      out[fn] = { field: !!(row && plus && vis(plus)), ph: (i && i.placeholder || '').indexOf(ph) === 0, closeVis };
      onBackGuard(); await w(700);
    }
    o.fields = out;
    /* «+» پروژه می‌سازد */
    openSubjectsModal(); await w(800);
    document.getElementById('subjectNewName').value = 'سفر'; document.querySelector('#subjectsModal .hk-newf-add').click(); await w(400);
    o.addProj = loadFinancialSubjects().some(s => s.name === 'سفر');
    /* زیر آخرین مورد (نه پایین صفحه) */
    const lr = document.getElementById('subjectsList').getBoundingClientRect(), fr = document.querySelector('#subjectsModal .hk-newf').getBoundingClientRect();
    o.below = fr.top - lr.bottom >= 0 && fr.top - lr.bottom < 30 && fr.bottom < innerHeight - 100;
    onBackGuard(); await w(700);
    /* ثبت تکی/گروهی: «ثبت گروهی» جای «بستن»؛ جای متن بلند */
    openSmsImportModal(); await w(900);
    const bb = [...document.querySelectorAll('#smsImportModal button')].filter(vis).map(x => x.textContent.trim());
    const ta = document.getElementById('smsImportText');
    const h0 = ta.getBoundingClientRect().height; ta.focus(); await w(500); const h1 = ta.getBoundingClientRect().height;
    const row = document.querySelector('#smsImportModal .hk-bulk-open-btn').parentElement;
    o.sms = { bb, sameRow: row.querySelectorAll('button').length === 2 && /تشخیص/.test(row.textContent), tall: h0 >= 200 && Math.abs(h1 - h0) < 2 };
    ta.blur(); onBackGuard(); await w(700);
    /* پنجره‌ای که «انصراف» پنهان دارد با برگشت درست بسته می‌شود (کار خود دکمه) */
    const ov = document.createElement('div'); ov.className = 'modal-overlay open'; ov.id = 'hkTestOv'; ov.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;';
    ov.innerHTML = '<div class="modal-box"><div>آزمایش</div><div class="acts" style="display:flex"><button type="button" class="ok">ثبت</button><button type="button" class="cn">انصراف</button></div></div>';
    let cleaned = false; document.body.appendChild(ov); ov.querySelector('.cn').onclick = () => { cleaned = true; ov.remove(); };
    await w(120);
    const okW = ov.querySelector('.ok').getBoundingClientRect().width, boxW = ov.querySelector('.acts').getBoundingClientRect().width;
    o.hidden = !vis(ov.querySelector('.cn')) && okW > boxW * 0.9;
    onBackGuard(); await w(300);
    o.backCancel = cleaned && !document.getElementById('hkTestOv');
    /* پرسش بلی/خیر دست نمی‌خورد */
    askConfirm('آزمایش؟', () => {}); await w(200);
    o.confirmKeep = vis(document.getElementById('confirmNo')) && vis(document.getElementById('confirmYes'));
    document.getElementById('confirmNo').click(); await w(200);
    return o;
  });
  Object.keys(A.fields).forEach(k => ok(A.fields[k].field && A.fields[k].ph && !A.fields[k].closeVis, k + ': فیلد «… جدید» با آیکون بعلاوه، بی دکمهٔ بستن/انصراف/افزودن'));
  ok(A.addProj && A.below, 'زدن «+» پروژه را می‌سازد؛ فیلد درست زیر آخرین مورد است');
  ok(A.sms.bb.indexOf('بستن') < 0 && A.sms.sameRow && A.sms.tall, 'ثبت تکی/گروهی: «ثبت گروهی» جای «بستن»؛ جای متن بلند می‌ماند (' + A.sms.bb.join('،') + ')');
  ok(A.hidden && A.backCancel, '«انصراف» پنهان؛ دکمهٔ کنارش تمام‌عرض؛ برگشت همان کار «انصراف» را می‌کند');
  ok(A.confirmKeep, 'پرسش «بلی/خیر» دست نخورده');

  console.log('• نام صفحه‌ها، بانک، پشتیبان، امنیت');
  const B = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const o = {}, t = {};
    for (const fn of ['askBackupParts', 'openBankAccountsModal', 'openSavingsModal', 'openHelpModal']) {
      window[fn](); await w(900);
      const pg = [...document.querySelectorAll('.hk-page')].filter(x => x.getClientRects().length).pop();
      t[fn] = (pg.querySelector('.hk-pg-t') || {}).textContent; onBackGuard(); await w(700);
    }
    o.titles = t;
    /* بانک دلخواه: فقط به‌صورت حساب بالا؛ در فهرست پایین نیست */
    localStorage.setItem(STORAGE_KEY + '_customBanks', JSON.stringify(['بانک درخت']));
    openBankAccountsModal(); await w(800);
    o.bankBottom = [...document.querySelectorAll('#bankAccountsModal .hk-bank-add-row span')].some(x => /درخت/.test(x.textContent));
    onBackGuard(); await w(700);
    /* پرسش پیوست‌ها: برگشت اول همان را می‌بندد */
    hkAsk3('پیوست‌ها هم پشتیبان شوند؟', [{ v: 'yes', t: 'با پیوست‌ها' }, { v: 'no', t: 'بدون پیوست‌ها' }], () => {});
    askBackupParts(); await w(700);
    document.getElementById('hkAsk3').style.zIndex = '100700';
    onBackGuard(); await w(300);
    o.askFirst = !document.getElementById('hkAsk3') && !!document.getElementById('backupPickOverlay');
    onBackGuard(); await w(700);
    hkAsk3('آزمایش', [{ v: 'yes', t: 'بله' }], () => {}); await w(100);
    const ov = document.getElementById('hkAsk3'); ov.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await w(100); o.askOutside = !document.getElementById('hkAsk3');
    /* امنیت */
    openSecurityModal(); await w(900);
    const sw = document.getElementById('secLockSw');
    o.sec = { sw: !!sw && sw.getClientRects().length > 0, noBtn: !document.querySelector('#securityModal .sec-btn-primary, #securityModal .sec-btn-danger'), line: getComputedStyle(document.querySelector('#securityModal .sec-row')).borderBottomStyle, fancy: !!document.querySelector('#securityModal .fancy-select-wrap #secAutoLockSel') };
    onBackGuard(); await w(700);
    return o;
  });
  ok(B.titles.askBackupParts === 'پشتیبان‌گیری' && B.titles.openBankAccountsModal === 'انتخاب حساب بانکی' && B.titles.openSavingsModal === 'پس‌انداز (ارز و طلا)' && B.titles.openHelpModal === 'راهنما', 'نام بالای صفحه‌ها همان نام گزینه در منو (' + Object.values(B.titles).join('، ') + ')');
  ok(!B.bankBottom, 'بانک دلخواهِ ساخته‌شده در فهرست بانک‌های پایین نیست');
  ok(B.askFirst && B.askOutside, 'پرسش «با/بدون پیوست‌ها»: برگشت و لمس بیرون اول همان را می‌بندد');
  ok(B.sec.sw && B.sec.noBtn && B.sec.line === 'none' && B.sec.fancy, 'امنیت: کلید روشن/خاموش، بی خط زیر گزینه‌ها، فهرست کشویی مثل بقیه');

  console.log('• شخصی‌سازی');
  const C = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const o = {};
    openPrefsModal(); await w(1100);
    const fr = document.querySelector('#hkPrefsModal [data-k="font"]');
    o.row = fr && /اندازه فونت/.test(fr.textContent);
    fr.click(); await w(1000);
    o.prev = !!document.querySelector('.hk-fz-prev') && /[۰-۹]/.test(document.querySelector('.hk-fz-prev').textContent);
    o.aa = [...document.querySelectorAll('.hk-fz-a')].map(x => x.textContent).join('');
    o.dots = document.querySelectorAll('.hk-fz-dot').length;
    o.noBold = !/بولد|ضخیم|نوع فونت/.test(document.querySelector('#hkPrefsModal').textContent);
    const d = document.querySelectorAll('.hk-fz-dot')[2].getBoundingClientRect(), tr = document.querySelector('.hk-fz-track');
    tr.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: d.left + d.width / 2, clientY: d.top + 3, pointerId: 1 }));
    tr.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 })); await w(300);
    o.big = hkPrefs().font === 'l' && getComputedStyle(document.documentElement).getPropertyValue('--hk-fs-body').trim() === '16px';
    hkPrefSet('font', 'm');
    onBackGuard(); await w(800);
    document.querySelector('#hkPrefsModal [data-k="dock"]').click(); await w(1000);
    const pg = document.getElementById('hkPrefsModal');
    o.tip = !!pg.querySelector('.hk-pg-hd .hk-info-btn') && !pg.querySelector('.hk-pf-note').getClientRects().length;
    onBackGuard(); await w(800);
    /* گزارش اشکال پنهان: هفت بار روی عنوان */
    o.hiddenBefore = !document.querySelector('#hkPrefsModal [data-k="diag"]');
    const t = document.querySelector('#hkPrefsModal .hk-pg-t');
    for (let i = 0; i < 7; i++) t.click();
    await w(300);
    o.shown = !!document.querySelector('#hkPrefsModal [data-k="diag"]') && !!document.querySelector('#hkPrefsModal [data-k="diagCopy"]');
    document.querySelector('#hkPrefsModal [data-k="diag"] .hk-pf-sw').click(); await w(200);
    o.on = hkDiagOn();
    onBackGuard(); await w(900);
    openTrashModal(); await w(900); onBackGuard(); await w(800);
    const txt = hkDiagText();
    o.log = /page/.test(txt) && /back/.test(txt) && /anim\+/.test(txt) && /layers/.test(txt);
    hkDiagSet(false);
    return o;
  });
  ok(C.row && C.prev && C.aa === 'آآ' && C.dots === 3 && C.noBold, '«اندازه فونت»: پیش‌نمایش فارسی و عدد، نوار سه‌پله بین دو «آ»، بی گزینهٔ نوع/بولد');
  ok(C.big, 'نوار اندازه فونت همان لحظه اندازهٔ نوشته‌ها را عوض می‌کند');
  ok(C.tip, 'راهنمای زیرصفحه‌های شخصی‌سازی در ⓘ کنار نام');
  ok(C.hiddenBefore && C.shown && C.on, '«گزارش اشکال» پنهان است و با هفت بار زدن روی عنوان پیدا می‌شود');
  ok(C.log, 'گزارش اشکال باز شدن صفحه، برگشت، ورق خوردن و لایه‌ها را ثبت می‌کند');

  console.log('• آمار، قرض، پروژه، PDF درآمد ثابت');
  await page.evaluate(() => {
    const t = hkMainTitle(); const R = (tab, o) => Object.assign(emptyRow(tab), o);
    findSectionByTitle('expense', t).rows = [R('expense', { day: '2', desc: 'نان', amount: 1270000, status: 'paid' }), R('expense', { day: '3', desc: 'تاکسی', amount: 1450000, status: 'paid' })];
    persistCurrent(); renderAll();
  });
  await page.evaluate(() => openStatsSheet()); await page.waitForTimeout(1300);
  const D = await page.evaluate(async () => {
    const o = {};
    const nb = [...document.querySelectorAll('#statsBody .st-nav-b')];
    o.svg = nb.length === 2 && nb.every(x => x.querySelector('svg'));
    const r = nb[0].getBoundingClientRect(), sr = nb[0].querySelector('svg').getBoundingClientRect();
    o.center = Math.abs((r.left + r.width / 2) - (sr.left + sr.width / 2)) < 1.5 && Math.abs((r.top + r.height / 2) - (sr.top + sr.height / 2)) < 1.5;
    o.orange = [...document.querySelectorAll('#stCats .st-leg-v')].every(x => getComputedStyle(x).color === 'rgb(255, 107, 74)');
    HKStats.close();
    return o;
  });
  ok(D.svg && D.center, 'آمار: فلش‌های دو طرف ماه/سال آیکون و دقیقاً وسط دایره');
  ok(D.orange, 'آمار: مبلغ همهٔ دسته‌های برداشت نارنجی');
  const E = await page.evaluate(async () => {
    const o = {};
    const pdf = hkRecArcPdfBlocks.toString();
    o.recPdf = /<th style="width:6%">ردیف<\/th>/.test(pdf) && /border-top:2\.5px solid #333/.test(pdf) && /gi % 2/.test(pdf);
    const css = [...document.styleSheets].map(s => { try { return [...s.cssRules].map(r => r.cssText).join('\n'); } catch (e) { return ''; } }).join('\n');
    o.led = /hk-led-closing\)[^{]*\.hk-led-scroll\s*\{\s*min-height:\s*0px\s*!important/.test(css) && /textarea\[readonly\]:focus[^{]*\{[^}]*caret-color: transparent/.test(css);
    o.proj = /#projectReportModal \.proj-table thead th \{[^}]*position: sticky[^}]*inset/.test(css);
    return o;
  });
  ok(E.recPdf, 'PDF آرشیو درآمد ثابت: ستون اول «ردیف» هر درآمد؛ هر درآمد یک بلوک جدا (رنگ و خط پررنگ)');
  ok(E.led, 'قرض: جدول به اندازهٔ ردیف‌ها؛ زدن روی خانه قاب و نشانگر تایپ ندارد');
  ok(E.proj, 'جدول پروژه: ردیف عنوان کاملاً مات (ردیف‌ها از لایش دیده نمی‌شوند)');

  await b.close();
  const errs = allErrors.filter(m => !/ResizeObserver/.test(m));
  ok(errs.length === 0, 'بدون خطای JS' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();

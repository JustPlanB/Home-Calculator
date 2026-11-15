// ۱.۴.۴ (بخش دوم): رفع پرش‌ها (آمار، دُنگ، قرض، جدول صفحهٔ اصلی، شروع)، لمس بیرون پرسش، جای ۷ خطی پیامک،
// ترتیب ویجت تراکنش‌ها، فلش‌های آمار، امنیت مثل قبل، حریم خصوصی، انتخاب نشدن نوشته، جدول‌های پروژه،
// دکمهٔ آبی خروجی درآمد ثابت، فیلدهای «… جدید» هم‌شکل و هم‌فاصله، نوار سرستون ویجت و پیش‌نمایش‌ها. فقط دادهٔ مصنوعی.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');
const androidSource = require('../lib/android-src');
const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const allErrors = [];
(async () => {
  console.log('• کد بومی و پیش‌نمایش ویجت‌ها');
  const root = path.join(__dirname, '..', '..');
  const pa = androidSource();
  ok(/cv\.drawRect\(0, th, W, th\+hh, band\)/.test(pa) && /cv\.drawLine\(0, th\+hh, W, th\+hh, ln\)/.test(pa), 'نوار سرستون ویجت تراکنش‌ها از لبه تا لبهٔ ویجت');
  const patch = fs.readFileSync(path.join(root, 'scripts', 'patch-android.js'), 'utf8');
  ok(/hk_widget_line_info\.xml[\s\S]{0,700}previewImage="@drawable\/hk_prev_line"/.test(patch) && /'hk_prev_line\.png'/.test(patch), 'ویجت یک‌خطی پیش‌نمایش خودش را دارد');
  const size = f => { const b = fs.readFileSync(path.join(root, 'resources', 'widget-previews', f)); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
  const wide = ['hk_prev_main.png', 'hk_prev_accounts.png', 'hk_prev_tx.png'].map(size);
  ok(wide.every(s => s[0] / s[1] >= 2), 'پیش‌نمایش ویجت‌های ۴×۲ دست‌کم ۲ به ۱ (تا دو طرف جای خودش کشیده شود): ' + wide.join(' '));
  const ln = size('hk_prev_line.png');
  ok(ln[0] / ln[1] >= 4, 'پیش‌نمایش ویجت ۴×۱ دست‌کم ۴ به ۱ (' + ln + ')');

  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 384, height: 750 }, timezoneId: 'Asia/Tehran', hasTouch: true });
  await ctx.addInitScript(o => {
    if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); }
    window.__sh = [];
    try { new PerformanceObserver(l => l.getEntries().forEach(e => { if (e.value >= 0.001) window.__sh.push(e.value.toFixed(3) + ' ' + (e.sources || []).slice(0, 3).map(s => (s.node && (s.node.id || s.node.className)) + ' ' + Math.round(s.previousRect.y) + '>' + Math.round(s.currentRect.y)).join(' ; ')); })).observe({ type: 'layout-shift', buffered: true }); } catch (e) {}
  }, BASE_LS);
  const page = await ctx.newPage();
  page.on('pageerror', e => allErrors.push(e.message));
  await page.goto(INDEX); await page.waitForTimeout(2200);
  const shifts = async () => page.evaluate(() => { const x = window.__sh.slice(); window.__sh.length = 0; return x; });

  console.log('• شروع بی‌پرش');
  const boot = await page.evaluate(() => ({ ready: document.documentElement.classList.contains('hk-ready'), op: getComputedStyle(document.body).opacity }));
  const bootSh = await shifts();
  ok(boot.ready && boot.op === '1', 'بعد از نشستن چیدمان، صفحه نشان داده می‌شود (hk-ready)');
  ok(bootSh.length === 0, 'هنگام شروع چیزی جلوی چشم جابه‌جا نمی‌شود (' + bootSh.join(' / ') + ')');
  const css = fs.readFileSync(INDEX.replace('file://', ''), 'utf8');
  ok(/html:not\(\.hk-ready\) body\s*\{[^}]*opacity:\s*0[^}]*hkBootShow/.test(css), 'اگر علامت «آماده» نیاید، خود CSS صفحه را نشان می‌دهد');

  console.log('• دُنگ، قرض و جدول صفحهٔ اصلی بی‌پرش');
  await page.evaluate(() => {
    hkDongSave({ groups: [{ id: 'g1', name: 'سفر', members: [{ id: 'a', name: 'علی' }, { id: 'b', name: 'رضا' }], expenses: [{ id: 'e1', desc: 'شام', amount: 300000, payer: 'a', shares: { a: 150000, b: 150000 }, mode: 'eq', y: 1405, m: 8, d: 1, at: 1 }], settles: [] }] });
    const t = hkMainTitle(); const R = (tab, o) => Object.assign(emptyRow(tab), o);
    findSectionByTitle('expense', t).rows = Array.from({ length: 12 }, (x, i) => R('expense', { day: String(1 + i), desc: 'خرج ' + i, amount: 400000, status: i % 3 ? 'paid' : 'unpaid' }));
    findSectionByTitle('income', t).rows = [R('income', { day: '1', desc: 'حقوق', amount: 42000000, status: 'paid' })];
    const led = ensureLedger();
    led.sections = ['علی', 'رضا'].map((who, i) => ({ id: 'L' + i, personA: 'من', personB: who, collapsed: true, rows: [Object.assign(emptyLedgerRow(), { day: '2', desc: 'شام', amount: 250000, ly: currentYear, lm: currentMonth })] }));
    persistCurrent(); renderAll();
  });
  await page.waitForTimeout(700); await shifts();
  await page.evaluate(() => openDongModal()); await page.waitForTimeout(1200); await shifts();
  await page.evaluate(() => document.querySelector('#hkDong .hk-dg-card').click()); await page.waitForTimeout(900);
  const dg1 = await shifts();
  await page.evaluate(() => onBackGuard()); await page.waitForTimeout(900);
  const dg2 = await shifts();
  ok(dg1.length === 0, 'دُنگ: باز کردن گروه بی‌پرش (' + dg1.join(' / ') + ')');
  ok(dg2.length === 0, 'دُنگ: برگشت به فهرست گروه‌ها بی‌پرش (' + dg2.join(' / ') + ')');
  await page.evaluate(() => onBackGuard()); await page.waitForTimeout(900); await shifts();
  await page.evaluate(() => switchTabFromMenu('ledger')); await page.waitForTimeout(1300);
  const led = await shifts();
  ok(led.length === 0, 'قرض: باز شدن صفحه بی‌پرش (' + led.join(' / ') + ')');
  await page.evaluate(() => onBackGuard()); await page.waitForTimeout(900); await shifts();
  const pd = await page.evaluate(async () => {
    [...document.querySelectorAll('.person-stat-line.paid')].filter(x => x.getClientRects().length).pop().click();
    /* همان لحظه (پیش از اولین نقاشی) و کمی بعد: جای راهنمای زیر جدول یکی است */
    await new Promise(r => requestAnimationFrame(r));
    const q = () => { const e = [...document.querySelectorAll('.person-detail-hint')].find(x => x.getClientRects().length); return e ? Math.round(e.getBoundingClientRect().top) : -1; };
    const a = q(); await new Promise(r => setTimeout(r, 700)); const c = q();
    return { a, c };
  });
  ok(pd.a > 0 && pd.a === pd.c, 'جدول صفحهٔ اصلی از همان فریم اول اندازهٔ نهایی را دارد (' + pd.a + ' → ' + pd.c + ')');

  console.log('• نگه داشتن ردیف: منوی ویرایش/حذف، نه انتخاب متن');
  const lp = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const tr = [...document.querySelectorAll('.person-detail-table tbody tr')].find(x => x.getClientRects().length), r = tr.getBoundingClientRect();
    const o = {};
    /* گوشی «نگه داشتن» را زودتر از ۴۸۰ms تشخیص می‌دهد (contextmenu) ← همان لحظه منوی ردیف */
    tr.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: r.left + 80, clientY: r.top + 10, button: 0 }));
    await w(120);
    const ev = new MouseEvent('contextmenu', { bubbles: true, cancelable: true }); tr.dispatchEvent(ev);
    o.prevented = ev.defaultPrevented; o.menu = !!document.querySelector('.hk-row-act');
    tr.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    hkCloseRowActions(); await w(700);
    /* انتخاب نوشته بیرون از حالت ویرایش همان لحظه برداشته می‌شود */
    const cell = tr.querySelector('td'); const rg = document.createRange(); rg.selectNodeContents(cell);
    const s = getSelection(); s.removeAllRanges(); s.addRange(rg); await w(150);
    o.selCleared = getSelection().isCollapsed;
    const inp = tr.querySelector('textarea[readonly]');
    o.hadText = (inp.value || '').length > 2;
    inp.setSelectionRange(0, (inp.value || '').length); await w(200);
    o.inpCleared = inp.selectionStart === inp.selectionEnd;
    return o;
  });
  ok(lp.prevented && lp.menu, 'نگه داشتنِ تشخیص‌داده‌شده توسط گوشی همان منوی ویرایش/حذف را می‌آورد');
  ok(lp.selCleared && lp.hadText && lp.inpCleared, 'نوشتهٔ ردیف‌ها بیرون از حالت ویرایش انتخاب‌شده نمی‌ماند');
  await page.evaluate(() => onBackGuard()); await page.waitForTimeout(700);

  console.log('• آمار');
  const st = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    openStatsSheet(); await w(1300);
    const o = {};
    const bd = document.getElementById('statsBody');
    o.prev = bd.querySelector('[data-nav="-1"] path').getAttribute('d'); o.next = bd.querySelector('[data-nav="1"] path').getAttribute('d');
    o.ox = getComputedStyle(bd).overflowX;
    const res = [];
    for (const sc of [0, 300]) {
      bd.scrollTop = sc; await w(200);
      const cards = [...bd.children].filter(c => !c.classList.contains('st-filters')); const idx = cards.findIndex(c => c.getBoundingClientRect().top > 150);
      const before = Math.round(cards[idx].getBoundingClientRect().top);
      [...bd.querySelectorAll('.st-seg button')].find(x => !x.classList.contains('on')).click();
      const g = document.querySelector('.st-turn-ghost'); g.getAnimations().forEach(a => a.pause());
      res.push(before - Math.round([...g.firstElementChild.children][idx + 1].getBoundingClientRect().top));
      await w(800);
    }
    o.ghost = res;
    return o;
  });
  ok(st.prev === 'M9 5l7 7-7 7' && st.next === 'M15 5l-7 7 7 7', 'جهت فلش‌های دو طرف ماه/سال برعکس شد');
  ok(st.ghost.every(d => d === 0), 'ورق خوردن تب‌ها: محتوای قبلی دقیقاً سر جایش (اختلاف ' + st.ghost.join(' و ') + ' پیکسل)');
  ok(st.ox === 'hidden', 'آمار هنگام ورق خوردن افقی اسکرول‌پذیر نمی‌شود');
  await page.evaluate(() => onBackGuard()); await page.waitForTimeout(800);

  console.log('• لمس بیرون پرسش فقط آن را می‌بندد');
  const tap = await page.evaluate(() => {
    window.__under = 0;
    const u = document.createElement('button'); u.id = 'hkUnderBtn'; u.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:120px;z-index:9000;'; u.onclick = () => { window.__under++; };
    document.body.appendChild(u);
    hkAsk3('پیوست‌ها هم پشتیبان شوند؟', [{ v: 'yes', t: 'با پیوست‌ها', cls: 'primary eqw' }, { v: 'no', t: 'بدون پیوست‌ها', cls: 'eqw' }], v => { window.__ans = v; });
    return document.elementFromPoint(190, 60) === document.getElementById('hkAsk3');
  });
  await page.waitForTimeout(300);
  await page.touchscreen.tap(190, 60); await page.waitForTimeout(400);
  const tap2 = await page.evaluate(() => ({ gone: !document.getElementById('hkAsk3'), ans: window.__ans, under: window.__under }));
  ok(tap && tap2.gone && tap2.ans === 'cancel', 'لمس بیرون باکس پرسش آن را می‌بندد');
  ok(tap2.under === 0, 'همان لمس به دکمهٔ زیر باکس نمی‌رسد (' + tap2.under + ')');
  await page.waitForTimeout(800);
  await page.touchscreen.tap(190, 60); await page.waitForTimeout(300);
  const tap3 = await page.evaluate(() => { const n = window.__under; document.getElementById('hkUnderBtn').remove(); return n; });
  ok(tap3 === 1, 'لمس بعدی مثل همیشه کار می‌کند');

  console.log('• پیامک، امنیت، حریم خصوصی، خروجی درآمد ثابت');
  const M = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const o = {};
    openSmsImportModal(); await w(900);
    const ta = document.getElementById('smsImportText'), c = getComputedStyle(ta);
    o.sms = { h: ta.getBoundingClientRect().height, lh: parseFloat(c.lineHeight), pad: parseFloat(c.paddingTop) + parseFloat(c.paddingBottom) + 2 * parseFloat(c.borderTopWidth) };
    onBackGuard(); await w(700);
    openSecurityModal(); await w(900);
    const p = document.querySelector('#securityModal .sec-btn-primary');
    o.sec = { btn: !!p && p.getClientRects().length > 0 && /فعال کردن قفل برنامه/.test(p.textContent), noSw: !document.getElementById('secLockSw'), status: /خاموش/.test((document.getElementById('secStatusText') || {}).textContent || '') && !document.getElementById('secStatusText').hidden };
    onBackGuard(); await w(700);
    openHelpModal(); await w(900);
    const ht = document.getElementById('helpModal').textContent;
    o.help = { noFam: !/همگام‌سازی خانوادگی/.test(ht), priv: /حریم خصوصی و امنیت/.test(ht) && /به هیچ سروری ارسال نمی‌شود\./.test(ht) };
    document.getElementById('helpModal').classList.remove('open'); try { closeSideMenu(); } catch (e) {} await w(500);
    for (let i = 1; i <= 2; i++) recurringIncomes.push({ id: 'r' + i, name: 'اجاره ' + i, amount: 1000000 * i, deposit: 0, day: String(i), account: '', contractStart: { d: 1, m: 1, y: 1405 }, contractEnd: null, fromKey: 140501, genKey: 140500 });
    saveRecurring(); openRecurringFromMenu(); await w(1000);
    document.getElementById('recExportBtn').click(); await w(900);
    const go = document.querySelector('#hkRecArcEx .hk-rax-go');
    o.go = go ? getComputedStyle(go).backgroundColor : '';
    onBackGuard(); await w(500); onBackGuard(); await w(700);
    return o;
  });
  const want = 7 * M.sms.lh + M.sms.pad;
  ok(Math.abs(M.sms.h - want) < 1.5 && M.sms.h < 230, 'جای متن پیامک به اندازهٔ ۷ خط (' + M.sms.h.toFixed(1) + 'px)');
  ok(M.sec.btn && M.sec.noSw && M.sec.status, 'امنیت مثل قبل: نوشتهٔ وضعیت و دکمهٔ «فعال کردن قفل برنامه»، بی کلید روشن/خاموش');
  ok(M.help.noFam && M.help.priv, 'راهنما ← حریم خصوصی: بی توضیح همگام‌سازی خانوادگی');
  ok(M.go === 'rgb(8, 181, 245)', 'دکمهٔ «ساخت خروجی» درآمد ثابت آبی نرم‌افزار (' + M.go + ')');

  /* ۱.۴.۵: فیلدهای «… جدید» جایشان را به مربع آبی دادند (batch-1405) */
  await page.evaluate(() => { const l = loadFinancialSubjects(); l.push({ id: 's1', name: 'ساختمان', highlightColor: nextProjectHighlightColor(l) }); _financialSubjects = l; saveFinancialSubjects(); });
  console.log('• جدول‌های پروژه');
  const PJ = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const t = hkMainTitle();
    const mk = (tab, day, amt, desc) => Object.assign(emptyRow(tab), { day, desc, amount: amt, status: 'paid', financialContext: { subjectId: 's1', accountType: 'project', classification: 'third_party', fundingSource: 'subject' } });
    for (let i = 1; i <= 20; i++) { findSectionByTitle('expense', t).rows.push(mk('expense', String(i), 100000 * i, 'خرج پروژه ' + i)); findSectionByTitle('income', t).rows.push(mk('income', String(i), 300000 * i, 'واریز پروژه ' + i)); }
    persistCurrent(); renderAll();
    openProjectReportModal('s1'); await w(1000);
    const s = document.querySelector('#projectReportModal .proj-table-scroll'), tb = s.querySelector('table'), th = s.querySelector('thead th'), c = getComputedStyle(th);
    const tops = [];
    for (const v of [0, 7, 13, 21.5, 40]) { s.scrollTop = v; tops.push(th.getBoundingClientRect().top.toFixed(2)); }
    const o = { bc: getComputedStyle(tb).borderCollapse, pos: c.position, bg: c.backgroundColor, tops: [...new Set(tops)].length, scr: s.scrollHeight > s.clientHeight + 50 };
    onBackGuard(); await w(700);
    return o;
  });
  ok(PJ.bc === 'separate' && PJ.pos === 'sticky' && /^rgb\(/.test(PJ.bg), 'ردیف عنوان جدول پروژه چسبان، پُر و با خط‌کشی خودش (بی‌درز)');
  ok(PJ.scr && PJ.tops === 1, 'ردیف عنوان موقع اسکرول سر جایش می‌ماند (حتی نیم‌پیکسل تکان نمی‌خورد)');

  console.log('• ویجت تراکنش‌ها: ترتیب نرم‌افزار');
  const W = await page.evaluate(() => {
    const t = getTodayPersian(), title = hkMainTitle();
    const R = (d, desc) => Object.assign(emptyRow('expense'), { day: String(d), desc, amount: 1000 * d, status: 'paid' });
    findSectionByTitle('expense', title).rows = [R(5, 'وسط'), R(1, 'اول ماه'), R(9, 'آخر ماه')];
    let pm = t.m - 1, py = t.y; if (pm < 1) { pm = 12; py--; }
    const k = periodKey(py, pm);
    archive[k] = JSON.parse(JSON.stringify(periodData));
    archive[k].expense.sections.forEach(s => { s.rows = s.title === title ? [R(20, 'ماه قبل')] : []; });
    persistCurrent();
    hkPrefSet('sort', 'old'); const o = hkWidgetTxRows('expense').map(x => x.t);
    hkPrefSet('sort', 'new'); const n = hkWidgetTxRows('expense').map(x => x.t);
    return { o, n };
  });
  ok(W.o.join('|') === 'اول ماه|وسط|آخر ماه', '«قدیمی بالا»: فقط همین ماه، اولین تراکنش بالا و آخرین پایین (' + W.o.join('، ') + ')');
  ok(W.n.join('|') === 'آخر ماه|وسط|اول ماه|ماه قبل', '«جدید بالا»: تازه‌ترین بالا و بعد ماه‌های قبل (' + W.n.join('، ') + ')');

  await b.close();
  const errs = allErrors.filter(e => !/ResizeObserver/.test(e));
  ok(errs.length === 0, 'بدون خطای JS (' + errs.slice(0, 3).join(' | ') + ')');
  console.log('\n' + passed + ' موفق، ' + failed + ' ناموفق');
  process.exit(failed ? 1 : 0);
})();

// ۱.۳.۹۵: بی‌پرش (ثبت پیامک از اول با اندازهٔ «صفحه‌کلید باز»)، «دسته‌ها» در شخصی‌سازی (واریزی/برداشت، دستهٔ جدید آخر، حذف با لانگ‌پرس)،
// جستجوی داخل منوها با هایلایت خاکستری، جدول قرض تمام‌قاب در صفحه، دُنگ (آیکون‌ها بالا-چپ، خرج‌ها خاکستری‌تر، +/− نگه‌داشتنی، خانهٔ مربعی)،
// شروع «از اول همین ماه» پیش‌فرض، تیک یکسان، کلید روشن/خاموش با لانگ‌پرس روی اسلاید ثابت. فقط دادهٔ مصنوعی.
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');
const androidSource = require('../lib/android-src');
const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const allErrors = [];
async function fresh(b) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Tehran', hasTouch: true });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, BASE_LS);
  const page = await ctx.newPage();
  page.on('pageerror', e => allErrors.push(e.message));
  await page.clock.setFixedTime(new Date('2026-11-03T09:10:00Z'));
  await page.goto(INDEX); await page.waitForTimeout(2200);
  return { ctx, page };
}
(async () => {
  console.log('• تیک ویجت (کد بومی)');
  const pa = androidSource();
  ok(!/"✓  "\+label/.test(pa) && /tickLabel\(label, color\)/.test(pa) && /ph\.moveTo\(5\*k, 12\.5f\*k\); ph\.lineTo\(9\.5f\*k, 17\*k\); ph\.lineTo\(19\*k, 7\.5f\*k\)/.test(pa), 'انتخاب نوع ویجت: تیکِ کشیده‌شده با همان شکل تیک نرم‌افزار، نه حرف ✓');
  ok(!/[✓✔]/.test(pa.replace(/\/\*[\s\S]*?\*\//g, '')), 'هیچ حرف ✓/✔ در کد بومی');

  const b = await chromium.launch();
  const A = await fresh(b);
  console.log('• ثبت تکی و گروهی: از اول با اندازهٔ صفحه‌کلید باز');
  const s0 = await A.page.evaluate(async () => {
    openSmsImportModal(); await new Promise(r => setTimeout(r, 250));
    const m = document.getElementById('smsImportModal'), box = m.querySelector('.modal-box');
    return { top: Math.round(box.getBoundingClientRect().top), bottom: Math.round(box.getBoundingClientRect().bottom), free: Math.round(hkKbFreeBottom()), ta: Math.round(document.getElementById('smsImportText').getBoundingClientRect().height), ovf: getComputedStyle(m).overflowY };
  });
  await A.page.setViewportSize({ width: 390, height: Math.round(844 * 0.58) }); await A.page.waitForTimeout(800);
  const s1 = await A.page.evaluate(() => { const m = document.getElementById('smsImportModal'), box = m.querySelector('.modal-box'); return { top: Math.round(box.getBoundingClientRect().top), bottom: Math.round(box.getBoundingClientRect().bottom), ta: Math.round(document.getElementById('smsImportText').getBoundingClientRect().height), st: m.scrollTop }; });
  ok(s0.bottom <= s0.free - 6 && s0.ovf === 'hidden', 'همان لحظهٔ باز شدن، باکس بالای جای صفحه‌کلید چیده شده (' + s0.bottom + ' ≤ ' + s0.free + ')');
  ok(s0.top === s1.top && s0.bottom === s1.bottom && s0.ta === s1.ta && s1.st === 0, 'با آمدن صفحه‌کلید هیچ چیز جابه‌جا یا کوچک/بزرگ نمی‌شود (' + s0.top + '/' + s0.bottom + ' → ' + s1.top + '/' + s1.bottom + ')');
  await A.page.evaluate(() => closeSmsImportModal());
  await A.page.setViewportSize({ width: 390, height: 844 }); await A.page.waitForTimeout(400);

  console.log('• شخصی‌سازی ← «دسته‌ها»');
  const C = await A.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const o = {};
    openPrefsModal(); await w(300);
    const row = document.querySelector('#hkPrefsModal .hk-pf-row[data-k="newcat"]');
    o.rowLabel = row.querySelector('.hk-pf-l').textContent;
    row.click(); await w(350);
    const sh = document.getElementById('hkCatsSheet');
    const tabs = [...sh.querySelectorAll('.hk-cats-tabs .hk-re-segb')];
    o.tabs = tabs.map(t => t.textContent).join('|');
    o.inRight = tabs[0].getBoundingClientRect().left > tabs[1].getBoundingClientRect().left && tabs[0].classList.contains('on');
    const ids = () => [...sh.querySelectorAll('.sp-pick-grid [data-id]')].map(x => x.dataset.id);
    o.inIds = ids(); o.lastAdd = sh.querySelector('.sp-pick-grid').lastElementChild.classList.contains('sp-pick-tadd');
    const h0 = Math.round(sh.querySelector('.hk-cats-box').getBoundingClientRect().height);
    /* «دستهٔ جدید» ← فیلد؛ عوض کردن تب فوکوس را نگه می‌دارد */
    sh.querySelector('.sp-pick-tadd').click(); await w(150);
    const inp = sh.querySelector('.hk-cats-new input');
    o.focused = document.activeElement === inp;
    const md = new MouseEvent('mousedown', { bubbles: true, cancelable: true }); tabs[1].dispatchEvent(md);
    o.keepFocus = md.defaultPrevented;
    tabs[1].click(); await w(400);
    o.outIds = ids();
    o.sameH = Math.round(sh.querySelector('.hk-cats-box').getBoundingClientRect().height) === h0;
    /* ساختن دستهٔ برداشت */
    inp.value = 'باغبانی'; inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await w(300);
    const st = document.getElementById('hkCatStyle'); st.querySelector('.hk-cst-ok').click(); await w(300);
    o.made = HKCategorizer.categories.some(c => c.label === 'باغبانی') && ids().indexOf(HKCategorizer.categories.find(c => c.label === 'باغبانی').id) >= 0;
    /* حذف با لانگ‌پرس: واریزی پیش‌فرض (پنهان) */
    tabs[0].click(); await w(400);
    const t = sh.querySelector('.sp-pick-grid [data-id="in_rent"]');
    t.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); await w(650);
    o.jiggle = sh.querySelector('.sp-pick-grid').classList.contains('hk-jiggle');
    t.querySelector('.sp-pick-x').click(); await w(150);
    document.getElementById('confirmYes').click(); await w(200);
    o.inRemoved = !HK_INCOME_CATS.some(c => c.id === 'in_rent') && JSON.parse(localStorage.getItem(STORAGE_KEY + '_inHidden') || '[]').indexOf('in_rent') >= 0;
    o.inBackup = (HKCategorizer.exportData().inHidden || []).indexOf('in_rent') >= 0;
    sh.remove(); document.getElementById('hkPrefsModal') && document.getElementById('hkPrefsModal').remove();
    return o;
  });
  ok(C.rowLabel === 'دسته‌ها', 'نام گزینه «دسته‌ها»');
  ok(C.tabs === 'واریزی|برداشت' && C.inRight, 'دو تب واریزی (راست، پیش‌فرض) و برداشت؛ همان نام‌های «اولویت دسته‌ها»');
  ok(C.inIds.indexOf('in_salary') >= 0 && C.outIds.indexOf('food') >= 0 && C.lastAdd, 'همهٔ دسته‌های هر نوع؛ کاشی آخر «دستهٔ جدید»');
  ok(C.focused && C.keepFocus && C.sameH, 'عوض کردن تب صفحه‌کلید را نمی‌بندد و اندازهٔ باکس ثابت می‌ماند');
  ok(C.made, 'دستهٔ تازهٔ برداشت ساخته شد و در همان تب آمد');
  ok(C.jiggle && C.inRemoved && C.inBackup, 'لانگ‌پرس ← لرزش و ×؛ دستهٔ واریزی هم حذف می‌شود (و در پشتیبان می‌ماند)');

  console.log('• جستجوی منوی همبرگری در زیرمنوها');
  const S = await A.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const o = {};
    hkMenuSearch('مبالغ'); await w(100);
    const r = [...document.querySelectorAll('#menuSearchRes .hk-sr-sub')];
    o.found = r.map(x => x.querySelector('span:not(.hk-sr-path)').textContent + '@' + x.querySelector('.hk-sr-path').textContent).join('|');
    r[0].click(); await w(1400);
    const el = document.querySelector('#hkPrefsModal .hk-pf-row[data-k="privacy"]');
    o.flash = !!el && el.classList.contains('hk-sub-flash');
    o.bg = el ? getComputedStyle(el).animationName : '';
    document.getElementById('hkPrefsModal').remove();
    hkMenuSearch('خودکار روزانه'); await w(100);
    o.backup = !!document.querySelector('#menuSearchRes .hk-sr-sub');
    hkMenuSearchClear();
    return o;
  });
  ok(/مخفی کردن مبالغ@شخصی‌سازی/.test(S.found), 'گزینهٔ داخل منو پیدا می‌شود با مسیر («' + S.found + '»)');
  ok(S.flash && S.bg === 'hkSubFlash' && S.backup, 'زدن نتیجه: همان منو باز و گزینه هایلایت خاکستری می‌شود');

  console.log('• قرض و دُنگ');
  const L = await A.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const o = {};
    const led = ensureLedger(); const rows = []; for (let i = 0; i < 14; i++) rows.push(Object.assign(emptyLedgerRow(), { day: String(1 + i), desc: 'ردیف ' + i, amount: 10000 * (i + 1), ly: currentYear, lm: currentMonth }));
    led.sections = [{ id: 'S1', personA: 'من', personB: 'علی', collapsed: false, rows }];
    persistCurrent(); touchLocal(); await saveArchive();
    openFeatureSheet('ledger'); await w(700);
    document.querySelector('#sections-ledger .section > .section-header').click(); await w(900);
    const card = document.querySelector('#sections-ledger .section[data-sec-id="S1"]'), r = card.getBoundingClientRect(), body = card.querySelector('.section-body'), tb = body.getBoundingClientRect();
    o.inView = r.top >= 0 && r.bottom <= innerHeight + 1 && tb.bottom <= innerHeight;
    o.scroll = body.scrollHeight > body.clientHeight;
    /* دُنگ */
    hkDongSave({ groups: [{ id: 'g1', name: 'سفر', members: [{ id: 'a', name: 'سپهر' }, { id: 'b', name: 'سارا' }], expenses: [{ id: 'e1', desc: 'شام', amount: 200000, payer: 'a', shares: { a: 100000, b: 100000 } }], settles: [] }] });
    openDongModal(); await w(300);
    const c = document.querySelector('#hkDong .hk-dg-card'), ca = c.querySelector('.hk-dg-cacts'), cr = c.getBoundingClientRect(), ar = ca.getBoundingClientRect();
    o.corner = ar.top - cr.top <= 10 && ar.left - cr.left <= 10 && ar.top - cr.top >= 2;
    c.click(); await w(300);
    const e = document.querySelector('#hkDong .hk-dg-exp .hk-dg-e');
    o.expBg = getComputedStyle(e).backgroundColor;
    document.querySelector('#hkDong .hk-dg-add').click(); await w(300);
    const ed = document.getElementById('hkDongEd');
    const am = ed.querySelector('.hk-dg-amt'); am.value = '1000000'; am.dispatchEvent(new Event('input', { bubbles: true }));
    ed.querySelector('.hk-dg-seg [data-v="uneq"]').click(); await w(500);
    const row = ed.querySelector('tr.hk-dg-shr'), pl = row.querySelector('.hk-dg-wplus'), wn = row.querySelector('.hk-dg-wn');
    const wr = wn.getBoundingClientRect(); o.square = Math.abs(wr.width - wr.height) <= 1;
    pl.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 })); await w(1250);
    pl.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); await w(400);
    o.held = parseInt(toEnglishDigits(wn.value), 10);
    const n1 = o.held; await w(500); o.stopped = parseInt(toEnglishDigits(wn.value), 10) === n1;
    pl.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 })); pl.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); pl.click(); await w(100);
    o.tapOne = parseInt(toEnglishDigits(wn.value), 10) === n1 + 1;
    o.noBlue = getComputedStyle(pl).webkitTapHighlightColor === 'rgba(0, 0, 0, 0)';
    ed.remove(); document.getElementById('hkDong').remove();
    return o;
  });
  ok(L.inView && L.scroll, 'جدول رابطهٔ قرض: کل قاب در صفحه دیده می‌شود؛ ردیف‌های اضافه داخل جدول اسکرول');
  ok(L.corner, 'مداد و × گروه دُنگ در گوشهٔ بالا-چپ کارت (کمی فاصله از لبه)');
  ok(/rgba\(255, 255, 255, 0\.07/.test(L.expBg), 'باکس خرج‌ها خاکستری‌تر و روشن‌تر (' + L.expBg + ')');
  ok(L.square, 'خانهٔ تعداد نفر بین «+» و «−» مربعی');
  ok(L.held >= 4 && L.held <= 8 && L.stopped && L.tapOne, 'نگه‌داشتن «+» با سرعت آرام زیاد می‌کند (' + L.held + ')؛ رها کردن = توقف؛ یک ضربه = یکی');
  ok(L.noBlue, 'پشت «+/−» آبی نمی‌شود');

  console.log('• تیک‌ها و اسلاید ثابت');
  const T = await A.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const o = {};
    o.tickSvg = /M5 12\.5l4\.5 4\.5L19 7\.5/.test(HK_TICK_SVG);
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = true; document.body.appendChild(cb);
    const cs = getComputedStyle(cb); o.cb = cs.appearance === 'none' && /M5 12\.5l4\.5 4\.5L19 7\.5/.test(decodeURIComponent(cs.backgroundImage)); cb.remove();
    /* لانگ‌پرس روی اسلاید ثابت → کلید روشن/خاموش؛ زدنش = خاموش */
    const el = document.querySelector('#homeSmartBox .pc-smart-box');
    const k = el._spPages[el._spIdx].key; o.key = k;
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 100, clientY: 400, pointerId: 1 })); await w(600);
    const sw = el.querySelector('.sp-tog-ov .hk-switch.on'); o.sw = !!sw;
    if (sw) {
      const r = el.querySelector('.sp-tog-card').getBoundingClientRect(), sh = document.querySelector('.sp-trash-shield');
      sh.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: r.left + 10, clientY: r.top + 10 }));
      sh.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: r.left + 10, clientY: r.top + 10 })); await w(800);
      o.off = (hkPrefs().spOff || []).indexOf(k) >= 0;
      const o2 = hkPrefs().spOff.filter(x => x !== k); hkPrefSet('spOff', o2);
    }
    return o;
  });
  ok(T.tickSvg && T.cb, 'تیک یکسان: HK_TICK_SVG و چک‌باکس‌ها با همان مسیر تیک');
  ok(T.sw && T.off, 'لانگ‌پرس روی اسلاید ثابت («' + T.key + '»): کلید بیضی روشن/خاموش؛ زدنش اسلاید را خاموش می‌کند');
  await A.ctx.close();

  console.log('• راه‌اندازی بار اول');
  const setupSrc = require('fs').readFileSync(require('path').join(__dirname, '..', '..', 'src', 'js', '12a-setup.js'), 'utf8');
  ok(/data-m="month">از اول همین ماه<\/button><button type="button" class="hk-re-segb" data-m="today">از امروز/.test(setupSrc) && /setMode\(canRead && found\.length \? 'month' : 'today'\)/.test(setupSrc), '«از اول همین ماه» سمت راست و پیش‌فرض؛ «از امروز» سمت چپ');

  ok(!allErrors.length, 'هیچ خطای JS در صفحه' + (allErrors.length ? ' — ' + allErrors.join(' | ') : ''));
  await b.close();
  console.log('\nbatch-1395: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

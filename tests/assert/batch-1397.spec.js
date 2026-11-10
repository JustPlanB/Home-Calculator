// ۱.۳.۹۷: فهرست روشن/خاموش اسلایدها وسط صفحه (۵ ردیف، عرض به اندازهٔ نوشته، تیرگی مثل منوی «+»)، بی «کارهای من»،
// لانگ‌پرس روی اسلاید «+» بی‌کار، بازگشت از زیرمنوی همبرگری به منوی اصلی، کشیدن افقی بین تب‌ها، جیب به جیب از باکس ثبت،
// ثبت سریع «اول دسته، بعد شرح»، بانک بزرگ‌تر کلمه‌های دسته. فقط دادهٔ مصنوعی.
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');
const androidSource = require('../lib/android-src');
const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1', [P + '_p2pIntro']: '1' };
let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const allErrors = [];
(async () => {
  console.log('• کد بومی: اول دسته، بعد شرح');
  const pa = androidSource();
  ok(/static void postDescAfterCat\(Context c,int nid,String label\)/.test(pa) && /"افزودن شرح"/.test(pa) && /putExtra\("afterCat",true\)/.test(pa), 'زدن دسته (بی شرح): اعلان «… ثبت شد» با «افزودن شرح»');
  ok(/if\(ok && catFirst\)\{ BankSmsReceiver\.postDescAfterCat\(c,cn,lab\); return; \}/.test(pa) && /x\.put\("quickWait",System\.currentTimeMillis\(\)\)/.test(pa), 'دسته اول: تا ۳۰ ثانیه منتظر شرح می‌ماند');
  ok(/if\(in\.getBooleanExtra\("afterCat",false\)\)/.test(pa) && /x\.remove\("quickWait"\)/.test(pa) && /startsWith\(BankSmsReceiver\.ACTION_QUICK\)/.test(pa), 'شرحِ بعد از دسته: دسته می‌ماند و انتظار تمام می‌شود');
  ok(/r\.put\("quickWait",x\.optLong\("quickWait",0\)\)/.test(pa), 'افزونه، انتظار را به نرم‌افزار می‌دهد');
  ok(/setLabel\("بابت چی بود؟ بنویس و فلش را بزن"\)/.test(pa), 'راهنمای فلش در جای شرح');

  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Tehran', hasTouch: true });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, BASE_LS);
  const page = await ctx.newPage();
  page.on('pageerror', e => allErrors.push(e.message));
  await page.clock.setFixedTime(new Date('2026-11-03T09:10:00Z'));
  await page.goto(INDEX); await page.waitForTimeout(2200);

  console.log('• فهرست روشن/خاموش اسلایدها');
  const A = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const el = [...document.querySelectorAll('*')].find(x => x._spBound);
    spShowSlideToggle(el, { key: 'overview' }); await w(350);
    const ov = document.querySelector('.sp-tog-ov2'), pn = ov.querySelector('.sp-tog-panel'), list = pn.querySelector('.sp-tog-list');
    const rows = [...list.querySelectorAll('.sp-tog-row')], r = pn.getBoundingClientRect(), cs = getComputedStyle(ov);
    const addCs = (() => { const d = document.createElement('div'); d.className = 'hk-add-ov'; document.body.appendChild(d); const c = getComputedStyle(d); const o = { bg: c.backgroundColor, bf: c.backdropFilter }; d.remove(); return o; })();
    const out = {
      center: Math.abs(r.left + r.width / 2 - innerWidth / 2) < 2 && Math.abs(r.top + r.height / 2 - innerHeight / 2) < 2,
      dim: cs.backgroundColor === addCs.bg && cs.backdropFilter === addCs.bf,
      five: Math.abs(list.clientHeight - rows[0].offsetHeight * 5) <= 12 && list.scrollHeight > list.clientHeight,
      fit: r.width < innerWidth - 60 && rows.every(x => x.scrollWidth <= x.clientWidth + 1),
      noTodo: !rows.some(x => x.dataset.k === 'todo'), cur: rows[0].classList.contains('cur')
    };
    ov._hkCancel(); await w(250);
    /* شخصی‌سازی ← اسلایدها: «کارهای من» نیست؛ خاموش قبلی «کارهای من» دیگر اثری ندارد */
    hkPrefSet('spOff', ['todo']);
    openPrefsModal(); await w(200);
    const sr = document.querySelector('#hkPrefsModal .hk-pf-row[data-k="slides"]'); const cnt = sr && sr.textContent; sr.click(); await w(250);
    out.prefsNoTodo = !document.querySelector('#hkPrefsModal .hk-pf-slides .hk-pf-row[data-k="todo"]') && document.querySelectorAll('#hkPrefsModal .hk-pf-slides .hk-pf-row').length === Object.keys(HK_SP_LABELS).length - 1;
    out.count = /۱۴ از ۱۴/.test(cnt || '');
    document.getElementById('hkPrefsModal').remove();
    hkPrefSet('spOff', []);
    return out;
  });
  ok(A.center && A.cur, 'وسط صفحه، اسلاید فعلی خاکستری');
  ok(A.dim, 'تیرگی و ماتی پشت همان منوی «+» (افزودن مخارج/درآمد)');
  ok(A.five, 'پنج ردیف دیده می‌شود، بقیه با اسکرول');
  ok(A.fit, 'عرض به اندازهٔ نوشته‌ها و کلیدها');
  ok(A.noTodo && A.prefsNoTodo && A.count, '«کارهای من» نه در لانگ‌پرس و نه در شخصی‌سازی');
  const src = await page.evaluate(() => String(bindSmartPanelGestures));
  ok(/_pg0\.key\s*!==\s*['"]todoAdd['"]/.test(src), 'لانگ‌پرس روی اسلاید «+» کاری نمی‌کند');

  console.log('• بازگشت در منوی همبرگری');
  const B = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const mOpen = () => document.getElementById('menuDropdown').classList.contains('open');
    openSideMenu(); await w(300);
    const item = [...document.querySelectorAll('#menuDropdown [onclick]')].find(x => /openPrefsModal/.test(x.getAttribute('onclick')));
    item.click(); await w(1200);
    const o = { opened: !!document.getElementById('hkPrefsModal') && !mOpen() };
    document.querySelector('#hkPrefsModal .hk-pf-row[data-k="slides"]').click(); await w(300);
    onBackGuard(); await w(500); o.page2 = !!document.getElementById('hkPrefsModal') && !mOpen();
    onBackGuard(); await w(600); o.toMenu = !document.getElementById('hkPrefsModal') && mOpen();
    onBackGuard(); await w(500); o.closed = !mOpen();
    /* بسته شدن با دکمهٔ بستن ← بازگشت بعدی منو را باز نمی‌کند */
    openSideMenu(); await w(300); item.click(); await w(1200);
    document.querySelector('#hkPrefsModal .hk-pf-x, #hkPrefsModal .hk-pf-close') ? document.querySelector('#hkPrefsModal .hk-pf-x, #hkPrefsModal .hk-pf-close').click() : document.getElementById('hkPrefsModal')._hkCancel();
    await w(300);
    const ab = window.hkAppToBackground; let bg = 0; window.hkAppToBackground = function () { bg++; }; try { hkAppToBackground = window.hkAppToBackground; } catch (e) {}
    onBackGuard(); await w(500); o.noReopen = !mOpen();
    try { hkAppToBackground = ab; } catch (e) {} window.hkAppToBackground = ab;
    return o;
  });
  ok(B.opened && B.page2, 'شخصی‌سازی از منو؛ بازگشت اول فقط صفحهٔ دوم را می‌بندد');
  ok(B.toMenu, 'بازگشت از شخصی‌سازی ← منوی اصلی همبرگری');
  ok(B.closed, 'بازگشت از منوی اصلی ← بسته شدن منو');
  ok(B.noReopen, 'اگر پنجره با دکمهٔ خودش بسته شده باشد، بازگشت منو را دوباره باز نمی‌کند');

  console.log('• کشیدن افقی بین تب‌ها');
  const C = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    hkCatsSheet(); await w(400);
    const box = document.querySelector('#hkCatsSheet .hk-cats-box'), on = () => box.querySelector('.hk-cats-tabs button.on').dataset.k;
    const sw = (dx, dy) => {
      const r = box.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height * 0.6;
      const t = document.elementFromPoint(x, y);
      const mk = (cx, cy) => new Touch({ identifier: 1, target: t, clientX: cx, clientY: cy });
      t.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [mk(x, y)], changedTouches: [mk(x, y)] }));
      t.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [], changedTouches: [mk(x + dx, y + dy)] }));
    };
    const k0 = on();
    sw(120, 6); await w(500); const k1 = on();
    sw(-120, 4); await w(500); const k2 = on();
    sw(30, 0); await w(300); const k3 = on();
    sw(80, 120); await w(300); const k4 = on();
    document.getElementById('hkCatsSheet')._hkCancel(); await w(200);
    return { k0, k1, k2, k3, k4 };
  });
  ok(C.k0 === 'in' && C.k1 === 'out', 'دسته‌ها: کشیدن به راست ← تب بعدی (برداشت)');
  ok(C.k2 === 'in', 'کشیدن به چپ ← برگشت به واریزی');
  ok(C.k3 === 'in' && C.k4 === 'in', 'حرکت کوتاه یا عمودی تب را عوض نمی‌کند');

  console.log('• جیب به جیب از باکس ثبت');
  const D = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    selectedBankAccounts.push({ id: 'a1', bank: 'بانک ملت', label: 'ملت', openingBalance: 0, createdAt: { y: 1400, m: 1 } });
    selectedBankAccounts.push({ id: 'a2', bank: 'بانک ملی', label: 'ملی', openingBalance: 0, createdAt: { y: 1400, m: 1 } });
    normalizeSelectedBanks(); saveBankAccountsSelection();
    const out = [];
    for (const [type, raw] of [['expense', 'بانك ملت\nبرداشت:250,000-\nحساب:1111\n0812-10:00'], ['income', 'بانك ملي\nواريز:250,000+\nحساب:2222\n0812-10:01']]) {
      const pe = { raw, amount: 250000, type, day: '12', month: currentMonth, year: currentYear };
      pendingSmsEntry = pe; openSmsConfirmModal(pe); await w(300);
      let t = document.querySelector('#smsCatGrid .sms-cat[data-cat="p2p"]');
      if (!t) { document.querySelector('#smsCatGrid .sms-cat-more').click(); await w(200); t = document.querySelector('.sms-cat-more-ov .sms-cat[data-cat="p2p"]'); }
      t.click(); document.querySelectorAll('#hkP2PIntro').forEach(x => x.remove());
      confirmSmsEntry(); await w(700);
      document.querySelectorAll('#hkP2PAsk').forEach(x => x.remove());
      const rows = []; periodData[type].sections.forEach(s => s.rows.forEach(x => { if (x && Number(x.amount) === 250000) rows.push(x); }));
      out.push({ n: rows.length, p2p: rows.length === 1 && !!rows[0].p2p, ts: rows.length === 1 && rows[0].createdAt > 0 });
    }
    hkP2PIntro(true); await w(100);
    const txt = document.querySelector('#hkP2PIntro').textContent; document.getElementById('hkP2PIntro').remove();
    return { out, fam: /خانواده/.test(txt), paren: /\(|\)/.test(txt) };
  });
  ok(D.out.every(x => x.p2p), 'برداشت و واریز با دستهٔ «جیب به جیب» واقعاً جیب به جیب ثبت شدند (نه نامشخص)');
  ok(D.out.every(x => x.ts), 'ردیف تازهٔ پیامک از همان لحظه زمان ساخت دارد (جفت‌یابی خودکار)');
  ok(!D.fam && !D.paren, 'توضیح جیب به جیب بی «(یا خانواده)»');

  console.log('• ثبت سریع: انتظار برای شرح بعد از دسته');
  const E = require('fs').readFileSync(require('path').join(__dirname, '..', '..', 'src', 'js', '10c-get-app-lock-plugin.js'), 'utf8');
  ok(/it\.quickCat && it\.quickWait && !it\.quickOpen && Date\.now\(\) - it\.quickWait < 30000/.test(E), 'نرم‌افزار تا ۳۰ ثانیه منتظر شرحِ بعد از دسته می‌ماند');

  console.log('• بانک کلمه‌های دسته');
  const F = await page.evaluate(() => {
    const n = HKCategorizer.categories.reduce((a, c) => a + (c.nkw || []).length, 0);
    const T = { 'نونوایی': 'food', 'سوپری سر کوچه': 'food', 'کله پاچه': 'food', 'قسط اسنپ پی': 'debt', 'پنچرگیری': 'transport', 'تعویض روغن موتور': 'transport', 'شارژ ایرانسل': 'bills', 'شارژر گوشی': 'tech', 'کتونی': 'clothing', 'ژلیش': 'health', 'عصب کشی دندان': 'health', 'قالیشویی': 'home', 'پول پیش': 'home', 'مهدکودک': 'education', 'اتاق فرار': 'fun', 'غذای گربه': 'fun', 'ختم': 'gift', 'اشتراک chatgpt': 'tech', 'سازمان تامین اجتماعی': 'bills', 'مترو': 'transport', 'پیتزاها': 'food' };
    const bad = Object.keys(T).filter(t => { const c = HKCategorizer.classify(t); return !c || c.id !== T[t]; });
    const seen = {}; let dup = 0; HKCategorizer.categories.forEach(c => (c.nkw || []).forEach(k => { if (seen[k] && seen[k] !== c.id && k !== 'موبایل') dup++; seen[k] = seen[k] || c.id; }));
    return { n, bad, dup };
  });
  ok(F.n >= 2000, 'بیش از ۲۰۰۰ کلمه (' + F.n + ')');
  ok(!F.bad.length, 'شرح‌های نمونه درست دسته‌بندی شدند' + (F.bad.length ? ' — ' + F.bad.join('، ') : ''));
  ok(!F.dup, 'هیچ کلمه‌ای در دو دسته نیست');

  ok(!allErrors.length, 'هیچ خطای JS در صفحه' + (allErrors.length ? ' — ' + allErrors.join(' | ') : ''));
  await b.close();
  console.log('\nbatch-1397: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

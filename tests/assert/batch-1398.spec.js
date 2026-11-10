// ۱.۳.۹۸: منوی همبرگری مثل تنظیمات اندروید (صفحه‌های کشویی روی منو، بازگشت به همان منو بی دیده شدن صفحهٔ اصلی)،
// راه‌اندازی بار اول ← ثبت گروهی با بازه، دکمهٔ «ثبت»، ثبت سریع بی دکمهٔ دسته (رنگ‌های نرم‌افزار، راهنمای قبلی)،
// بانک کلمهٔ دو برابر، ویجت تراکنش‌ها با نوار بالای درشت‌تر، پیش‌نمایش/توضیح/اسم سه ویجت. فقط دادهٔ مصنوعی.
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
  const root = path.join(__dirname, '..', '..');
  console.log('• کد بومی: اعلان و ویجت');
  const pa = androidSource();
  const post = pa.slice(pa.indexOf('static void postNotification('), pa.indexOf('static void postNotification(') + 6000);
  ok(!/addCatButtons\(/.test(post), 'اعلان پیامک دیگر دکمهٔ دسته ندارد (فقط «ثبت سریع» و «باکس»)');
  ok(/setLabel\("بابت چی بود؟ \(شرح\)"\)/.test(post), 'راهنمای جای شرح مثل قبل: «بابت چی بود؟ (شرح)»');
  ok(/int col=sg>0\?0xFF9EE858:0xFFFF6B4A;/.test(post), 'رنگ اعلان و دکمهٔ ثبت سریع: واریز سبز و برداشت نارنجی نرم‌افزار');
  ok(!/BankSmsReceiver\.postCatAfterDesc\(c,nid,desc\); return;/.test(pa), 'بعد از نوشتن شرح دیگر اعلان دسته نمی‌آید (همان «ثبت شد»)');
  ok(/int etC=qsg>0\?0xFF9EE858:\(qsg<0\?0xFFFF6B4A:0xFF08B5F5\);/.test(pa) && /etBg\.setStroke\(Math\.max\(2,dp\(1\.5f\)\),etC\)/.test(pa), 'باکس شناور: فیلد «بابت چی بود؟» به رنگ نوع تراکنش');
  const hd = pa.slice(pa.indexOf('static Bitmap header(Context ctx, int W, float k, boolean inc, boolean all, boolean light)'));
  ok(/float th=48\*k/.test(hd) && /paint\(BOLD, 17f\*k, all \? ALL_C/.test(hd) && /paint\(BOLD, 17f\*k, text\(light\), Paint\.Align\.RIGHT\)/.test(hd) && /paint\(REG, 14\.5f\*k, muted\(light\)/.test(hd), 'ویجت تراکنش‌ها: نوار بالا بلندتر؛ اسم نرم‌افزار، نوع تراکنش و تاریخ درشت‌تر (هم‌اندازهٔ ویجت حساب‌ها)');
  const patch = fs.readFileSync(path.join(root, 'scripts', 'patch-android.js'), 'utf8');
  ok(/android:label="موجودی و خرج امروز"/.test(patch) && /android:label="حساب‌ها"/.test(patch) && /android:label="تراکنش‌ها"/.test(patch), 'سه ویجت با اسم روشن در فهرست ویجت‌ها');
  ok(/previewImage="@drawable\/hk_prev_main"/.test(patch) && /previewImage="@drawable\/hk_prev_accounts"/.test(patch) && /previewImage="@drawable\/hk_prev_tx"/.test(patch), 'هر ویجت عکس پیش‌نمایش خودش را دارد');
  ok(/description="@string\/hk_wdesc_main"/.test(patch) && /hk_wdesc_tx">آخرین واریزها و برداشت‌ها</.test(patch), 'هر ویجت یک خط توضیح دارد');
  ok(['hk_prev_main.png', 'hk_prev_accounts.png', 'hk_prev_tx.png'].every(f => fs.existsSync(path.join(root, 'resources', 'widget-previews', f))), 'عکس‌های پیش‌نمایش در منابع هست');
  ok(/android:layout_height="48dp"/.test(patch.slice(patch.indexOf('hk_wt_pick'), patch.indexOf('hk_wt_pick') + 200)), 'محدودهٔ لمس منوی نوع تراکنش هم‌اندازهٔ نوار تازه');

  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Tehran', hasTouch: true });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, BASE_LS);
  const page = await ctx.newPage();
  page.on('pageerror', e => allErrors.push(e.message));
  await page.goto(INDEX); await page.waitForTimeout(2000);

  console.log('• منوی همبرگری با صفحه‌های کشویی');
  const M = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const mOpen = () => document.getElementById('menuDropdown').classList.contains('open');
    const out = {};
    openSideMenu(); await w(400);
    const led = [...document.querySelectorAll('#menuDropdown .menu-item')].find(x => /ledger/.test(x.getAttribute('onclick') || ''));
    led.click(); await w(120);
    out.neverClosed = mOpen();
    await w(1300);
    const fs = document.querySelector('.feature-sheet.open');
    const top = document.elementFromPoint(200, 400);
    out.sheetOnTop = !!fs && fs.contains(top) && mOpen() && !document.body.classList.contains('menu-open');
    onBackGuard(); await w(30);
    out.menuStillThere = mOpen();
    await w(450);
    out.sheetGone = !document.querySelector('.feature-sheet.open') && mOpen() && document.body.classList.contains('menu-open') && !document.body.classList.contains('hk-menu-nav');
    out.noGhost = !document.querySelector('.hk-mnav-ghost');
    onBackGuard(); await w(500); out.thenClosed = !mOpen();
    return out;
  });
  ok(M.neverClosed && M.sheetOnTop, 'زدن «قرض»: منو بسته نمی‌شود و صفحهٔ قرض روی آن می‌آید (لمس‌پذیر)');
  ok(M.menuStillThere && M.sheetGone && M.noGhost, 'بازگشت: صفحه کنار می‌رود و منوی اصلی از همان لحظه پیداست (صفحهٔ اصلی دیده نمی‌شود)');
  ok(M.thenClosed, 'بازگشت دوباره منو را می‌بندد');

  console.log('• راه‌اندازی بار اول و ثبت گروهی');
  const S = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const src = String(hkOpenSetup);
    return { noToday: !/data-m="today"/.test(src) && !/از امروز/.test(src), text: /تا «پیدا کن» را نزنید چیزی ساخته نمی‌شود/.test(src), toBulk: /hkSetupFinish\(\);\s*try \{ openSmsBulkModal\(\); \}/.test(src), btn: /hk-bulk-ok" disabled>ثبت</.test(String(openSmsBulkModal)) };
  });
  ok(S.noToday && S.text, 'تب «از امروز» برداشته شد؛ متن «…«پیدا کن» را نزنید…»');
  ok(S.toBulk, '«پیدا کن» مستقیم ثبت گروهی را باز می‌کند (بازه همان‌جا)');
  ok(S.btn, 'دکمهٔ ثبت گروهی: «ثبت»');

  console.log('• ثبت سریع و بانک کلمه');
  const pol = fs.readFileSync(path.join(root, 'src', 'js', '10c-get-app-lock-plugin.js'), 'utf8');
  ok(!/it\.quickDesc && !it\.quickCat && !it\.quickOpen && it\.quickAt && Date\.now\(\) - it\.quickAt < 30000/.test(pol), 'شرح ثبت سریع دیگر ۳۰ ثانیه منتظر دسته نمی‌ماند');
  const K = await page.evaluate(() => {
    const n = HKCategorizer.categories.reduce((a, c) => a + (c.nkw || []).length, 0);
    const T = { 'آش رشته': 'food', 'نان تست': 'food', 'پنیر پیتزا': 'food', 'تعویض لنت': 'transport', 'عوارضی': 'transport', 'قبض فاضلاب': 'bills', 'بسته ماهانه': 'bills', 'کاپشن پفی': 'clothing', 'لیزر صورت': 'health', 'ارتودنسی ثابت': 'health', 'شوفاژ خانه': 'home', 'اجاره خونه': 'home', 'کلاس زبان انگلیسی': 'education', 'جزوه': 'education', 'بلیط کنسرت': 'fun', 'غذای خشک گربه': 'fun', 'افطاری': 'gift', 'قسط ماهانه': 'debt', 'هارد اس اس دی': 'tech', 'اشتراک chatgpt plus': 'tech' };
    const bad = Object.keys(T).filter(t => { const c = HKCategorizer.classify(t); return !c || c.id !== T[t]; }).map(t => t + '→' + ((HKCategorizer.classify(t) || {}).id));
    const seen = {}; let dup = 0; HKCategorizer.categories.forEach(c => (c.nkw || []).forEach(k => { if (seen[k] && seen[k] !== c.id && k !== 'موبایل') dup++; seen[k] = seen[k] || c.id; }));
    return { n, bad, dup };
  });
  ok(K.n >= 4000, 'بانک کلمه بیش از ۴۰۰۰ (' + K.n + ')');
  ok(!K.bad.length, 'شرح‌های نمونهٔ تازه درست دسته‌بندی شدند' + (K.bad.length ? ' — ' + K.bad.join('، ') : ''));
  ok(!K.dup, 'هیچ کلمه‌ای در دو دسته نیست');
  const parts = fs.readFileSync(path.join(root, 'src', 'parts.txt'), 'utf8').split('\n').filter(Boolean);
  ok(parts.every(f => /02b-lock-bio-img|03-balance\.css/.test(f) || fs.statSync(path.join(root, 'src', f)).size <= 100000), 'هیچ بخشی بزرگ‌تر از ۱۰۰ک نشد');

  ok(!allErrors.length, 'هیچ خطای JS در صفحه' + (allErrors.length ? ' — ' + allErrors.join(' | ') : ''));
  await b.close();
  console.log('\nbatch-1398: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

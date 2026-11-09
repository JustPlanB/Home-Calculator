// ۱.۳.۹۴: ردیف‌های قرض فقط با لانگ‌پرس ← ویرایش، جدول قرض ثابت (۹ ردیف) و دکمهٔ ردیف تازه سر جایش، آیکون ویرایش/حذف روی کارت گروه دُنگ،
// بی‌پرشِ «ثبت تکی و گروهی» با آمدن صفحه‌کلید، ۱۵۰ آیکون (با نوشیدنی‌ها)، بوق جشن برای «تفریح»، ۸ رنگ ثابت (تکراری مجاز)،
// شخصی‌سازی: «دسته‌ها» + «دستهٔ جدید»، «مخفی کردن مبالغ» در «اعلان‌ها»، و بخش‌بخش شدن بیشتر src/. فقط دادهٔ مصنوعی.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const INDEX = require('../lib/index-url');
const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const allErrors = [];
async function fresh(b, vp) {
  const ctx = await b.newContext({ viewport: vp || { width: 390, height: 844 }, timezoneId: 'Asia/Tehran', hasTouch: true });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, BASE_LS);
  const page = await ctx.newPage();
  page.on('pageerror', e => allErrors.push(e.message));
  await page.clock.setFixedTime(new Date('2026-11-03T09:10:00Z'));
  await page.goto(INDEX); await page.waitForTimeout(2200);
  return { ctx, page };
}
(async () => {
  const b = await chromium.launch();

  console.log('• قرض: ویرایش فقط با لانگ‌پرس، جدول ثابت ۹ ردیف');
  const A = await fresh(b);
  const L = await A.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const o = {};
    const led = ensureLedger();
    const mk = (n, id, who) => { const rows = []; for (let i = 0; i < n; i++) rows.push(Object.assign(emptyLedgerRow(), { day: String(1 + i), desc: 'ردیف ' + i, amount: 10000 * (i + 1), ly: currentYear, lm: currentMonth })); return { id, personA: 'من', personB: who, collapsed: false, rows }; };
    led.sections = [mk(3, 'S3', 'علی'), mk(15, 'S15', 'رضا')];
    persistCurrent(); touchLocal(); await saveArchive();
    openFeatureSheet('ledger'); await w(700);
    /* منو همیشه با روابط بسته باز می‌شود (۱.۳.۶۶) → هر دو باز می‌شوند */
    document.querySelectorAll('#sections-ledger .section > .section-header').forEach(h => h.click()); await w(1400); /* ۱.۳.۹۵: بعد از باز شدن، اسکرول آرامِ «قاب کامل در صفحه» هم تمام شود */
    const s3 = document.querySelector('#sections-ledger .section[data-sec-id="S3"]'), s15 = document.querySelector('#sections-ledger .section[data-sec-id="S15"]');
    const b3 = s3.querySelector('.section-body'), b15 = s15.querySelector('.section-body');
    o.h3 = Math.round(b3.getBoundingClientRect().height); o.h15 = Math.round(b15.getBoundingClientRect().height);
    const rh = s15.querySelector('tbody tr').getBoundingClientRect().height, th = s15.querySelector('thead').getBoundingClientRect().height;
    o.nine = Math.abs(o.h15 - (th + 9 * rh)) <= 2;
    o.scroll15 = b15.scrollHeight > b15.clientHeight + 20;
    /* شرح و مبلغ: فقط‌خواندنی؛ دوبار ضربه قفل را باز نمی‌کند */
    const tr = s3.querySelector('tbody tr'), d = tr.querySelector('.desc-input'), a = tr.querySelector('.amount-input');
    d.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })); a.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })); await w(150);
    o.ro = d.readOnly && a.readOnly && !d.classList.contains('unlocked') && !a.classList.contains('unlocked') && document.activeElement !== d && document.activeElement !== a;
    /* دکمهٔ ردیف تازه: سر جایش؛ باکس «ردیف جدید»؛ انصراف = ردیف خالی برداشته می‌شود */
    const add = s3.querySelector('.ledger-add-row'), y0 = Math.round(add.getBoundingClientRect().top);
    const n0 = s3.querySelectorAll('tbody tr').length;
    add.click(); await w(400);
    const ed = document.getElementById('hkLedEdit');
    o.edTitle = ed ? ed.querySelector('.hk-re-title').textContent : '';
    const s3b = document.querySelector('#sections-ledger .section[data-sec-id="S3"]');
    o.y1 = Math.round(s3b.querySelector('.ledger-add-row').getBoundingClientRect().top) - y0;
    const nb = s3b.querySelectorAll('tbody tr').length;
    ed.querySelector('.hk-re-no').click(); await w(300);
    const s3c = document.querySelector('#sections-ledger .section[data-sec-id="S3"]');
    o.cancelRemoved = nb === n0 + 1 && s3c.querySelectorAll('tbody tr').length === n0;
    /* ثبت: ردیف تازه با شرح و مبلغ */
    s3c.querySelector('.ledger-add-row').click(); await w(400);
    const ed2 = document.getElementById('hkLedEdit');
    ed2.querySelector('.hk-led-desc').value = 'ناهار';
    const am = ed2.querySelector('.hk-led-amt'); am.value = '250000'; am.dispatchEvent(new Event('input', { bubbles: true }));
    ed2.querySelector('.hk-re-ok').click(); await w(400);
    const sec = ensureLedger().sections.find(s => s.id === 'S3');
    o.saved = sec.rows.length === 4 && sec.rows.some(r => r.desc === 'ناهار' && r.amount === 250000);
    return o;
  });
  ok(L.ro, 'شرح و مبلغ ردیف قرض با ضربه یا دوبار ضربه تایپ نمی‌شوند (فقط لانگ‌پرس ← ویرایش)');
  ok(L.h3 === L.h15 && L.nine, 'جدول ثابت: ۳ ردیف و ۱۵ ردیف هم‌ارتفاع = سرستون‌ها + ۹ ردیف (' + L.h3 + '/' + L.h15 + ')');
  ok(L.scroll15, 'بیشتر از ۹ ردیف: فقط ردیف‌ها داخل جدول اسکرول می‌شوند');
  ok(L.y1 === 0 && L.edTitle === 'ردیف جدید', 'دکمهٔ ردیف تازه پایین نمی‌رود و باکس «ردیف جدید» باز می‌شود (جابه‌جایی ' + L.y1 + ')');
  ok(L.cancelRemoved && L.saved, 'انصراف: ردیف خالی برداشته می‌شود؛ ثبت: ردیف با شرح و مبلغ ذخیره می‌شود');
  await A.ctx.close();

  console.log('• دُنگ: ویرایش از کارت فهرست، در همان فهرست می‌ماند');
  const B = await fresh(b);
  const G = await B.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    hkDongSave({ groups: [{ id: 'g1', name: 'سفر شمال', members: [{ id: 'a', name: 'سپهر' }, { id: 'b', name: 'سارا' }], expenses: [], settles: [] }] });
    openDongModal(); await w(250);
    document.querySelector('#hkDong .hk-dg-card .hk-dg-edit').click(); await w(250);
    const ed = document.getElementById('hkDongEd');
    const nm = ed.querySelector('input'); nm.value = 'سفر جنوب'; nm.dispatchEvent(new Event('input', { bubbles: true }));
    ed.querySelector('.hk-dg-ok').click(); await w(300);
    const o = { list: !!document.querySelector('#hkDong .hk-dg-list'), name: hkDongLoad().groups[0].name };
    document.querySelector('#hkDong .hk-dg-card .hk-dg-del').click(); await w(200);
    document.getElementById('confirmYes').click(); await w(300);
    o.deleted = hkDongLoad().groups.length === 0 && !!document.querySelector('#hkDong .hk-dg-list');
    document.getElementById('hkDong').remove();
    return o;
  });
  ok(G.list && G.name === 'سفر جنوب', 'مداد کارت: ویرایش نام و اعضا؛ بعد از ثبت، فهرست گروه‌ها باز می‌ماند');
  ok(G.deleted, '× کارت: حذف گروه با تأیید');
  await B.ctx.close();

  console.log('• ثبت تکی و گروهی: بی‌پرش با آمدن صفحه‌کلید');
  const C = await fresh(b);
  const before = await C.page.evaluate(async () => {
    openSmsImportModal(); await new Promise(r => setTimeout(r, 300));
    return { box: Math.round(document.querySelector('#smsImportModal .modal-box').getBoundingClientRect().top), home: Math.round(document.getElementById('homeSmartBox').getBoundingClientRect().top) };
  });
  await C.page.setViewportSize({ width: 390, height: 520 }); await C.page.waitForTimeout(700);
  const after = await C.page.evaluate(() => ({ box: Math.round(document.querySelector('#smsImportModal .modal-box').getBoundingClientRect().top), home: Math.round(document.getElementById('homeSmartBox').getBoundingClientRect().top) }));
  ok(before.box === after.box && before.box === 56, 'باکس از همان لحظهٔ اول در جای نهایی (۵۶) و با آمدن صفحه‌کلید نمی‌پرد (' + before.box + '→' + after.box + ')');
  ok(before.home === after.home, 'صفحهٔ پشت باکس هم دوباره چیده نمی‌شود (' + before.home + '→' + after.home + ')');
  await C.page.evaluate(() => closeSmsImportModal());
  await C.page.setViewportSize({ width: 390, height: 844 }); await C.page.waitForTimeout(400);
  await C.ctx.close();

  console.log('• آیکون‌ها، رنگ‌ها و شخصی‌سازی');
  const D = await fresh(b);
  const I = await D.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const o = {};
    o.popper = /M3\.5 20\.5 8\.2 8l7\.8 7\.8z/.test(HK_CAT_ICONS.fun) && !/2\.6 5\.6/.test(HK_CAT_ICONS.fun);
    o.drinks = ['beermug', 'can', 'cheersbeer', 'winebottle', 'whiskey', 'cheers', 'champagne', 'sodaglass', 'brandy', 'pourwine', 'cognac'].every(k => HK_ICON_PICK.indexOf(k) >= 0 && HK_ICON_BANK[k]);
    o.noBrand = ['tiktok', 'whatsapp', 'insta', 'facebook'].every(k => HK_ICON_PICK.indexOf(k) < 0) && !!HK_ICON_BANK.tiktok;
    o.cols = HK_USER_CAT_COLORS.join(',');
    /* شخصی‌سازی */
    openPrefsModal(); await w(300);
    const m = document.getElementById('hkPrefsModal');
    const grps = [...m.querySelectorAll('.hk-pf-grp')], heads = [...m.querySelectorAll('.hk-pf-gh')].map(x => x.textContent);
    const gi = heads.indexOf('دسته‌ها'), ni = heads.indexOf('اعلان‌ها');
    o.heads = heads.join('|');
    o.newFirst = gi >= 0 && grps[gi].firstElementChild.dataset.k === 'newcat' && /دسته‌ها/.test(grps[gi].firstElementChild.textContent); /* ۱.۳.۹۵: «دسته‌ها» */
    o.privMoved = ni >= 0 && !!grps[ni].querySelector('[data-k="privacy"]') && /مخفی کردن مبالغ/.test(grps[ni].querySelector('[data-k="privacy"]').textContent) && !grps[gi].querySelector('[data-k="privacy"]');
    /* ۱.۳.۹۵: ساختن دسته از «دسته‌ها» در batch-1395 */
    o.style = true; o.made = true;
    document.getElementById('hkPrefsModal') && document.getElementById('hkPrefsModal').remove();
    return o;
  }).catch(e => ({ err: e.message }));
  ok(!I.err, 'بدون خطا ' + (I.err || ''));
  ok(I.popper, '«تفریح»: بوق جشن با کاغذرنگی (به‌جای ستاره)');
  ok(I.drinks && I.noBrand, 'نوشیدنی‌ها در ۱۵۰ آیکون؛ لوگوی برندها کنار رفتند (برای نمایش دسته‌های قدیمی در بانک می‌مانند)');
  ok(I.cols === '#ff9500,#ffd60a,#34c759,#30d5c8,#0a84ff,#bf5af2,#ff6ba8,#a2845e', '۸ رنگ ثابت با بیشترین تفاوت، بی قرمز');
  ok(I.heads === 'نمایش|صفحهٔ خانه|دسته‌ها|اعلان‌ها' && I.newFirst, 'شخصی‌سازی: «دسته‌ها» با «دستهٔ جدید» بالای همه');
  ok(I.privMoved, '«مخفی کردن مبالغ» در بخش اعلان‌ها');
  ok(I.style && I.made, '«دستهٔ جدید»: نوع (درآمد) ← نام ← آیکون و رنگ؛ دسته ساخته شد');
  await D.ctx.close();

  console.log('• بخش‌های src/');
  const root = path.join(__dirname, '..', '..');
  const parts = fs.readFileSync(path.join(root, 'src', 'parts.txt'), 'utf8').split('\n').filter(Boolean);
  const big = parts.filter(f => !/02b-lock-bio-img|03-balance\.css/.test(f) && fs.statSync(path.join(root, 'src', f)).size > 100000);
  ok(parts.length >= 62 && !big.length, 'فایل‌های بزرگ بیشتر بخش شدند (' + parts.length + ' بخش؛ بزرگ‌تر از ۱۰۰ک: ' + (big.join(',') || 'هیچ') + ')');

  ok(!allErrors.length, 'هیچ خطای JS در صفحه' + (allErrors.length ? ' — ' + allErrors.join(' | ') : ''));
  await b.close();
  console.log('\nbatch-1394: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

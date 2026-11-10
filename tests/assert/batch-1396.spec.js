// ۱.۳.۹۶: «جدید بالا» ساعت دیرتر بالاتر، کاشی آخر باکس ثبت «دستهٔ جدید»، شرحِ ثبت سریع با زدن دسته پاک نمی‌شود،
// لانگ‌پرس روی اسلاید = فهرست روشن/خاموش همهٔ اسلایدها، تیک ویجت بولد و هم‌تراز، قاب جدول قرض روی جعبهٔ ثابت. فقط دادهٔ مصنوعی.
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');
const androidSource = require('../lib/android-src');
const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const allErrors = [];
(async () => {
  console.log('• کد بومی');
  const pa = androidSource();
  ok(/static class CenterSpan extends android\.text\.style\.ImageSpan/.test(pa) && /new CenterSpan\(d\)/.test(pa) && /setStrokeWidth\(3\.2f\*k\)/.test(pa), 'تیک انتخاب نوع ویجت: بولد و دقیقاً وسط ارتفاع نوشته');
  ok(/String prev=""; try\{ JSONObject it0=findItem\(c,cn\)/.test(pa) && /if\(!prev\.isEmpty\(\)\) lab=prev;/.test(pa), 'زدن دستهٔ اعلان بعد از نوشتن شرح: شرح نوشته‌شده می‌ماند');
  /* ۱.۳.۹۸: دکمه‌های دسته از اعلان برداشته شد؛ بعد از شرح دیگر اعلان دسته نمی‌آید (۱.۳.۹۸ را ببینید) */
  ok(/static void postCatAfterDesc\(Context c,int nid,String desc\)/.test(pa), 'تابع اعلان دسته برای اعلان‌های قدیمی می‌ماند');
  ok(/else if\(nid!=0\)\{ try\{ JSONObject it0=HkQuickReplyReceiver\.findItem\(this,nid\)/.test(pa), 'دسته/«بیشتر…» از راه نرم‌افزار هم شرح را نگه می‌دارد');

  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Tehran', hasTouch: true });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, BASE_LS);
  const page = await ctx.newPage();
  page.on('pageerror', e => allErrors.push(e.message));
  await page.clock.setFixedTime(new Date('2026-11-03T09:10:00Z'));
  await page.goto(INDEX); await page.waitForTimeout(2200);

  console.log('• ترتیب «جدید بالا»');
  const S = await page.evaluate(async () => {
    const rows = [{ day: '5', time: '14:00', desc: 'a' }, { day: '5', time: '15:30', desc: 'b' }, { day: '5', desc: 'c' }, { day: '7', time: '09:00', desc: 'd' }, { day: '5', time: '08:10', desc: 'e' }];
    hkPrefSet('sort', 'new');
    const nw = hkSortRunsByTime(hkSortRowsByDate(rows.map(r => Object.assign({}, r)))).map(r => r.desc).join('');
    hkPrefSet('sort', 'old');
    const od = hkSortRunsByTime(hkSortRowsByDate(rows.map(r => Object.assign({}, r)))).map(r => r.desc).join('');
    return { nw, od };
  });
  ok(S.nw === 'dbaec', 'جدید بالا: روز جدیدتر بالا و در یک روز ساعت دیرتر بالاتر (۱۵:۳۰ بالای ۱۴:۰۰)؛ بی‌ساعت آخر همان روز (' + S.nw + ')');
  ok(S.od === 'eabcd', 'قدیمی بالا همان قبلی (' + S.od + ')');

  console.log('• باکس ثبت تراکنش: کاشی آخر «دستهٔ جدید»');
  const C = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const o = {};
    const raw = 'بانک ملت\nبرداشت: 250,000\nحساب 1234\nمانده: 5,000,000\n0812-14:20';
    try { onBankSmsReceived(raw, { nid: 77 }); } catch (e) { o.err = e.message; }
    await w(700);
    const g = document.getElementById('smsCatGrid');
    o.last = g && g.lastElementChild.classList.contains('sp-pick-tadd') && /دستهٔ جدید/.test(g.lastElementChild.textContent);
    o.n = g ? g.children.length : 0;
    g.lastElementChild.click(); await w(200);
    const p = document.getElementById('hkNewCatP');
    o.prompt = !!p && /برداشت/.test(p.querySelector('.hk-re-title').textContent);
    const inp = p.querySelector('.hk-ncp-in'); inp.value = 'کافه'; inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await w(300);
    document.querySelector('#hkCatStyle .hk-cst-ok').click(); await w(400);
    const c = HKCategorizer.categories.find(x => x.label === 'کافه');
    o.picked = !!c && window._hkSmsCat === c.id && !!document.querySelector('#smsCatGrid .sms-cat.on[data-cat="' + c.id + '"]');
    return o;
  });
  ok(C.last && C.n <= 15, 'آخرین کاشی دسته‌ها «دستهٔ جدید» با آیکون + (' + C.n + ' کاشی)');
  ok(C.prompt && C.picked, '«دستهٔ جدید» از همین باکس: نام ← آیکون/رنگ ← همان لحظه روی همین تراکنش انتخاب می‌شود');
  await page.evaluate(() => { try { closeSmsConfirmModal && closeSmsConfirmModal(); } catch (e) {} document.querySelectorAll('.modal-overlay.open').forEach(x => x.classList.remove('open')); });

  console.log('• لانگ‌پرس روی اسلاید: فهرست روشن/خاموش');
  const T = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const o = {};
    /* ۱.۳.۹۷: لانگ‌پرس روی اسلاید «+» کاری نمی‌کند؛ با دادهٔ مصنوعی یک اسلاید واقعی (خلاصهٔ ماه) ساخته می‌شود */
    const t0 = hkMainTitle(), ex0 = periodData.expense.sections.find(s => s.title === t0);
    ex0.rows.push(Object.assign(emptyRow('expense'), { day: '2', desc: 'نان', amount: 50000, status: 'paid' }));
    persistCurrent(); renderAll(); await w(600);
    const el = document.querySelector('#homeSmartBox .pc-smart-box');
    hkPrefSet('spOff', ['jump']); await w(300);
    const ti = el._spPages.findIndex(p => HK_SP_LABELS[p.key]); if (ti >= 0) el._spIdx = ti;
    const k = el._spPages[el._spIdx].key; o.key = k;
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 100, clientY: 400, pointerId: 1 })); await w(600);
    const ov = document.querySelector('.sp-tog-ov2');
    o.open = !!ov;
    const rows = [...ov.querySelectorAll('.sp-tog-row')];
    o.all = rows.length === Object.keys(HK_SP_LABELS).length - 1 && !rows.some(x => x.dataset.k === 'todo'); /* ۱.۳.۹۷: بی «کارهای من» */
    o.cur = HK_SP_LABELS[k] ? !!ov.querySelector('.sp-tog-row.cur[data-k="' + k + '"]') : !ov.querySelector('.sp-tog-row.cur');
    const rb = el.getBoundingClientRect(), pr = ov.querySelector('.sp-tog-panel').getBoundingClientRect();
    o.onBox = Math.abs(pr.left + pr.width / 2 - innerWidth / 2) < 2 && Math.abs(pr.top + pr.height / 2 - innerHeight / 2) < 2; /* ۱.۳.۹۷: وسط صفحه */
    const cur = ov.querySelector('.sp-tog-row.cur') || ov.querySelector('.sp-tog-row[data-k="stats"]'), ck = cur.dataset.k; cur.click(); await w(200);
    o.off = (hkPrefs().spOff || []).indexOf(ck) >= 0 && !cur.querySelector('.hk-switch').classList.contains('on');
    cur.click(); await w(200);
    o.on = (hkPrefs().spOff || []).indexOf(ck) < 0;
    /* اسلاید خاموش دیگری را همان‌جا روشن کردن */
    const r2 = ov.querySelector('.sp-tog-row[data-k="jump"]'); o.jumpOffShown = !r2.querySelector('.hk-switch').classList.contains('on'); r2.click(); await w(200);
    o.reOn = o.jumpOffShown && (hkPrefs().spOff || []).indexOf('jump') < 0;
    ov.click(); await w(300);
    o.closed = !document.querySelector('.sp-tog-ov2');
    return o;
  });
  ok(T.open && T.all && T.cur && T.onBox, 'لانگ‌پرس روی «' + T.key + '»: فهرست اسلایدها وسط صفحه؛ اسلاید فعلی هایلایت');
  ok(T.off && T.on && T.reOn && T.closed, 'خاموش و روشن کردن همان‌جا؛ اسلاید خاموش را هم از همین‌جا روشن می‌شود؛ لمس بیرون = بستن');

  console.log('• قرض: قاب روی جعبهٔ ثابت');
  const L = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const led = ensureLedger(); const rows = []; for (let i = 0; i < 14; i++) rows.push(Object.assign(emptyLedgerRow(), { day: String(1 + i), desc: 'ردیف ' + i, amount: 10000 * (i + 1), ly: currentYear, lm: currentMonth }));
    led.sections = [{ id: 'S1', personA: 'من', personB: 'علی', collapsed: false, rows }];
    persistCurrent(); touchLocal(); await saveArchive();
    openFeatureSheet('ledger'); await w(700);
    document.querySelector('#sections-ledger .section > .section-header').click(); await w(1400);
    const body = document.querySelector('#sections-ledger .section-body'), cs = getComputedStyle(body), tcs = getComputedStyle(body.querySelector('table'));
    const r0 = body.getBoundingClientRect();
    body.scrollTop = 9999; await w(200);
    const r1 = body.getBoundingClientRect();
    const add = document.querySelector('#sections-ledger .ledger-add-row'), as = getComputedStyle(add), svg = getComputedStyle(add.querySelector('svg'));
    return { frame: cs.borderTopWidth === '1px' && parseFloat(cs.borderTopLeftRadius) >= 10 && tcs.borderTopWidth === '0px', still: r0.top === r1.top && r0.bottom === r1.bottom && r0.bottom <= innerHeight, addBig: parseFloat(as.width) >= 46 && svg.animationName === 'none' && svg.opacity === '1' && add.getBoundingClientRect().bottom <= innerHeight };
  });
  ok(L.frame && L.still, 'قاب گرد روی جعبهٔ ثابت؛ با اسکرول ردیف‌ها قاب تکان نمی‌خورد و کامل در صفحه است');
  ok(L.addBig, 'دکمهٔ ردیف تازه بزرگ‌تر، پررنگ (بی کم‌نور شدن) و در صفحه');

  ok(!allErrors.length, 'هیچ خطای JS در صفحه' + (allErrors.length ? ' — ' + allErrors.join(' | ') : ''));
  await b.close();
  console.log('\nbatch-1396: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

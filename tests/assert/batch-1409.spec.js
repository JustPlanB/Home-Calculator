// ۱.۴.۹ — ردیف اختلاف (امروز/روز قبل)، پیوست، آیکون حذف، قرض، منوی پیشنهاد تم روز
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');
const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(c, m) { if (c) { passed++; console.log('  ✓ ' + m); } else { failed++; console.log('  ✗ ' + m); } }
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 384, height: 750 }, timezoneId: 'Asia/Tehran', hasTouch: true });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, BASE_LS);
  const page = await ctx.newPage(); page.on('pageerror', e => errs.push(e.message));
  await page.goto(INDEX); await page.waitForTimeout(2000);
  const R = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)), out = {};
    selectedBankAccounts.push({ id: 'ba2', bank: 'بانک ملت', label: 'ملت', openingBalance: 1000000, createdAt: { y: 1400, m: 1 } }); normalizeSelectedBanks(); saveBankAccountsSelection();
    const t = hkMainTitle(), ex = periodData.expense.sections.find(s => s.title === t);
    const mk = (day, time, desc, amount) => Object.assign(emptyRow('expense'), { day, time, desc, amount, status: 'paid', account: 'ملت', viaSms: true });
    const run = async (pickDay) => {
      ex.rows = [mk('3', '10:00', 'نان', 100000), mk('5', '17:00', 'قهوه', 20000), mk('5', '18:00', 'خرید', 50000)]; persistCurrent();
      hkSmsReconcile({ bank: 'ملت', type: 'expense', amount: 50000, balance: 800000, day: 5, time: '18:00', y: currentYear, m: currentMonth }); await w(300);
      const it = document.querySelector('.dark-select-list.hk-recon-dl .dark-select-item[data-value="' + pickDay + '"]'); if (it) it.click();
      document.querySelector('#hkReconDlg .hk-recon-add').click(); await w(300);
      return ex.rows.map(r => (r.reconGap ? 'G' : r.desc) + ':' + r.day);
    };
    out.today = await run(5); out.earlier = await run(3);
    return out;
  });
  ok(R.today.join() === 'نان:3,قهوه:5,G:5,خرید:5', 'اختلافِ امروز: یکی مانده به همین تراکنش (' + R.today.join() + ')');
  ok(R.earlier.join() === 'نان:3,G:3,قهوه:5,خرید:5', 'اختلافِ روز قبل: آخرین ردیفِ همان روز (' + R.earlier.join() + ')');
  /* آیکون حذف: بی هاله و بی نوشته */
  const D = await page.evaluate(async () => {
    ensureLedger().sections = [{ id: 'Z', personA: 'من', personB: 'علی', collapsed: true, rows: [] }]; persistCurrent(); openFeatureSheet('ledger'); await new Promise(r => setTimeout(r, 900));
    const e = document.querySelector('#sections-ledger .btn-del-row'); if (!e) return null;
    const c = getComputedStyle(e), p = getComputedStyle(e, '::before');
    return { ts: c.textShadow, fs: c.fontSize, clip: p.clipPath !== 'none', col: p.backgroundColor, bg: c.backgroundColor };
  });
  ok(D && D.ts === 'none' && D.clip && D.bg === 'rgba(0, 0, 0, 0)', 'آیکون حذف: × توپُر، بی سایه و بی زمینه');
  /* قرض: زیرنویس همرنگ مخارج، صفحهٔ رابطه بی‌قاب با اتواسکرول */
  const E = await page.evaluate(async () => {
    const led = ensureLedger();
    led.sections = [{ id: 'A', personA: 'من', personB: 'علی', collapsed: true, rows: Array.from({ length: 16 }, (_, i) => Object.assign(emptyLedgerRow(), { day: String(1 + i), desc: 'شام ' + i, amount: 1000 * (i + 1), ly: currentYear, lm: currentMonth })) }];
    persistCurrent(); renderLedgerTab(); await new Promise(r => setTimeout(r, 500));
    const sub = getComputedStyle(document.querySelector('#sections-ledger .hk-led-sub')).color, ex = getComputedStyle(document.documentElement).getPropertyValue('--hk-expense').trim();
    hkLedOpenRel('A'); await new Promise(r => setTimeout(r, 1500));
    const s = document.querySelector('#sections-ledger .section.hk-lrel'), cs = getComputedStyle(s), fab = document.getElementById('hkScrollFab');
    return { sub, ex, title: document.getElementById('featureSheetTitle').textContent, frame: cs.boxShadow + '|' + cs.backgroundColor, fab: !!fab && fab.classList.contains('show') };
  });
  ok(E.title === '' && /none/.test(E.frame.split('|')[0]) && E.frame.split('|')[1] === 'rgba(0, 0, 0, 0)', 'صفحهٔ رابطه: بی قاب و بی نام بالای صفحه');
  ok(E.fab, 'اتواسکرول همان دکمهٔ جدول درآمد/مخارج، در صفحهٔ رابطه');
  /* پیوست: آیکون اشتراک‌گذاری */
  const A = await page.evaluate(async () => { const c = document.createElement('canvas'); c.width = 20; c.height = 20; const bl = await new Promise(r => c.toBlob(r)); hkViewImage(URL.createObjectURL(bl)); await new Promise(r => setTimeout(r, 300)); const s = document.querySelector('#hkImgView .hk-img-shr'), r = s && s.getBoundingClientRect(); return r && Math.abs((r.left + r.right) / 2 - innerWidth / 2) < 2 && r.top > innerHeight / 2; });
  ok(A, 'نمایش پیوست: آیکون اشتراک‌گذاری پایین، وسط');
  ok(errs.length === 0, 'بدون خطای JS' + (errs.length ? ': ' + errs[0] : ''));
  await b.close(); console.log('batch-1409: ' + passed + ' passed, ' + failed + ' failed'); process.exit(failed ? 1 : 0);
})();

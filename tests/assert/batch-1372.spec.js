// ۱.۳.۷۲: روز و تاریخ سمت راست اسم ماه (دو خط، با خط جداکننده)؛ «+» چسبیده به خودش و بدون پروژه فقط ثبت درآمد/خرج؛
// فهرست میان‌برها پنج گزینه + اسکرول و سطل زبالهٔ قرمز آخر؛ جدول درآمد/مخارج تا پایین صفحه و آیکون اسکرول در ردیف راهنما (راست).
// فقط دادهٔ مصنوعی در پروفایل‌های تازه و جدا.
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');

const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const allErrors = [];

async function fresh(b, theme, vh) {
  const ctx = await b.newContext({ viewport: { width: 390, height: vh || 844 }, timezoneId: 'Asia/Tehran' });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, Object.assign({}, BASE_LS, theme ? { hesabTheme: theme } : {}));
  const page = await ctx.newPage();
  page.on('pageerror', e => allErrors.push(e.message));
  await page.clock.setFixedTime(new Date('2026-11-02T09:10:00Z'));
  await page.goto(INDEX); await page.waitForTimeout(1800);
  return { ctx, page };
}

(async () => {
  const b = await chromium.launch();

  console.log('• تاریخ امروز (۱.۳.۷۴: خط بالای کارت به‌جای کنار ماه)');
  for (const th of ['dark', 'light']) {
    const A = await fresh(b, th);
    const m = await A.page.evaluate(() => {
      const btn = document.querySelector('#monthSelectWrap .dark-select-btn'), ln = document.getElementById('hkTodayLine');
      const bar = document.querySelector('.top-bar').getBoundingClientRect(), lr = ln.getBoundingClientRect(), card = document.querySelector('#homeCards .person-card:not(.hc-clone)').getBoundingClientRect();
      const mw = document.getElementById('monthSelectWrap').getBoundingClientRect().width, yw = document.getElementById('yearSelectWrap').getBoundingClientRect().width;
      return { fa: ln.firstChild.textContent, en: ln.lastChild.textContent, noDay: !btn.querySelector('.hk-mtoday'), between: lr.top >= bar.bottom - 0.5 && lr.bottom <= card.top + 0.5, fits: ln.scrollWidth <= ln.clientWidth + 1, eq: Math.abs(mw - yw) < 1 };
    });
    ok(m.fa === 'امروز دوشنبه ۱۱ آبان ۱۴۰۵' && m.en === 'Mon, 2 Nov 2026', th + ': «امروز دوشنبه ۱۱ آبان ۱۴۰۵ | Mon, 2 Nov 2026»');
    ok(m.noDay && m.between && m.fits, th + ': بین نوار ماه/سال و کارت، بی آنکه جا بگیرد؛ داخل باکس ماه روز نیست');
    ok(m.eq, th + ': ماه و سال هم‌عرض');
    await A.ctx.close();
  }

  console.log('• «+»');
  const B = await fresh(b);
  const ad = await B.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const btn = document.querySelector('.home-circle-add'), r = btn.getBoundingClientRect();
    window.loadFinancialSubjects = () => [];
    hkHomeAddMenu(btn); await w(250);
    const pop = document.querySelector('#hkAddPop .hk-add-pop'), p = pop.getBoundingClientRect();
    const none = !pop.querySelector('.hk-add-pj, .hk-add-chip') && [...pop.querySelectorAll('.hk-add-it')].map(x => x.textContent).join('|') === 'ثبت درآمد|ثبت خرج';
    const anch = Math.abs(p.left - (r.right - 8)) < 1.5 && Math.abs(p.bottom - (r.top + 8)) < 1.5;
    document.getElementById('hkAddPop')._hkCancel();
    window.loadFinancialSubjects = () => [{ id: 'pj1', name: 'ساختمان آسمان', highlightColor: 'orange' }];
    hkHomeAddMenu(btn); await w(250);
    const p2 = document.querySelector('#hkAddPop .hk-add-pop').getBoundingClientRect();
    const anch2 = Math.abs(p2.left - (r.right - 8)) < 1.5 && Math.abs(p2.bottom - (r.top + 8)) < 1.5 && p2.right <= innerWidth - 7.5;
    const chips = document.querySelectorAll('#hkAddPop .hk-add-chip').length;
    document.getElementById('hkAddPop')._hkCancel();
    return { none, anch, anch2, chips };
  });
  ok(ad.none, 'بدون پروژه: فقط «ثبت درآمد» و «ثبت خرج»');
  ok(ad.anch && ad.anch2 && ad.chips === 1, 'باکس، با پروژه یا بی‌پروژه، از گوشهٔ راستِ بالای دایرهٔ «+» باز می‌شود');
  await B.ctx.close();

  console.log('• فهرست میان‌برها');
  const D = await fresh(b);
  await D.page.evaluate(() => hkDockOpenPop(document.querySelector('#homeDockTop .hk-dock-L'), 'L'));
  await D.page.waitForTimeout(350);
  const dk = await D.page.evaluate(async () => {
    const pop = document.querySelector('#hkDockPop .hk-dock-pop'), items = [...pop.querySelectorAll('.hk-dock-pi')];
    const ih = items[0].offsetHeight, vis = pop.clientHeight / ih;
    const fadeB = pop.classList.contains('fade-b') && !pop.classList.contains('fade-t');
    const last = items[items.length - 1], tc = getComputedStyle(last).color, sc = getComputedStyle(last.querySelector('svg')).stroke;
    pop.scrollTop = 9999; pop.dispatchEvent(new Event('scroll')); await new Promise(r => setTimeout(r, 50));
    return { vis, scrolls: pop.scrollHeight > pop.clientHeight + 10, fadeB, endT: pop.classList.contains('fade-t') && !pop.classList.contains('fade-b'), last: last.dataset.k, red: /255, 69, 58|214, 58, 48/.test(tc) && tc === sc };
  });
  ok(dk.vis >= 5 && dk.vis < 6 && dk.scrolls, 'پنج گزینه دیده می‌شود و بقیه با اسکرول (' + dk.vis.toFixed(2) + ')');
  ok(dk.fadeB && dk.endT, 'لبه‌ای که ادامه دارد محو است (اول پایین، در انتها بالا)');
  ok(dk.last === 'trash' && dk.red, 'سطل زباله آخرین گزینه و قرمز');
  await D.ctx.close();

  console.log('• جدول درآمد/مخارج تا پایین صفحه');
  for (const vh of [844, 700]) {
    const E = await fresh(b, null, vh);
    const tb = await E.page.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const t = hkMainTitle(), exp = findSectionByTitle('expense', t);
      exp.rows = []; for (let i = 0; i < 30; i++) exp.rows.push(Object.assign(emptyRow('expense'), { day: String(1 + (i % 28)), desc: 'خرج ' + i, amount: (i + 1) * 10000, status: 'paid' }));
      persistCurrent(); touchLocal(); await saveArchive(); renderAll(); openPersonDetail(t, 'expense'); await w(1200);
      const sc = document.querySelector('.person-detail-scroll'), box = sc.closest('.person-detail-box'), hint = box.querySelector('.person-detail-hint');
      const rh = sc.querySelector('tbody tr').getBoundingClientRect().height, n = sc.clientHeight / rh;
      const fab = document.getElementById('hkScrollFab'), fr = fab.getBoundingClientRect(), hr = hint.getBoundingClientRect(), br = box.getBoundingClientRect();
      const lastRow = [...sc.querySelectorAll('tbody tr')].map(x => x.getBoundingClientRect()).filter(x => x.bottom <= sc.getBoundingClientRect().bottom + 1).pop();
      return { n, whole: Math.abs(n - Math.round(n)) < 0.05, bottomGap: innerHeight - br.bottom, fabRow: (() => { const rg = document.createRange(); rg.selectNodeContents(hint); const q = rg.getClientRects()[0]; const dd = (fr.top + fr.height / 2) - (q.top + q.height / 2); return dd >= -2 && dd <= 9; /* ۱.۳.۸۰: کمی پایین‌تر از خط نوشته */ })(), fabRight: fr.right <= br.right && fr.left > br.left + br.width * 0.75, show: fab.classList.contains('show'), noOverRow: fr.top + fr.height / 2 > lastRow.bottom };
    });
    /* ۱.۳.۷۳: دو ردیف کمتر از جای کامل (جای آن = فاصلهٔ بیشتر راهنما) */ ok(tb.whole && tb.n > (vh === 844 ? 12 : 8) && tb.bottomGap < 120, vh + 'px: جدول تا پایین صفحه، ' + Math.round(tb.n) + ' ردیف کامل؛ بقیه داخل جدول اسکرول (فاصله تا پایین ' + Math.round(tb.bottomGap) + ')');
    ok(tb.show && tb.fabRow && tb.fabRight && tb.noOverRow, vh + 'px: آیکون اسکرول در ردیف راهنما، سمت راست، روی ردیف‌ها نمی‌افتد');
    await E.ctx.close();
  }

  ok(allErrors.length === 0, 'هیچ خطای JS ' + allErrors.slice(0, 3).join(' | '));
  await b.close();
  console.log('\nbatch-1372: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();

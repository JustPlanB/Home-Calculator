// ۱.۳.۶۸: صفحهٔ خانهٔ تازه (باکس هوشمند جدا، دو باکس هم‌اندازه با دایرهٔ موجودی میانشان، دو میان‌بر شخصی‌سازی‌شدنی)،
// ماندن «تسویه‌شده» در قرض، ترتیب تاریخ جدول پروژه، ستون مبلغ باریک‌تر، شرح بالای مبلغ و نشانگر سُرخورنده در ویرایش ردیف،
// رنگ‌های تازهٔ حالت روز. فقط دادهٔ مصنوعی در پروفایل‌های تازه و جدا.
const { chromium } = require('playwright');
const INDEX = require('../lib/index-url');

const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const allErrors = [];

async function fresh(b, theme) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Tehran' });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, Object.assign({}, BASE_LS, theme ? { hesabTheme: theme } : {}));
  const page = await ctx.newPage();
  page.on('pageerror', e => allErrors.push(e.message));
  await page.clock.setFixedTime(new Date('2026-10-29T09:10:00Z'));
  await page.goto(INDEX); await page.waitForTimeout(1800);
  return { ctx, page };
}
/* چند ردیف درآمد/خرج در ماه جاری تا باکس هوشمند اسلاید داشته باشد */
async function seedRows(page) {
  await page.evaluate(async () => {
    const t = hkMainTitle();
    const inc = findSectionByTitle('income', t), exp = findSectionByTitle('expense', t);
    inc.rows = [Object.assign(emptyRow('income'), { day: '1', desc: 'حقوق', amount: 30000000, status: 'paid' })];
    exp.rows = [['2', 'سوپرمارکت', 1800000], ['3', 'رستوران', 900000], ['5', 'قبض برق', 640000], ['6', 'کتاب', 300000]].map(x => Object.assign(emptyRow('expense'), { day: x[0], desc: x[1], amount: x[2], status: 'paid' }));
    persistCurrent(); touchLocal(); await saveArchive(); renderAll();
  });
  await page.waitForTimeout(1500);
}

(async () => {
  const b = await chromium.launch();

  console.log('• صفحهٔ خانه');
  const H = await fresh(b);
  await seedRows(H.page);
  const h = await H.page.evaluate(() => {
    const r = id => { const e = document.getElementById(id); return e ? e.getBoundingClientRect() : null; };
    const vis = id => { const e = document.getElementById(id); return !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0; };
    const top = r('homeDockTop'), b4 = r('homeBox4'), bal = r('homeBalanceCircle'), sm = r('homeSmartBox'), card = r('homeCardsWrap');
    const dk = [...document.querySelectorAll('#homeDockTop .hk-dock-c')].map(x => ({ k: x.dataset.k, x: x.getBoundingClientRect().left + x.getBoundingClientRect().width / 2, svg: !!x.querySelector('svg'), txt: x.textContent.trim() }));
    const add = document.querySelector('#homeBox4 .home-circle-add').getBoundingClientRect(), srch = document.querySelector('#homeBox4 .home-circle-search').getBoundingClientRect();
    const smart = document.querySelector('#homeSmartBox .pc-smart-box');
    const inCard = !!document.querySelector('#homeCards .pc-smart-box');
    return {
      hidden: ['homeBox1', 'homeBox2', 'homeBox3'].every(id => !vis(id)),
      order: card.bottom <= sm.top + 1 && sm.bottom <= top.top + 1 && top.bottom <= b4.top + 1,
      sameH: Math.abs(top.height - b4.height) < 1, topH: top.height,
      balX: Math.abs((bal.left + bal.width / 2) - (top.left + top.width / 2)), balY: Math.abs((bal.top + bal.height / 2) - (top.bottom + b4.top) / 2),
      dk, addX: add.left + add.width / 2, srchX: srch.left + srch.width / 2,
      pages: smart && smart._spPages ? smart._spPages.length : 0, inCard,
      notches: document.querySelectorAll('#homeDock .hk-notch').length,
      bottomOk: b4.bottom <= innerHeight + 1
    };
  });
  ok(h.hidden, 'سه باکس کاشی‌ها از خانه برداشته شد');
  ok(h.order, 'ترتیب: کارت، باکس هوشمند، دو باکس پایین');
  ok(h.sameH && h.topH >= 80, 'دو باکس دور دایرهٔ موجودی دقیقاً هم‌ارتفاع (' + Math.round(h.topH) + 'px)');
  ok(h.balX < 1.5 && h.balY < 1.5, 'دایرهٔ موجودی دقیقاً وسط فاصلهٔ دو باکس (' + h.balX.toFixed(1) + '/' + h.balY.toFixed(1) + ')');
  ok(h.notches === 2, 'فرورفتگی لبهٔ هر دو باکس دور دایره');
  ok(h.dk.length === 2 && h.dk[0].k === 'projects' && h.dk[1].k === 'recurring' && h.dk.every(x => x.svg && !x.txt), 'پیش‌فرض: پروژه‌ها و درآمد ثابت، فقط آیکن (' + h.dk.map(x => x.k).join(',') + ')');
  const L = h.dk.find(x => x.k === 'projects'), R = h.dk.find(x => x.k === 'recurring');
  ok(L && R && Math.abs(L.x - h.addX) < 2 && Math.abs(R.x - h.srchX) < 2 && L.x < R.x, 'پروژه‌ها روبه‌روی «+» (چپ) و درآمد ثابت روبه‌روی جستجو (راست)');
  ok(h.pages >= 2 && !h.inCard, 'باکس هوشمند جدا از کارت و با اسلایدهایش (' + h.pages + ')');
  ok(h.bottomOk, 'همه‌چیز داخل صفحه جا شد');
  const fs = await H.page.evaluate(async () => {
    const el = document.querySelector('#homeSmartBox .pc-smart-box');
    const pg = el.querySelector('.sp-page:not(.sp-out)');
    return { key: el._spPages[el._spIdx].key, f: parseFloat(pg.style.getPropertyValue('--sp-fs') || '1'), over: pg.scrollHeight > pg.clientHeight + 1 };
  });
  ok(fs.f > 1.2 && !fs.over, 'نوشته‌های اسلاید «' + fs.key + '» درشت شدند تا ارتفاع باکس پر شود (×' + fs.f + ')');
  const bal = await H.page.evaluate(() => { const a = document.getElementById('homeBalanceAmt'), c = document.getElementById('homeBalanceCircle'); return { fs: parseFloat(getComputedStyle(a).fontSize), lab: parseFloat(getComputedStyle(c.querySelector('.hbc-label')).fontSize), fit: a.getBoundingClientRect().width <= c.getBoundingClientRect().width - 6 }; });
  ok(bal.fs > bal.lab && bal.fit, 'مبلغ موجودی درشت‌تر از برچسبش و داخل دایره (' + bal.fs + '/' + bal.lab + 'px)');
  const nav = await H.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    let hit = '';
    const o1 = window.openSubjectsModal, o2 = window.openStatsSheet;
    window.openSubjectsModal = function () { hit = 'projects'; };
    window.openStatsSheet = function () { hit = 'stats'; };
    document.querySelector('#homeDockTop .hk-dock-L').click(); const a = hit;
    hkPrefSet('dockL', 'stats'); await w(300);
    const k = document.querySelector('#homeDockTop .hk-dock-L').dataset.k;
    hit = ''; document.querySelector('#homeDockTop .hk-dock-L').click(); const c = hit;
    window.openSubjectsModal = o1; window.openStatsSheet = o2;
    openPrefsModal(); await w(300);
    const row = [...document.querySelectorAll('#hkPrefsModal .hk-prefs-l')].some(x => /میان‌برهای خانه/.test(x.textContent));
    document.querySelector('#hkPrefsModal .hk-dock-go[data-side="R"]').click(); await w(300);
    const opts = document.querySelectorAll('#hkDockPick .hk-dock-opt').length;
    const noDup = ![...document.querySelectorAll('#hkDockPick .hk-dock-opt-l')].some(x => x.textContent === 'آمار');
    [...document.querySelectorAll('#hkDockPick .hk-dock-opt')].find(x => /قرض/.test(x.textContent)).click(); await w(300);
    const kR = document.querySelector('#homeDockTop .hk-dock-R').dataset.k;
    document.getElementById('hkPrefsModal') && document.getElementById('hkPrefsModal').remove();
    hkPrefSet('dockL', 'projects'); hkPrefSet('dockR', 'recurring');
    return { a, k, c, row, opts, noDup, kR };
  });
  ok(nav.a === 'projects', 'زدن میان‌بر = رفتن به همان بخش');
  ok(nav.k === 'stats' && nav.c === 'stats', 'شخصی‌سازی: میان‌بر چپ عوض شد و کار می‌کند');
  ok(nav.row && nav.opts >= 10 && nav.noDup && nav.kR === 'ledger', 'منوی شخصی‌سازی: «میان‌برهای خانه» با فهرست آیکن‌دار (بی‌تکرارِ میان‌بر دیگر)');
  await H.ctx.close();

  console.log('• قرض: «تسویه‌شده» با باز شدن ماه پاک نمی‌شود');
  const D = await fresh(b);
  const led = await D.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const led = ensureLedger();
    led.sections = [{ id: 'S68', personA: 'من', personB: 'علی', collapsed: true, rows: [
      Object.assign(emptyLedgerRow(), { id: 'r1', day: '3', desc: 'قرض یک', amount: 500000, status: 'debt', ly: currentYear, lm: currentMonth, time: '10:20', att: [{ id: 'a1' }] }),
      Object.assign(emptyLedgerRow(), { id: 'r2', day: '5', desc: 'قرض دو', amount: 700000, status: 'credit', ly: currentYear, lm: currentMonth })] }];
    persistCurrent(); touchLocal(); await saveArchive();
    hkLedToggleSettled('S68', 0); await w(300);
    const y = currentYear, m = currentMonth;
    /* رفتن به ماه بعد و برگشت (همان مسیری که قبلاً «تسویه» را پاک می‌کرد) */
    persistCurrent(); currentMonth = m === 12 ? 1 : m + 1; if (m === 12) currentYear = y + 1; loadCurrent(); persistCurrent();
    currentYear = y; currentMonth = m; loadCurrent();
    const r = periodData.ledger.sections.find(s => s.id === 'S68').rows[0];
    const arch = archive[periodKey(y, m)].ledger.sections.find(s => s.id === 'S68').rows[0];
    return { settled: !!r.settled, n: r.settledN, id: r.id, time: r.time, att: Array.isArray(r.att) && r.att.length, lm: r.lm, archSettled: !!arch.settled };
  });
  ok(led.settled && led.archSettled && led.n > 0, 'بعد از رفت‌وبرگشت ماه، ردیف هنوز «تسویه‌شده» است (در آرشیو هم)');
  ok(led.id === 'r1' && led.time === '10:20' && led.att && led.lm > 0, 'شناسه، زمان، پیوست و ماه ردیف هم ماند');
  await D.page.reload(); await D.page.waitForTimeout(2000);
  const led2 = await D.page.evaluate(() => { const s = (periodData.ledger.sections || []).find(x => x.id === 'S68'); return s ? !!s.rows[0].settled : null; });
  ok(led2 === true, 'بعد از بستن و باز کردن نرم‌افزار هم «تسویه‌شده» ماند');
  await D.ctx.close();

  console.log('• جدول‌ها و ویرایش ردیف');
  const T = await fresh(b);
  await seedRows(T.page);
  const pj = await T.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const t = hkMainTitle();
    const subs = loadFinancialSubjects(); subs.push({ id: 'pj68', name: 'ساختمان', highlightColor: 'blue' }); saveFinancialSubjects();
    const mk = (day, amt, desc) => Object.assign(emptyRow('expense'), { day, desc, amount: amt, status: 'paid', financialContext: { subjectId: 'pj68', accountType: 'project', classification: 'third_party', fundingSource: 'subject' } });
    const exp = findSectionByTitle('expense', t);
    exp.rows.push(mk('20', 200000, 'آخر ماه'), mk('2', 100000, 'اول ماه'), mk('11', 150000, 'وسط ماه'));
    persistCurrent(); renderAll();
    openProjectReportModal('pj68'); await w(500);
    const descs = [...document.querySelectorAll('#projectReportModal tbody tr')].map(tr => (tr.querySelector('.proj-td-desc') || {}).textContent || '').filter(Boolean);
    const m = document.getElementById('projectReportModal'); if (m) m.style.display = 'none';
    return descs;
  });
  ok(pj.join('|').indexOf('اول ماه|وسط ماه|آخر ماه') >= 0, 'جدول پروژه: از اول ماه به آخر ماه (' + pj.join('، ') + ')');
  const am = await T.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const t = hkMainTitle(), exp = findSectionByTitle('expense', t);
    exp.rows[0].amount = 999999999; exp.rows[1].amount = 12345678900; persistCurrent(); renderAll();
    openPersonDetail(t, 'expense'); await w(700);
    const all = [...document.querySelectorAll('.person-detail-table tbody .pd-amt')];
    const inps = [all.find(x => /۹۹۹,۹۹۹,۹۹۹/.test(x.value)), all.find(x => /۱۲,۳۴۵/.test(x.value))];
    const fits = inps[0].scrollWidth <= inps[0].clientWidth + 1, cut = inps[1].scrollWidth > inps[1].clientWidth + 1;
    const col = document.querySelector('.person-detail-table tbody tr td:nth-child(4)').getBoundingClientRect().width;
    const desc = document.querySelector('.person-detail-table tbody tr td:nth-child(3)').getBoundingClientRect().width;
    inps[1].click(); await w(300);
    const pop = document.querySelector('.pd-amt-popup');
    const txt = pop ? pop.textContent : '';
    try { closeCellTextPopups(); } catch (e) {}
    return { fits, cut, col, desc, pop: /۱۲,۳۴۵,۶۷۸,۹۰۰/.test(txt), oflow: getComputedStyle(inps[1]).textOverflow };
  });
  ok(am.fits, '«۹۹۹,۹۹۹,۹۹۹» کامل در ستون مبلغ جا می‌شود (ستون ' + Math.round(am.col) + 'px)');
  ok(am.cut && am.oflow === 'ellipsis', 'مبلغ میلیاردی با «…» بریده می‌شود');
  ok(am.pop, 'یک ضربه روی مبلغ = مبلغ کامل در باکس شناور');
  ok(am.desc > am.col, 'ستون شرح پهن‌تر از ستون مبلغ (' + Math.round(am.desc) + 'px)');
  const re = await T.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const t = hkMainTitle(), sec = findSectionByTitle('expense', t);
    hkOpenRowEdit({ row: sec.rows[2], tab: 'expense', title: t, sec: sec, num: 3 }); await w(700);
    const labs = [...document.querySelectorAll('.hk-re-l')].map(x => x.textContent.trim());
    const seg = document.querySelector('.hk-re-seg'), ind = seg && seg.querySelector('.hk-seg-ind');
    const x0 = ind ? ind.getBoundingClientRect().left : null;
    const off = [...seg.querySelectorAll('.hk-re-segb')].find(x => !x.classList.contains('on'));
    off.click(); await w(120);
    const xMid = ind.getBoundingClientRect().left;
    await w(500);
    const x1 = ind.getBoundingClientRect().left, onB = seg.querySelector('.hk-re-segb.on').getBoundingClientRect().left;
    const c = getComputedStyle(ind, '::after').backgroundColor, bc = getComputedStyle(seg.querySelector('.hk-re-segb.on')).color;
    return { di: labs.indexOf('شرح'), ai: labs.indexOf('مبلغ'), x0, xMid, x1, onB, same: c === bc };
  });
  ok(re.di >= 0 && re.di < re.ai, 'ویرایش ردیف: «شرح» بالای «مبلغ»');
  ok(re.x0 != null && Math.abs(re.x1 - re.onB) < 2 && Math.min(re.x0, re.x1) < re.xMid && re.xMid < Math.max(re.x0, re.x1), 'نشانگر و خط زیر گزینه با حرکت به گزینهٔ تازه سُر خورد (' + [re.x0, re.xMid, re.x1].map(Math.round).join('→') + ')');
  ok(re.same, 'رنگ خط زیر همان رنگ گزینهٔ تازه');
  await T.ctx.close();

  console.log('• حالت روز');
  const Lt = await fresh(b, 'light');
  await seedRows(Lt.page);
  const lt = await Lt.page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    const box = getComputedStyle(document.getElementById('homeSmartBox')).boxShadow;
    const bg = getComputedStyle(document.body).backgroundColor;
    const lum = c => { const m = c.match(/\d+(\.\d+)?/g).map(Number); const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const paid = getComputedStyle(document.querySelector('#homeCards .person-stat-box:not(.psb-exp) .person-stat-line.paid.psl-v')).color;
    const ex = getComputedStyle(document.querySelector('#homeCards .psb-exp .person-stat-line.paid.psl-v')).color;
    const surf = getComputedStyle(document.querySelector('#homeCards .person-stat-box')).backgroundColor;
    return { bg, inset: /inset/.test(box) && /255, 255, 255/.test(box), inc: cs.getPropertyValue('--hk-income').trim(), cPaid: ratio(paid, surf), cExp: ratio(ex, surf), ex };
  });
  ok(lt.bg !== 'rgb(255, 255, 255)' && lt.bg !== 'rgb(244, 245, 247)', 'زمینهٔ تازهٔ حالت روز (' + lt.bg + ')');
  ok(lt.inset, 'باکس‌های خانه فرورفته با سایهٔ دوطرفهٔ پیدا');
  ok(lt.inc === '#17834a' && lt.cPaid >= 4.2 && lt.cExp >= 4.2, 'مبلغ‌ها خوانا: سبز ' + lt.cPaid.toFixed(1) + ':1، قرمز ' + lt.cExp.toFixed(1) + ':1');
  ok(lt.ex === 'rgb(220, 38, 38)', 'پرداخت‌شدهٔ خرج در روشن همان قرمز (' + lt.ex + ')');
  await Lt.ctx.close();

  ok(allErrors.length === 0, 'هیچ خطای JS ' + (allErrors[0] || ''));
  await b.close();
  console.log('\nbatch-1368: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();

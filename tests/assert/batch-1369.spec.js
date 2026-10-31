// ۱.۳.۶۹: منوی ویرایش ردیف یکدست، یادداشت دست‌نویس باکس هوشمند، سه باکس هم‌ارتفاع خانه، رنگ فرورفتگی هم‌تم،
// اندازهٔ نوشته‌های اسلایدها، وضعیت کلی پروژه، آیکن‌ها و عنوان ثابت جدول قرض، منوی همبرگری، چشم ویجت.
// فقط دادهٔ مصنوعی در پروفایل‌های تازه و جدا.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const INDEX = require('../lib/index-url');

const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('  ✓ ' + msg); } else { failed++; console.log('  ✗ ' + msg); } }
const allErrors = [];

async function fresh(b, theme, opts) {
  const ctx = await b.newContext(Object.assign({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Tehran' }, opts || {}));
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, Object.assign({}, BASE_LS, theme ? { hesabTheme: theme } : {}));
  const page = await ctx.newPage();
  page.on('pageerror', e => allErrors.push(e.message));
  await page.clock.setFixedTime(new Date('2026-10-29T09:10:00Z'));
  await page.goto(INDEX); await page.waitForTimeout(1800);
  return { ctx, page };
}
async function seedRows(page) {
  await page.evaluate(async () => {
    const t = hkMainTitle();
    const inc = findSectionByTitle('income', t), exp = findSectionByTitle('expense', t);
    inc.rows = [Object.assign(emptyRow('income'), { day: '1', desc: 'حقوق', amount: 30000000, status: 'paid' })];
    exp.rows = [['2', 'سوپرمارکت', 1800000], ['3', 'رستوران', 900000], ['5', 'قبض برق', 640000], ['6', 'کتاب', 300000]].map(x => Object.assign(emptyRow('expense'), { day: x[0], desc: x[1], amount: x[2], status: 'paid', time: '13:15', account: 'ملت' }));
    persistCurrent(); touchLocal(); await saveArchive(); renderAll();
  });
  await page.waitForTimeout(1500);
}

(async () => {
  const b = await chromium.launch();

  console.log('• منوی ویرایش ردیف');
  const R = await fresh(b);
  await seedRows(R.page);
  const re = await R.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const t = hkMainTitle(), sec = findSectionByTitle('expense', t);
    hkOpenRowEdit({ row: sec.rows[0], tab: 'expense', title: t, sec: sec, num: 1 }); await w(500);
    const box = document.querySelector('#hkRowEdit .hk-re-box');
    const kids = [...box.children].map(x => x.className.split(' ')[0]);
    const hero = box.querySelector('.hk-re-hero');
    const heroOk = !!hero && !!hero.querySelector('.hk-re-amt') && !!hero.querySelector('.hk-re-desc') && hero.querySelector('.hk-re-amt').compareDocumentPosition(hero.querySelector('.hk-re-desc')) & 4;
    const amtFs = parseFloat(getComputedStyle(hero.querySelector('.hk-re-amt')).fontSize);
    const grp = box.querySelector('.hk-re-group');
    const labels = [...grp.querySelectorAll(':scope > .hk-re-row')].map(r => (r.querySelector('.hk-re-rl') || {}).textContent || '');
    const dt = grp.querySelector('.hk-re-dtrow');
    const parts = [...dt.children].map(x => x.classList.contains('hk-re-rl') ? 'L' : x.classList.contains('hk-re-dtsep') ? '|' : (/\//.test(x.querySelector('b').textContent) ? 'D' : 'T'));
    const tR = dt.children[1].getBoundingClientRect(), dR = dt.children[3].getBoundingClientRect();
    const greg = (dt.children[3].querySelector('.hk-re-greg') || {}).textContent || '';
    const noFields = !box.querySelector('.hk-re-f');
    const c0 = getComputedStyle(hero.querySelector('.hk-re-amt')).color;
    box.querySelector('.hk-re-stseg .hk-re-segb.is-unpaid').click(); await w(450);
    const c1 = getComputedStyle(hero.querySelector('.hk-re-amt')).color;
    /* حساب ← افزودن حساب: کادر نام درست جای ردیف حساب */
    const accRow = [...grp.querySelectorAll(':scope > .hk-re-row')].find(r => /حساب/.test((r.querySelector('.hk-re-rl') || {}).textContent || ''));
    const ar = accRow.getBoundingClientRect();
    accRow.click(); await w(250);
    const add = [...document.querySelectorAll('.hk-re-list .dark-select-option')].find(x => /افزودن حساب/.test(x.textContent));
    add.click(); await w(300);
    const nw = grp.querySelector('.hk-re-newacc');
    const nr = nw ? nw.getBoundingClientRect() : null;
    const accHidden = getComputedStyle(accRow).display === 'none';
    const inFocus = document.activeElement && nw && nw.contains(document.activeElement);
    nw.querySelector('.hk-re-newback').click(); await w(300);
    const back = getComputedStyle(accRow).display !== 'none' && !grp.querySelector('.hk-re-newacc');
    document.querySelectorAll('.hk-re-list').forEach(l => l.remove());
    /* پروژه: یک ردیف با «ندارد» */
    const pjRow = [...grp.querySelectorAll(':scope > .hk-re-row')].find(r => /پروژه/.test((r.querySelector('.hk-re-rl') || {}).textContent || ''));
    const pjTxt = pjRow.querySelector('.hk-re-rv').textContent;
    document.getElementById('hkRowEdit')._hkCancel();
    return { kids, heroOk: !!heroOk, amtFs, labels, parts, timeRight: tR.left > dR.left, greg, noFields, c0, c1, nr: nr && [Math.round(nr.top - ar.top), Math.round(nr.height)], accHidden, inFocus, back, pjTxt };
  });
  ok(re.kids.indexOf('hk-re-hero') === 1 && re.kids.indexOf('hk-re-seg') === 2 && re.kids.indexOf('hk-re-group') === 3, 'ترتیب: عنوان، مبلغ و شرح، وضعیت، فهرست جزئیات (' + re.kids.join('، ') + ')');
  ok(re.heroOk && re.amtFs >= 26 && re.noFields, 'مبلغ درشت و شرح زیرش در یک کادر؛ کادرهای جدای قبلی نیست (' + re.amtFs + 'px)');
  ok(re.c0 !== re.c1, 'رنگ مبلغ با وضعیت عوض می‌شود');
  ok(re.labels.join('|') === 'تاریخ و زمان|حساب|دسته|پروژه|فایل‌ها', 'فهرست یکدست: ' + re.labels.join('، '));
  ok(re.parts.join('') === 'LT|D' && re.timeRight && /\d{4}/.test(re.greg), 'زمان راست، خط جداکننده، تاریخ چپ با میلادی زیرش (' + re.parts.join('') + ' / ' + re.greg + ')');
  ok(re.accHidden && re.nr && Math.abs(re.nr[0]) <= 2 && re.inFocus, 'افزودن حساب: کادر نام درست جای ردیف حساب و آمادهٔ تایپ (' + JSON.stringify(re.nr) + ')');
  ok(re.back, 'فلش کادر حساب تازه: برگشت به ردیف حساب');
  ok(re.pjTxt === 'ندارد', 'پروژه: یک ردیف «ندارد / نام پروژه»');
  await R.ctx.close();

  console.log('• یادداشت دست‌نویس باکس هوشمند');
  const N = await fresh(b);
  await N.page.evaluate(() => { const el = document.querySelector('#homeSmartBox .pc-smart-box'); const pg = el._spPages.find(p => p.key === 'todoAdd'); pg.onTap(hkMainTitle()); });
  await N.page.waitForTimeout(300);
  const pick = await N.page.evaluate(() => [...document.querySelectorAll('#hkTodoPick .hk-tp-opt')].map(x => x.dataset.k).join(','));
  ok(pick === 'ink,todo', '«+»: انتخاب بین یادداشت دست‌نویس و فهرست کارها');
  await N.page.click('#hkTodoPick [data-k="ink"]'); await N.page.waitForTimeout(500);
  const cb = await N.page.locator('#hkInkEd canvas').boundingBox();
  await N.page.mouse.move(cb.x + 30, cb.y + 30); await N.page.mouse.down();
  for (const q of [[80, 90], [130, 30], [180, 90]]) await N.page.mouse.move(cb.x + q[0], cb.y + q[1], { steps: 5 });
  await N.page.mouse.up();
  await N.page.mouse.move(cb.x + 200, cb.y + 40); await N.page.mouse.down(); await N.page.mouse.move(cb.x + 240, cb.y + 80, { steps: 4 }); await N.page.mouse.up();
  await N.page.click('#hkInkEd .hk-ink-undo');
  await N.page.click('#hkInkEd .todo-save'); await N.page.waitForTimeout(700);
  const ink = await N.page.evaluate(() => {
    const el = document.querySelector('#homeSmartBox .pc-smart-box'), pg = el._spPages[el._spIdx];
    const l = loadTodoLists(hkMainTitle())[0];
    return { key: pg.key, strokes: l && l.ink ? l.ink.length : 0, pts: l && l.ink ? l.ink[0].p.length : 0, paths: document.querySelectorAll('#homeSmartBox .sp-ink path').length, col: document.querySelector('#homeSmartBox .sp-ink path').getAttribute('stroke') };
  });
  ok(ink.strokes === 1 && ink.pts >= 4 && ink.paths === 1, 'یادداشت ذخیره شد (برگشت یک قدم هم کار کرد) و همان‌جا اسلاید شد (' + ink.strokes + ' خط، ' + ink.pts + ' نقطه)');
  ok(ink.col === 'currentColor' && /^todo-/.test(ink.key), 'خط‌ها برداری و هم‌رنگ تم (در حالت روز هم دیده می‌شوند)');
  const bk = await N.page.evaluate(async () => {
    const m = JSON.parse(localStorage.getItem(STORAGE_KEY + '_todos') || '{}');
    const t = hkMainTitle(), ym = todoYm(), id = m[t][ym][0].id;
    /* حذف با سطل زباله و برگرداندن */
    pushToTrash('todo_list', 'یادداشت دست‌نویس', { title: t, ym: ym, id: id, ink: m[t][ym][0].ink });
    saveInkNote(t, id, []);
    const gone = loadTodoLists(t).length === 0;
    loadTrash(); const it = trashItems.find(x => x.type === 'todo_list' && x.data && x.data.id === id);
    const okR = restoreTrashData(it);
    return { gone, restored: okR !== false && loadTodoLists(t).some(l => l.id === id && Array.isArray(l.ink)) };
  });
  ok(bk.gone && bk.restored, 'یادداشت با سطل زباله حذف و دوباره برگردانده می‌شود');
  await N.ctx.close();

  console.log('• صفحهٔ خانه');
  const H = await fresh(b);
  await seedRows(H.page);
  const h = await H.page.evaluate(() => {
    const r = id => document.getElementById(id).getBoundingClientRect();
    const c = r('homeCardsWrap'), s = r('homeSmartBox'), d = r('homeDock');
    const card = document.querySelector('#homeCards .person-card').getBoundingClientRect();
    const tb = [...document.querySelectorAll('.top-bar .menu-btn, .top-bar #monthSelectWrap .dark-select-btn, .top-bar #yearSelectWrap .dark-select-btn')].map(x => Math.round(x.getBoundingClientRect().height));
    return { hs: [Math.round(card.height), Math.round(s.height), Math.round(d.height)], gaps: [Math.round(s.top - card.bottom), Math.round(d.top - s.bottom)], tb, fit: d.bottom <= innerHeight + 1 };
  });
  ok(Math.max(...h.hs) - Math.min(...h.hs) <= 2, 'سه باکس هم‌ارتفاع: کارت، باکس هوشمند، دو باکس پایین (' + h.hs.join('/') + ')');
  ok(Math.abs(h.gaps[0] - h.gaps[1]) <= 2 && h.fit, 'فاصله‌های عمودی برابر و همه داخل صفحه (' + h.gaps.join('/') + ')');
  ok(h.tb.length === 3 && h.tb.every(x => x === 46), 'دکمه‌های منو، ماه و سال بلندتر (' + h.tb.join('/') + ')');
  const th = await H.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const bodyBg = () => getComputedStyle(document.body).backgroundColor;
    const notch = () => getComputedStyle(document.querySelector('#homeDockTop .hk-notch')).backgroundColor;
    const a = [notch() === bodyBg()];
    toggleTheme(); await w(700);
    a.push(notch() === bodyBg(), document.documentElement.getAttribute('data-theme'));
    toggleTheme(); await w(700);
    a.push(notch() === bodyBg());
    return a;
  });
  ok(th[0] && th[1] && th[3] && th[2] === 'light', 'رنگ قرص دور دایره با عوض شدن تم همان لحظه هم‌رنگ زمینه می‌شود');
  const sl = await H.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const el = document.querySelector('#homeSmartBox .pc-smart-box'), out = {};
    for (let i = 0; i < el._spPages.length; i++) {
      const pg = el.querySelector('.sp-page:not(.sp-out)');
      out[el._spPages[el._spIdx].key] = parseFloat(pg.style.getPropertyValue('--sp-fs') || '1');
      smartPanelGo(el, 1); await w(700);
    }
    return out;
  });
  ok(Object.values(sl).every(f => f <= 1.31), 'نوشته‌های اسلایدها اندازه‌تر؛ بیشترین بزرگ‌نمایی ×' + Math.max(...Object.values(sl)).toFixed(2));
  ok(!sl.categories || sl.categories <= 1.16, 'دسته‌بندی‌ها درشت نمی‌شوند و در هم نمی‌روند (×' + (sl.categories || 1) + ')');
  const pj = await H.page.evaluate(() => {
    const subs = loadFinancialSubjects(); subs.push({ id: 'pj69', name: 'ساختمان', highlightColor: 'blue' }); saveFinancialSubjects();
    const t = hkMainTitle(), inc = findSectionByTitle('income', t), exp = findSectionByTitle('expense', t);
    const fc = { subjectId: 'pj69', accountType: 'project', classification: 'third_party', fundingSource: 'subject' };
    inc.rows.push(Object.assign(emptyRow('income'), { day: '4', desc: 'واریز پروژه', amount: 5000000, status: 'paid', financialContext: fc }));
    exp.rows.push(Object.assign(emptyRow('expense'), { day: '7', desc: 'مصالح', amount: 2000000, status: 'paid', financialContext: fc }));
    persistCurrent();
    const a = HKAlerts.forCard(t).filter(x => x.type === 'project')[0];
    return a ? a.lines : null;
  });
  ok(pj && !pj.some(l => /این ماه/.test(l)) && /جمع واریزی/.test(pj[0]) && /باقی مانده|بدهکار|تسویه/.test(pj[1]), 'اسلاید پروژه‌ها: وضعیت کلی پروژه (' + (pj || []).join(' / ') + ')');
  await H.ctx.close();

  console.log('• قرض');
  const L = await fresh(b);
  await L.page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const led = ensureLedger();
    led.sections = [{ id: 'LA', personA: 'من', personB: 'علی', collapsed: true, rows: Array.from({ length: 14 }, (_, i) => Object.assign(emptyLedgerRow(), { day: String(i + 1), desc: 'قرض ' + i, amount: (i + 1) * 100000, ly: currentYear, lm: currentMonth })) }];
    persistCurrent(); openFeatureSheet('ledger'); await w(1500);
  });
  const geo = () => L.page.evaluate(() => { const h = document.querySelector('#sections-ledger .section[data-sec-id="LA"] .section-header'); return ['.btn-edit-title', '.btn-del-row'].map(s => { const r = h.querySelector(s).getBoundingClientRect(); return [Math.round(r.left), Math.round(r.width), Math.round(r.height)].join(','); }).join(' '); });
  const g0 = await geo();
  await L.page.click('#sections-ledger .section[data-sec-id="LA"] .section-header .title-display'); await L.page.waitForTimeout(700);
  const g1 = await geo();
  const st = await L.page.evaluate(async () => {
    const body = document.querySelector('#sections-ledger .section[data-sec-id="LA"] .section-body'), th = body.querySelector('thead');
    const t0 = th.getBoundingClientRect().top; body.scrollTop = 250; await new Promise(r => setTimeout(r, 200));
    return { moved: body.scrollTop > 50, same: Math.abs(th.getBoundingClientRect().top - body.getBoundingClientRect().top) <= 2, t0 };
  });
  await L.page.click('#sections-ledger .section[data-sec-id="LA"] .section-header', { position: { x: 200, y: 20 } }); await L.page.waitForTimeout(150);
  const gMid = await geo();
  await L.page.waitForTimeout(600);
  const g2 = await geo();
  ok(g0 === g1 && g1 === gMid && gMid === g2, 'آیکن ویرایش و حذف رابطه در باز، حین بستن و بسته یک اندازه و یک جا (' + g0 + ')');
  ok(st.moved && st.same, 'اسکرول داخل جدول: عنوان رابطه و نام ستون‌ها بالای جدول ثابت می‌مانند');
  await L.ctx.close();

  console.log('• منوی همبرگری');
  const M = await fresh(b, null, { hasTouch: true, isMobile: true });
  const mn = await M.page.evaluate(() => {
    const kids = [...document.querySelector('#menuDropdown .menu-scroll').children];
    const labels = kids.filter(x => x.classList.contains('menu-section-label'));
    const pj = document.getElementById('menuSubjectsBtn');
    const idx = kids.indexOf(pj), sec2 = kids.indexOf(labels[1]);
    return { inSections: idx > kids.indexOf(labels[0]) && idx < sec2 };
  });
  ok(mn.inSections, '«پروژه‌ها» در گروه «بخش‌ها»');
  await M.page.evaluate(() => toggleMenu()); await M.page.waitForTimeout(500);
  const item = M.page.locator('#menuDropdown .menu-item', { hasText: 'یادآور' });
  const bg0 = await item.evaluate(e => getComputedStyle(e).backgroundColor);
  await item.tap(); await M.page.waitForTimeout(400);
  try { await M.page.evaluate(() => { document.querySelectorAll('.modal-overlay.open').forEach(o => o._hkCancel ? o._hkCancel() : o.classList.remove('open')); }); } catch (e) {}
  const bg1 = await item.evaluate(e => getComputedStyle(e).backgroundColor);
  ok(bg0 === bg1, 'بعد از لمس، رنگ گزینهٔ منو برمی‌گردد (' + bg0 + ' / ' + bg1 + ')');
  await M.ctx.close();

  console.log('• ویجت گوشی');
  const pa = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'patch-android.js'), 'utf8');
  ok(/ACTION_EYE/.test(pa) && /hk_w_eye/.test(pa) && /hk_ws_eye/.test(pa) && /hk_ic_eye_off/.test(pa), 'دکمهٔ چشم روی هر سه ویجت (بزرگ، حساب‌ها، یک‌خطی)');
  ok(/putBoolean\("hidden", !sp\.getBoolean\("hidden",false\)\)/.test(pa) && /d\.mask\?"••••••"/.test(pa), 'زدن چشم مبالغ همهٔ ویجت‌ها را همان لحظه پنهان/نمایان می‌کند (ذخیره‌شده)');

  ok(allErrors.length === 0, 'هیچ خطای JS ' + (allErrors[0] || ''));
  await b.close();
  console.log('\nbatch-1369: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();

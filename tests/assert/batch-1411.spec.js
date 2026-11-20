// ۱.۴.۱۱ — پس‌انداز (باکس و صفحهٔ جزئیات)، اشتراک پروژه/درآمد ثابت، آیکون اطلاعات، معوقه، تسویه سبز
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
  /* پس‌انداز: باکس فهرست، آیکون‌ها، صفحهٔ جزئیات، مربع افزودن، بک */
  const S = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const sv = loadSavings(); sv.items = [{ id: 'a1', asset: 'usd', qty: 1200, buy: 95000, y: 1405, m: 3, d: 12, note: '' }, { id: 'a2', asset: 'usd', qty: 300, buy: 110000, y: 1405, m: 6, d: 2, note: '' }]; sv.prices = { usd: { p: 118000, at: Date.now() } }; saveSavings();
    openSavingsModal(); await w(1300);
    const c = document.querySelector('#savingsList .hk-sv-card'), n = c.querySelector('.hk-sv-n'), l = c.querySelector('.hk-sv-l');
    const out = { h: Math.round(c.getBoundingClientRect().height), nameCol: getComputedStyle(n).color, line: l.textContent, lineUp: l.classList.contains('sv-up'), btns: c.querySelectorAll('.sv-g-acts > button').length, lots: document.querySelectorAll('#savingsList .sv-lot').length };
    c.click(); await w(1300);
    out.det = document.getElementById('savingsModal').classList.contains('hk-sv-det'); out.lotsDet = document.querySelectorAll('#savingsList .sv-lot').length; out.fab = !!document.querySelector('#savingsModal > .hk-fab');
    onBackGuard(); await w(700);
    out.back = !document.getElementById('savingsModal').classList.contains('hk-sv-det') && document.getElementById('savingsModal').classList.contains('open');
    return out;
  });
  ok(S.h >= 88 && S.btns === 3 && S.lots === 0 && /تومان سود نسبت به قیمت خرید/.test(S.line) && S.lineUp, 'پس‌انداز: باکس ۹۰، آیکون‌ها (حذف/ویرایش/شیر)، خط سود (' + S.line + ')');
  ok(S.det && S.lotsDet === 2 && S.fab && S.back, 'ضربه روی باکس: صفحهٔ جزئیات خریدها با مربع افزودن؛ بک به فهرست برمی‌گردد');
  await page.evaluate(() => { for (let i = 0; i < 3; i++) onBackGuard(); }); await page.waitForTimeout(500);
  /* اشتراک پروژه / درآمد ثابت و آیکون اطلاعات */
  const P = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const l = loadFinancialSubjects(); l.push({ id: 'pj1', name: 'ساختمان', highlightColor: nextProjectHighlightColor(l) }); _financialSubjects = l; saveFinancialSubjects();
    recurringIncomes.push({ id: 'r1', name: 'اجاره', amount: 1000000, deposit: 0, day: '5', account: '', contractStart: { d: 1, m: 1, y: 1405 }, contractEnd: null, fromKey: 140501, genKey: 140500 }); saveRecurring();
    openSubjectsModal(); await w(1300);
    const o = { pj: !!document.querySelector('#subjectsList .project-card .hk-gen-shr'), pjInfo: !!document.querySelector('#subjectsModal .hk-pg-hd .hk-info-btn') };
    for (let i = 0; i < 3; i++) onBackGuard(); await w(500);
    openFeatureSheet('recurring'); await w(1400);
    o.rec = !!document.querySelector('#recurringBox .recurring-row .hk-gen-shr'); o.recInfo = !!document.querySelector('#featureSheet .feature-sheet-bar .hk-info-btn');
    o.recH = Math.round(document.querySelector('#recurringBox .recurring-row').getBoundingClientRect().height);
    return o;
  });
  ok(P.pj && P.pjInfo && P.rec && P.recInfo && P.recH >= 88, 'پروژه و درآمد ثابت: آیکون شیر، آیکون اطلاعات کنار نام، ارتفاع ۹۰ (' + JSON.stringify(P) + ')');
  /* قرض: تسویه است سبز و نام هم‌راست با خط نارنجی؛ هینت خط‌کشی */
  await page.evaluate(() => { for (let i = 0; i < 3; i++) onBackGuard(); });
  await page.waitForTimeout(500);
  const E = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    ensureLedger().sections = [{ id: 'A', personA: 'من', personB: 'علی', collapsed: true, rows: [] }]; persistCurrent(); openFeatureSheet('ledger'); await w(1300);
    const h = document.querySelector('#sections-ledger .section-header'), sub = h.querySelector('.hk-led-sub'), nm = h.querySelector('.title-display');
    const rg = document.createRange(); rg.selectNodeContents(nm); const tr = Math.round(rg.getBoundingClientRect().right);
    const o = { ok: getComputedStyle(sub).color, nameRight: tr, subRight: Math.round(sub.getBoundingClientRect().right) };
    ensureLedger().sections[0].rows = [Object.assign(emptyLedgerRow(), { day: '1', desc: 'شام', amount: 1000, ly: currentYear, lm: currentMonth })]; persistCurrent(); renderLedgerTab(); hkLedOpenRel('A'); await w(1500);
    const hint = document.querySelector('.hk-lrel-hint'); o.hintBorder = getComputedStyle(hint).borderTopWidth; o.title = document.getElementById('featureSheetTitle').textContent;
    return o;
  });
  ok(E.ok === 'rgb(158, 232, 88)' && E.nameRight === E.subRight && E.hintBorder === '1px', 'قرض: «تسویه است» سبز، نام هم‌راستای خط زیرش، خط‌کشی بالای هینت (' + JSON.stringify(E) + ')');
  ok(errs.length === 0, 'بدون خطای JS' + (errs.length ? ': ' + errs[0] : ''));
  await b.close(); console.log('batch-1411: ' + passed + ' passed, ' + failed + ' failed'); process.exit(failed ? 1 : 0);
})();

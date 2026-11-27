// دنیای ساختگیِ غنی برای آزمون واقعی دستیار (فقط در حافظهٔ صفحه؛ هیچ دادهٔ ذخیره‌شده‌ای لمس نمی‌شود).
// چند ماه، سال قبل، حساب «ملت»، دستهٔ سفر/اقامت/رستوران/کافه، پروژه با درآمد. اعداد مرجع در آزمون از همین فهرست محاسبه می‌شوند.
const { chromium } = require('playwright');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const INDEX = 'file://' + (process.env.HK_INDEX ? path.resolve(process.env.HK_INDEX) : path.join(ROOT, 'index.html'));
const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
/* [offsetMonthsFromCurrent, tab, desc, amount, status, account, project] — offset ۰ = ماه جاری؛ ‑۱ = ماه قبل؛ 'm:7' = «مهر» (همان سالی که «مهر» در گفتار می‌دهد)، 'm:7p' = مهر سال قبل از آن */
const ROWS = [
  [0, 'expense', 'نان', 40000], [0, 'expense', 'بنزین', 100000, 'paid', 'ملت'], [0, 'expense', 'رستوران', 300000, 'paid', 'ملت'], [0, 'expense', 'کافه', 80000],
  [0, 'expense', 'سفر شیراز', 2000000], [0, 'expense', 'اقامت هتل', 1500000], [0, 'expense', 'اسنپ', 85000], [0, 'expense', 'قبض برق', 300000],
  [0, 'expense', 'تپسی', 45000, 'unpaid'], [0, 'expense', 'دکتر', 250000, 'unpaid'], [0, 'income', 'حقوق', 9000000], [0, 'income', 'پروژه آلفا دریافتی', 4000000, 'paid', '', 'آلفا'],
  [-1, 'expense', 'بنزین', 400000, 'paid', 'ملت'], [-1, 'expense', 'رستوران', 250000], [-1, 'expense', 'کافه', 60000], [-1, 'expense', 'نان', 30000], [-1, 'expense', 'قبض آب', 120000], [-1, 'income', 'حقوق', 8000000], [-1, 'income', 'پروژه آلفا دریافتی', 3000000, 'paid', '', 'آلفا'],
  [-2, 'expense', 'بنزین', 300000, 'paid', 'ملت'], [-2, 'expense', 'رستوران', 200000], [-2, 'expense', 'سفر کیش', 3000000], [-2, 'expense', 'اقامت کیش', 2000000], [-2, 'income', 'حقوق', 8000000], [-2, 'income', 'پروژه آلفا دریافتی', 2000000, 'paid', '', 'آلفا'],
  [-3, 'expense', 'خرید لباس', 700000, 'paid', 'ملت'], [-3, 'income', 'حقوق', 7500000], [-3, 'income', 'پروژه آلفا دریافتی', 1000000, 'paid', '', 'آلفا'],
  [-5, 'expense', 'نان', 25000], [-5, 'income', 'حقوق', 7000000],
  ['m:7p', 'expense', 'سفر مشهد', 1800000], ['m:7p', 'expense', 'اقامت هتل مشهد', 1000000], ['m:7p', 'expense', 'نان', 20000], ['m:7', 'expense', 'سفر مهر', 1200000],
];
async function open(opts) {
  opts = opts || {};
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 384, height: 750 }, timezoneId: 'Asia/Tehran' });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, BASE_LS);
  const page = await ctx.newPage(); page.on('pageerror', e => errs.push(e.message));
  await page.goto(INDEX); await page.waitForTimeout(1800);
  const info = await page.evaluate((ROWS) => {
    const cy = currentYear, cm = currentMonth, t = hkMainTitle() || 'من';
    const keyOf = (off) => { if (typeof off === 'string') { const my = 7 > cm ? cy - 1 : cy; return off === 'm:7p' ? [my - 1, 7] : [my, 7]; } let y = cy, m = cm + off; while (m < 1) { m += 12; y--; } return [y, m]; };
    const store = {}; let n = 0;
    ROWS.forEach(r => { const [y, m] = keyOf(r[0]), k = periodKey(y, m); const pd = store[k] || (store[k] = (function () { const p = emptyPeriodData(); p.expense.sections = [{ id: 'E', title: t, rows: [] }]; p.income.sections = [{ id: 'I', title: t, rows: [] }]; return p; })());
      const row = { id: 'r' + (n++), day: '2', desc: r[2], amount: r[3], status: r[4] || 'paid', account: r[5] || '', deletedAt: null, createdAt: 1, updatedAt: 1 };
      if (r[6]) row.financialContext = { classification: 'third_party', accountType: 'project', ownerId: '', ownerName: '', subjectId: 'pj1', subjectName: r[6], fundingSource: 'subject', projectAmount: r[3], personalAdvanceAmount: 0 };
      pd[r[1]].sections[0].rows.push(row); try { hkCatStampRow(row, true); } catch (e) {} });
    _financialSubjects = [{ id: 'pj1', name: 'آلفا', highlightColor: 'g0' }];
    archive = {}; Object.keys(store).forEach(k => { archive[k] = store[k]; }); periodData = JSON.parse(JSON.stringify(store[periodKey(cy, cm)])); _savings = { v: 1, items: [], prices: {} };
    return { cy, cm };
  }, ROWS);
  const ask = (turns) => page.evaluate((turns) => { try { hkAsstChainReset(); } catch (e) {} _hkAsstCtx = null; try { _hkAsstPending = null; } catch (e) {}
    return turns.map(q => { const r = hkAsstAsk(q); return { q, kind: r.kind, engine: r.engine || '', tool: r.tool || '', args: (r.cmd && r.cmd.args) || null, text: String(r.text || ''), final: !!r.final, decision: r.decision || '', sug: r.suggestions || [] }; }); }, turns);
  return { page, ask, info, errs, close: () => b.close() };
}
const fa = (n) => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
const fmt = (n) => fa(Math.round(n).toLocaleString('en-US'));
/* مرجع مستقل از دستیار: جمع ردیف‌های ROWS با شرط‌ها. cy/cm از info؛ f: {tab, offs:[...], year, pred(row), status} */
function ref(info, f) {
  const cy = info.cy, cm = info.cm; let sum = 0, count = 0;
  ROWS.forEach(r => {
    let y, m; if (typeof r[0] === 'string') { const my = 7 > cm ? cy - 1 : cy; y = r[0] === 'm:7p' ? my - 1 : my; m = 7; } else { y = cy; m = cm + r[0]; while (m < 1) { m += 12; y--; } }
    if (f.tab && r[1] !== f.tab) return; if (f.year && y !== f.year) return; if (f.ym && !f.ym.some(([yy, mm]) => yy === y && mm === m)) return;
    if (f.status && (r[4] || 'paid') !== f.status) return; if (f.pred && !f.pred({ y, m, tab: r[1], desc: r[2], amount: r[3], status: r[4] || 'paid', account: r[5] || '', project: r[6] || '' })) return;
    sum += r[3]; count++;
  });
  return { sum, count };
}
const ym = (info, off) => { let y = info.cy, m = info.cm + off; while (m < 1) { m += 12; y--; } return [y, m]; };
module.exports = { open, ROWS, fmt, fa, ref, ym };

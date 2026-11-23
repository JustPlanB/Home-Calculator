// ۱.۴.۲۲ — پیمایش آرشیو: ماه جاری یک بار؛ کلید معادل یکی؛ کلید/ماه نامعتبر رد؛ fallback وقتی periodData نامعتبر است؛ محافظ‌ها حذف شده‌اند.
// فقط داده ساختگی.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
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
  await page.goto(INDEX); await page.waitForTimeout(1800);

  const R = await page.evaluate(() => {
    const cy = currentYear, cm = currentMonth, cur = periodKey(cy, cm);
    const mk = (n, tag) => { const pd = emptyPeriodData(); if (!pd.expense.sections.length) pd.expense.sections.push({ id: 'S1', title: 'T', rows: [] }); for (let i = 0; i < n; i++) pd.expense.sections[0].rows.push(Object.assign(emptyRow('expense'), { day: String(1 + i), desc: tag + i, amount: 1000 * (i + 1), status: 'paid', createdAt: 1 })); return pd; };
    const collect = () => { const out = []; iterAllPeriodData((pd, k) => { let n = 0; ['income', 'expense'].forEach(t => ((pd[t] && pd[t].sections) || []).forEach(s => n += (s.rows || []).length)); out.push({ k, n }); }); return out; };
    const o = {};
    // A: ماه جاری دو شیء متفاوت (همان مشکل بازیابی) → یک بار، با periodData
    periodData = mk(2, 'A'); archive = {}; archive[cur] = JSON.parse(JSON.stringify(periodData)); archive[cur].expense.sections[0].rows.push(Object.assign(emptyRow('expense'), { desc: 'stale', amount: 5, status: 'paid' }));
    const a = collect().filter(x => x.k === cur);
    o.A_calls = a.length; o.A_rows = a[0] ? a[0].n : -1;
    // B: periodData نامعتبر، آرشیو معتبر → از آرشیو، یک بار
    periodData = null; archive = {}; archive[cur] = mk(3, 'B');
    const bb = collect().filter(x => x.k === cur);
    o.B_calls = bb.length; o.B_rows = bb[0] ? bb[0].n : -1;
    // C: کلید معادل (کانونی و صفردار) → یک بار، کانونی برنده
    periodData = emptyPeriodData(); archive = {};
    archive['1404-6'] = mk(1, 'C1'); archive['1404-06'] = mk(4, 'C2');
    const c = collect().filter(x => x.k === '1404-6');
    o.C_calls = c.length; o.C_rows = c[0] ? c[0].n : -1;
    // D: کلید نامعتبر، ماه ۹۹، داده null، غیرشیء → رد
    periodData = emptyPeriodData(); archive = { '1405-99': mk(2, 'D'), 'abc': mk(2, 'D2'), '1405-3': null, '1405-4': 'x', '1405-5': mk(2, 'D5') };
    const d = collect();
    o.D_keys = d.map(x => x.k).sort().join('|'); o.D_bad = d.some(x => ['1405-99','abc','1405-3','1405-4'].includes(x.k));
    // E: ردیف‌های carried (همان ردیف در دو ماه) هر دو حساب شوند؛ deletedAt در پیمایش فیلتر نشود
    periodData = emptyPeriodData(); archive = { '1405-2': mk(0, 'E'), '1405-3': mk(0, 'E') };
    const dup = Object.assign(emptyRow('expense'), { desc: 'قسط', amount: 9, status: 'paid', planCarried: true });
    archive['1405-2'].expense.sections[0].rows.push(dup); archive['1405-3'].expense.sections[0].rows.push(Object.assign({}, dup));
    archive['1405-3'].expense.sections[0].rows.push(Object.assign(emptyRow('expense'), { desc: 'x', amount: 1, status: 'paid', deletedAt: 123 }));
    const e = collect(); o.E_total = e.reduce((s, x) => s + x.n, 0); o.E_calls = e.length;
    // F: نسخه‌ی ماه جاری فقط در آرشیو و periodData نامعتبر و آرشیو نامعتبر → هیچ
    periodData = null; archive = {}; archive[cur] = null;
    o.F_calls = collect().length;
    // G: آرشیو با دو کلید معادل در ماهی دیگر → یک بار
    periodData = emptyPeriodData(); archive = { '1404-6': mk(2, 'G'), '1404-06': mk(3, 'G2') };
    const g = collect().filter(x => x.k === '1404-6'); o.G_calls = g.length; o.G_rows = g[0] ? g[0].n : -1;
    // H: یک‌بار اجرای کامل با موجودی گذشته را برگردان
    periodData = emptyPeriodData(); archive = {};
    return o;
  });
  ok(R.A_calls === 1 && R.A_rows === 2, 'ماه جاری با دو شیء متفاوت: یک بار و با periodData (ردیف‌های نسخهٔ قدیمی نیامده)');
  ok(R.B_calls === 1 && R.B_rows === 3, 'periodData نامعتبر: ماه جاری از آرشیو معتبر، یک بار');
  ok(R.C_calls === 1 && R.C_rows === 1, 'کلید معادل (۶ و ۰۶) از یک ماه گذشته: یک بار و کلید کانونی برنده');
  ok(!R.D_bad && R.D_keys.indexOf('1405-5') >= 0, 'کلید نامعتبر، ماه ۹۹، null و غیرشیء رد شوند (کلیدهای دیده‌شده: ' + R.D_keys + ')');
  ok(R.E_total === 3 && R.E_calls === 3, 'carried در دو ماه هر دو حساب؛ deletedAt در پیمایش حذف نمی‌شود (جمع ' + R.E_total + ')');
  ok(R.F_calls === 0, 'هیچ منبع معتبری نیست: پیمایش خالی، بدون خطا');
  ok(R.G_calls === 1 && R.G_rows === 2, 'کلید بدون صفر و صفردار از یک ماه: یک بار و کانونی');
  const src = fs.readFileSync(path.join(__dirname, '../../src/js/09a-financial-context.js'), 'utf8');
  ok(!/pd !== periodData/.test(fs.readFileSync(path.join(__dirname, '../../src/js/15c-nice-step.js'), 'utf8')) && !/pd !== periodData/.test(src), 'محافظ‌های قدیمی حذف شده‌اند');
  ok(errs.length === 0, 'خطای صفحه ندارد ' + errs.join('|').slice(0, 120));
  console.log('batch-1418: ' + passed + ' passed, ' + failed + ' failed');
  await b.close(); process.exit(failed ? 1 : 0);
})();

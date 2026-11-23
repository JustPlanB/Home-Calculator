// ۱.۴.۲۳ — تبدیل شمارهٔ ۴: به ردیف‌های مخارج/درآمد بدون شناسه، شناسه می‌دهد؛ ردیف‌های دارای شناسه دست‌نخورده‌اند.
// فقط داده ساختگی.
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
  await page.goto(INDEX); await page.waitForTimeout(1800);

  const R = await page.evaluate(async () => {
    const o = {};
    const m4 = HK_MIGRATIONS.find(m => m.v === 4);
    o.exists = !!m4;
    const mk = (tag) => {
      const pd = emptyPeriodData();
      pd.expense.sections = [{ id: 'S1', title: 'T', rows: [
        { day: '1', desc: tag + 'a', amount: 1, status: 'paid' },
        { id: 'r_keep_' + tag, day: '2', desc: tag + 'b', amount: 2, status: 'paid' }] }];
      pd.income.sections = [{ id: 'I1', title: 'T', rows: [{ day: '3', desc: tag + 'c', amount: 3 }] }];
      return pd;
    };
    // 1: تابع مستقیم روی آرشیو ساختگی
    const arc = { '1404-6': mk('x'), '1404-7': mk('y') };
    o.ret = m4 ? m4.run(arc) : -1;
    const rows = [];
    Object.keys(arc).forEach(k => { arc[k].expense.sections[0].rows.concat(arc[k].income.sections[0].rows).forEach(r => rows.push(r)); });
    o.noIdLeft = rows.filter(r => !r.id).length;
    o.keptId = arc['1404-6'].expense.sections[0].rows[1].id === 'r_keep_x';
    o.newIdFormat = rows.filter(r => /^r_[a-z0-9]+_[a-z0-9]+$/.test(r.id)).length;
    o.uniq = new Set(rows.map(r => r.id)).size === rows.length;
    o.untouchedFields = arc['1404-6'].expense.sections[0].rows[0].amount === 1 && arc['1404-6'].expense.sections[0].rows[0].desc === 'xa';
    // 2: مسیر کامل: نسخهٔ داده ۳، آرشیوِ دارای ردیف بی‌شناسه در ماه جاری و ماه قبل
    const cur = periodKey(currentYear, currentMonth);
    const pdCur = mk('cur');
    archive = {}; archive['1404-6'] = mk('old'); archive[cur] = JSON.parse(JSON.stringify(pdCur));
    periodData = JSON.parse(JSON.stringify(pdCur));
    localStorage.setItem(HK_DATA_VER_KEY, '3');
    o.ranTo = await hkRunMigrations();
    o.verAfter = hkDataVer();
    const curRows = periodData.expense.sections[0].rows.concat(periodData.income.sections[0].rows);
    o.curNoId = curRows.filter(r => !r.id).length;
    o.curKept = periodData.expense.sections[0].rows[1].id === 'r_keep_cur';
    const oldRows = archive['1404-6'].expense.sections[0].rows.concat(archive['1404-6'].income.sections[0].rows);
    o.oldNoId = oldRows.filter(r => !r.id).length;
    // 3: دوباره اجرا نشود (نسخه به ۴ رسیده)
    o.again = await hkRunMigrations();
    return o;
  });
  console.log(JSON.stringify(R));
  ok(R.exists, 'تبدیل شمارهٔ ۴ تعریف شده');
  ok(R.ret === 4 && R.noIdLeft === 0, 'تابع: همهٔ ردیف‌های بی‌شناسه (مخارج و درآمد، دو ماه) شناسه گرفتند');
  ok(R.keptId, 'ردیف دارای شناسه دست‌نخورده ماند');
  ok(R.newIdFormat === 6 && R.uniq, 'شکل شناسه r_… و یکتا');
  ok(R.untouchedFields, 'فیلدهای دیگر ردیف تغییر نکرد');
  ok(R.ranTo === 4 && R.verAfter === 4, 'مسیر کامل: تا نسخهٔ ۴ اجرا و ذخیره شد');
  ok(R.curNoId === 0 && R.curKept, 'ماه جاری (periodData) شناسه گرفت و ردیف‌های دارای شناسه حفظ شد');
  ok(R.oldNoId === 0, 'ماه قبل در آرشیو شناسه گرفت');
  ok(R.again === 0, 'اجرای دوباره هیچ تبدیلی نمی‌کند');
  ok(errs.length === 0, 'خطای صفحه نداریم' + (errs.length ? ': ' + errs[0] : ''));
  await b.close();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

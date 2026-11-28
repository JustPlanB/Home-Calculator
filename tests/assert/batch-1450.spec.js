// ۱.۴.۴۹ — «احتمال ثبت تکراری»: «تکراری نیست» همهٔ هشدارهای همان گروه از ردیف‌های یکسان را برمی‌دارد (قبلاً فقط یک جفت؛ جفت بعدی با متن یکسان برمی‌گشت).
const { chromium } = require('playwright');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const INDEX = 'file://' + (process.env.HK_INDEX ? path.resolve(process.env.HK_INDEX) : path.join(ROOT, 'index.html'));
const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(c, m) { if (c) { passed++; console.log('  ✓ ' + m); } else { failed++; console.log('  ✗ ' + m); } }
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 384, height: 750 }, timezoneId: 'Asia/Tehran' });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, BASE_LS);
  const page = await ctx.newPage(); page.on('pageerror', e => errs.push(e.message));
  await page.goto(INDEX); await page.waitForTimeout(1800);
  const R = await page.evaluate(() => {
    const t = hkMainTitle() || 'من', o = {};
    const mk = (id, day, desc, amt, acc) => ({ id, day: String(day), time: '10:0' + id.slice(1), desc, amount: amt, status: 'paid', account: acc || '', deletedAt: null, createdAt: 1, updatedAt: 1 });
    const setRows = (rows) => { const pd = emptyPeriodData(); pd.expense.sections = [{ id: 'E', title: t, rows }]; pd.income.sections = [{ id: 'I', title: t, rows: [] }]; periodData = pd; };
    const oldAsk = window.askConfirm; window.askConfirm = function (msg, yes) { try { yes(); } catch (e) {} };
    const run = (idSel) => { const all = HKAlerts.duplicates(t); spDismissDupPrompt(t, idSel === 'first' ? all[0].id : idSel); return HKAlerts.duplicates(t); };
    localStorage.removeItem(STORAGE_KEY + '_alertsDismissed');
    setRows([mk('r1', 6, 'وام مسکن', 2200000, 'مسکن اصلی ۵۷۷۱'), mk('r2', 6, 'وام مسکن', 2200000, 'مسکن اصلی ۵۷۷۱'), mk('r3', 6, 'وام مسکن', 2200000, 'مسکن اصلی ۵۷۷۱')]);
    o.n3 = HKAlerts.duplicates(t).length; o.left3 = run('first').length;
    localStorage.removeItem(STORAGE_KEY + '_alertsDismissed');
    setRows([mk('r1', 6, 'وام مسکن', 2200000), mk('r2', 6, 'وام مسکن', 2200000), mk('r3', 6, 'وام مسکن', 2200000), mk('r4', 6, 'وام مسکن', 2200000)]);
    o.n4 = HKAlerts.duplicates(t).length; o.left4 = run('first').length;
    localStorage.removeItem(STORAGE_KEY + '_alertsDismissed');
    /* گروه جدا با مبلغ دیگر دست‌نخورده می‌ماند */
    setRows([mk('r1', 6, 'وام مسکن', 2200000), mk('r2', 6, 'وام مسکن', 2200000), mk('r3', 9, 'قبض برق', 450000), mk('r4', 9, 'قبض برق', 450000)]);
    const all = HKAlerts.duplicates(t); o.nTwoGroups = all.length; const first = all.filter(x => /مسکن/.test(x.text))[0]; spDismissDupPrompt(t, first.id);
    const after = HKAlerts.duplicates(t); o.otherGroupKept = after.length === 1 && /برق/.test(after[0].text);
    /* ماندگاری بعد از بازمحاسبه (مثل بازسازی کارت خانه) */
    o.persist = HKAlerts.duplicates(t).length === 1;
    window.askConfirm = oldAsk; return o;
  });
  ok(R.n3 === 3 && R.left3 === 0, 'سه ردیف یکسان (۳ جفت): یک «تکراری نیست» همه را برمی‌دارد (' + R.n3 + ' ← ' + R.left3 + ')');
  ok(R.n4 === 6 && R.left4 === 0, 'چهار ردیف یکسان (۶ جفت): همه با یک بار برداشته می‌شود (' + R.n4 + ' ← ' + R.left4 + ')');
  ok(R.nTwoGroups === 2 && R.otherGroupKept && R.persist, 'گروه دیگرِ ردیف‌های یکسان (مبلغ و شرح دیگر) دست‌نخورده می‌ماند و برداشتن ماندگار است');
  ok(errs.length === 0, 'بدون خطای صفحه' + (errs.length ? ' ' + errs[0] : ''));
  await b.close(); console.log('batch-1450: ' + passed + ' passed, ' + failed + ' failed'); process.exit(failed ? 1 : 0);
})();

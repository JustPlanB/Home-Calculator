// ۱.۴.۴۴ — مرحلهٔ ۲: تحلیل‌گر درخواست (hkAsstAnalyze): متن فارسی ← ساختار استاندارد؛ بدون محاسبه، بدون اثر جانبی، بدون حذف بی‌صدای شرط، با ردیابی و علامت‌گذاری وابستگی به داده.
// فقط دادهٔ ساختگی؛ تحلیل‌گر هیچ عددی حساب نمی‌کند، پس این آزمون ساختار را بررسی می‌کند نه جمع را.
const { chromium } = require('playwright');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const INDEX = 'file://' + (process.env.HK_INDEX ? path.resolve(process.env.HK_INDEX) : path.join(ROOT, 'index.html'));
const P = 'hesabKetabArchive_v5';
const BASE_LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
let failed = 0, passed = 0;
function ok(c, m) { if (c) { passed++; console.log('  ✓ ' + m); } else { failed++; console.log('  ✗ ' + m); } }
const fa = (n) => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
const fmt = (n) => fa(n.toLocaleString('en-US'));
const NUM = /[۰-۹][۰-۹,]{3,}/;
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 384, height: 750 }, timezoneId: 'Asia/Tehran' });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('__seeded', '1'); } }, BASE_LS);
  const page = await ctx.newPage(); page.on('pageerror', e => errs.push(e.message));
  await page.goto(INDEX); await page.waitForTimeout(1800);
  await page.evaluate(() => {
    const row = (id, d, a, s) => ({ id, day: '2', desc: d, amount: a, status: s || 'paid', account: '', deletedAt: null, createdAt: 1, updatedAt: 1 });
    const cy = currentYear, cm = currentMonth; let py = cy, pm = cm - 1; if (pm < 1) { pm = 12; py = cy - 1; }
    const t = hkMainTitle() || 'من';
    const mk = (e, i) => { const pd = emptyPeriodData(); pd.expense.sections = [{ id: 'E', title: t, rows: e.map((r, k) => row('e' + k, r[0], r[1], r[2])) }]; pd.income.sections = [{ id: 'I', title: t, rows: i.map((r, k) => row('i' + k, r[0], r[1], r[2])) }]; return pd; };
    const cur = mk([['بنزین', 100000], ['نان', 40000], ['دانانو', 35000], ['اسنپ', 85000], ['قبض برق', 300000], ['قبض آب', 90000], ['بیمه‌ی ماشین', 500000], ['تپسی', 45000, 'unpaid'], ['دکتر', 250000]], [['حقوق', 9000000], ['پاداش', 1000000, 'unpaid']]);
    const prev = mk([['بنزین', 400000], ['نان', 30000], ['قبض آب', 120000]], [['حقوق', 8000000]]);
    const st = (pd) => ['expense', 'income'].forEach(tb => pd[tb].sections.forEach(sc => sc.rows.forEach(r => { try { hkCatStampRow(r, true); } catch (e) {} })));
    st(cur); st(prev);
    periodData = cur; archive = {}; archive[periodKey(cy, cm)] = JSON.parse(JSON.stringify(cur)); archive[periodKey(py, pm)] = prev; _savings = { v: 1, items: [], prices: {} };
  });
  const ask = (qs) => page.evaluate((qs) => qs.map(q => { _hkAsstCtx = null; _hkAsstLastTarget = null; _hkAsstPending = null; const r = hkAsstAsk(q); return { q, kind: r.kind, decision: r.decision || '', tool: r.tool || '', args: (r.cmd && r.cmd.args) || {}, text: String(r.text || ''), sug: r.suggestions || [] }; }), qs);
  const seq = (pairs) => page.evaluate((pairs) => pairs.map(p => { _hkAsstCtx = null; _hkAsstLastTarget = null; _hkAsstPending = null; const out = []; p.forEach(q => { const r = hkAsstAsk(q); out.push({ q, kind: r.kind, decision: r.decision || '', tool: r.tool || '', args: (r.cmd && r.cmd.args) || {}, text: String(r.text || ''), sug: r.suggestions || [] }); }); return out; }), pairs);
  const an = (qs) => page.evaluate((qs) => qs.map(q => { const arr = Array.isArray(q) ? q : [q]; let prev = null, sp = null; arr.forEach(t => { sp = hkAsstAnalyze(t, { prev }); if (sp.action === 'run_tool' && sp.binding && !sp.resume) { let u = []; try { u = hkAsstUnknownTerms({ tool: sp.binding.tool, args: sp.binding.args }, false); } catch (e) {} if (u.length && arr.length > 1) sp.resume = { q: t, term: u[0] }; } prev = sp; }); return sp; }), qs);
  const S = (r) => r.slots, I = (r) => r.slots.include, X = (r) => r.slots.exclude;
  const before = await page.evaluate(() => JSON.stringify(archive) + JSON.stringify(periodData));
  // ۱) شکل خروجی و ناب‌بودن
  const ALL = ['بیشترین خرج این ماه', 'چقدر هنوز نپرداختم؟', 'برنج و نان بدون ارگانیک ماه قبل', 'خرجای کوچیک زیر ۵۰ هزار', 'خرجای کوچیک', 'برو به بخش قرض', 'تم شب', 'قسط وام یعنی وام بانک', 'قیمت دلار چنده؟', 'چقدر شد؟', 'هر دسته چقدر خرج شد؟', 'سلام', 'درآمد ماه گذشته', 'خرج ۳ ماه اخیر', 'نان و دانانو'];
  const R = await an(ALL);
  const KEYS = ['v', 'text', 'normalized', 'action', 'intent', 'operations', 'result_kind', 'tab', 'time', 'slots', 'order', 'group_by', 'compare', 'follow_up', 'clarification', 'gaps', 'app_actions', 'data_dependent', 'binding', 'trace', 'warnings', 'resume'];
  ok(R.every(r => KEYS.every(k => k in r) && r.v === 1), 'همهٔ کلیدهای ساختار استاندارد در هر خروجی هست (نسخهٔ ۱)');
  ok(R.every(r => ['run_tool', 'ask', 'refuse', 'chat', 'navigate', 'app_action'].indexOf(r.action) >= 0), 'اقدام فقط از فهرست استاندارد');
  ok(R.every(r => JSON.stringify(JSON.parse(JSON.stringify(r))) === JSON.stringify(r)), 'خروجی JSON-پذیر و بی‌تابع/بی‌ارجاع است');
  ok(R.every(r => !('sum' in r) && !('total' in r) && !('result' in r) && !('count' in r)), 'هیچ نتیجهٔ مالی (جمع/تعداد) در خروجی نیست');
  const R2 = await an(ALL);
  ok(JSON.stringify(R.map(r => [r.action, r.intent, r.slots, r.time, r.order])) === JSON.stringify(R2.map(r => [r.action, r.intent, r.slots, r.time, r.order])), 'دو بار تحلیل همان متن، همان ساختار را می‌دهد');
  // ۲) بدون اثر جانبی
  const FX = await page.evaluate(() => { const ls = JSON.stringify(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)])), th = document.documentElement.getAttribute('data-theme'); const g0 = typeof _hkAsstGuide !== 'undefined' ? _hkAsstGuide : null; const c0 = JSON.stringify(_hkAsstCtx);
    ['تم روشن', 'تم شب', 'برو به قرض', 'برو به شخصی‌سازی', 'قسط وام یعنی وام بانک', 'چطور خرج ثبت کنم؟', 'منو ببر به یادآورها'].forEach(t => hkAsstAnalyze(t));
    return { ls: ls === JSON.stringify(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)])), theme: th === document.documentElement.getAttribute('data-theme'), guide: g0 === (typeof _hkAsstGuide !== 'undefined' ? _hkAsstGuide : null), ctx: c0 === JSON.stringify(_hkAsstCtx), dry: _hkAsstDry === false, alias: !localStorage.getItem(HK_ASST_ALIAS_KEY) || JSON.parse(localStorage.getItem(HK_ASST_ALIAS_KEY)).length === 0 }; });
  ok(FX.ls && FX.theme && FX.guide && FX.ctx && FX.dry && FX.alias, 'تم/رفتن به بخش/ذخیرهٔ اصطلاح اجرا نمی‌شود؛ ذخیره‌سازی، تم، حافظهٔ گفتگو و حالت خشک سالم برمی‌گردند ' + JSON.stringify(FX));
  const N = await an(['تم شب', 'برو به بخش قرض', 'قسط وام یعنی وام بانک']);
  ok(N[0].action === 'app_action' && N[0].app_actions[0].kind === 'theme' && N[1].action === 'navigate' && N[1].app_actions[0].kind === 'navigate' && N[2].action === 'app_action' && N[2].app_actions[0].kind === 'alias', 'کارهای برنامه فقط در app_actions ثبت می‌شوند (theme / navigate / alias)');
  // ۳) نوع، عملیات، ترتیب
  const T = await an(['بیشترین خرج این ماه چی بوده؟', 'کمترین هزینه ماه قبل', 'بزرگ‌ترین هزینه چیه', 'بیشترین درآمد این ماه', 'ده تا خرج بزرگم', 'چند تا خرج داشتم؟', 'میانگین هر خرج', 'خرج این ماه چقدر شد؟', 'درآمد ماه قبل چقدره؟']);
  ok(T.slice(0, 3).every(r => r.tab === 'expense' && r.action === 'run_tool'), 'بیشترین/کمترین/بزرگ‌ترین خرج یا هزینه: tab=expense');
  ok(T[0].intent === 'max' && T[0].order.sort === 'amountDesc' && T[0].order.limit === 1 && T[1].intent === 'min' && T[1].order.sort === 'amountAsc', 'بیشترین/کمترین: ترتیب و limit');
  ok(T[3].tab === 'income' && T[4].tab === 'expense' && T[4].order.limit === 10, 'بیشترین درآمد: income؛ «ده تا خرج بزرگم»: ۱۰ هزینه');
  ok(T[5].intent === 'count' && T[5].result_kind === 'count' && T[6].intent === 'average' && T[7].intent === 'sum' && T[8].tab === 'income', 'عملیات: count/average/sum و نوع درآمد');
  // ۴) زمان استاندارد
  const Z = await an(['خرج این ماه', 'خرج ماه قبل', 'خرج ماه پیش', 'خرج دو ماه پیش', 'خرج ۳ ماه اخیر', 'خرج پارسال', 'خرج امسال', 'خرج کلاً']);
  ok(Z[0].time.rel === 'this_month' && Z[1].time.rel === 'prev_month' && Z[2].time.rel === 'prev_month' && Z[0].time.explicit, 'ماه جاری/قبل: rel استاندارد');
  ok(Z[3].time.kind === 'month' && Z[3].time.rel === null && Z[3].time.month !== Z[1].time.month, '«دو ماه پیش» ≠ ماه قبل (ماه دقیق جدا)');
  ok(Z[4].time.kind === 'range' && Z[4].slots.amount.eq === undefined && !!Z[4].time.dateFrom, '«۳ ماه اخیر» بازه است و عدد ۳ مبلغ نشد');
  ok(Z[5].time.rel === 'prev_year' && Z[6].time.rel === 'this_year' && Z[7].time.kind === 'all' && Z[7].time.explicit === false, 'سال و «همه»');
  // ۵) نفی، استثنا، واژهٔ کامل، اجتماع
  const G = await an(['خرج بدون بنزین', 'به‌جز قسط وام چقدر خرج کردم', 'هزینه‌ها بدون دستهٔ حمل‌ونقل', 'برنج و نان', 'برنج یا نان این ماه', 'بنزین و اسنپ ماه قبل', 'فقط ردیف‌های نان', 'نان چقدر شد؟', 'خوراکی و حمل‌ونقل']);
  ok(X(G[0]).terms.join() === 'بنزین' && X(G[1]).terms.join() === 'قسط وام' && !I(G[1]).cats.length, 'نفی: excludeText؛ «قسط وام» یک عبارت است و دستهٔ مثبت نمی‌شود');
  ok(X(G[2]).cats.join() === 'transport', 'بدون «دستهٔ» X: excludeCats');
  ok(I(G[3]).any_terms.join() === 'برنج,نان' && I(G[4]).any_terms.join() === 'برنج,نان' && I(G[5]).any_terms.join() === 'بنزین,اسنپ' && !I(G[5]).cats.length, '«و/یا»: اجتماع (any_terms)، نه AND و نه دستهٔ پنهان');
  ok(I(G[6]).terms.join() === 'نان' && !I(G[6]).cats.length && G[6].slots.match_mode === 'whole_word', '«فقط ردیف‌های نان»: ردیف، با تطبیق واژهٔ کامل');
  ok(I(G[7]).cats.join() === 'food' && I(G[7]).cats_via_synonym.join() === 'food' && G[7].data_dependent.indexOf('category_via_synonym:food') >= 0, '«نان» بی‌قید: دسته از راه مترادف و علامت‌گذاری وابسته به داده');
  ok(I(G[8]).cats.length === 2 && I(G[8]).cats_via_synonym.length === 0, 'نام دو دسته: هر دو، بدون برچسب مترادف');
  // ۶) مبلغ، وضعیت، صفت اندازه
  const M = await an(['خرج زیر ۵۰ هزار', 'خرج بالای ۲ میلیون', 'خرج بین ۵۰ تا ۱۰۰ هزار', 'دقیقاً ۸۵ هزار تومن خرج کردم', 'خرجای ریز زیر ۵۰ هزار', 'خرجای کوچیک', 'هزینه‌های بزرگ چقدر شد', 'چقدر هنوز نپرداختم؟', 'چقدر هنوز نگرفتم؟', 'چقدر پرداختم؟']);
  ok(M[0].slots.amount.max === 50000 && M[1].slots.amount.min === 2000000 && M[2].slots.amount.min === 50000 && M[2].slots.amount.max === 100000 && M[3].slots.amount.eq === 85000, 'مبلغ: max/min/بازه/eq');
  ok(M[4].action === 'run_tool' && M[4].slots.amount.max === 50000 && !I(M[4]).terms.length, 'صفت اندازه با مرز: شرط متنی نیست');
  ok(M[5].action === 'ask' && M[5].clarification.reason === 'vague_size' && M[5].clarification.term === 'کوچیک' && M[5].resume && M[5].resume.term === 'کوچیک' && M[6].clarification.reason === 'vague_size', 'صفت اندازهٔ بی‌مرز: سؤال vague_size با resume (کوچیک/بزرگ)');
  ok(M[7].slots.include.status === 'unpaid' && M[7].tab === 'expense' && M[8].slots.include.status === 'unpaid' && M[8].tab === 'income' && M[9].slots.include.status !== 'unpaid', '«نپرداختم»=unpaid هزینه؛ «نگرفتم»=unpaid درآمد؛ «پرداختم» مثبت');
  // ۷) ادامهٔ گفتگو و تناقض
  const F = await an([['خرج این ماه چقدر شد؟', 'فقط ردیف‌های بنزین'], ['خرج این ماه چقدر شد؟', 'بدون اسنپ'], ['خرج این ماه چقدر شد؟', 'ماه قبلش چی؟'], ['خرجای کوچیک بدون بنزین', 'زیر ۵۰ هزار'], ['خرج بدون زرتی', 'نه منظورم اسنپ بود'], ['فقط ردیف‌های بنزین', 'بدون بنزین'], 'فقط بنزین بدون بنزین', 'جمعش؟']);
  ok(F[0].follow_up.is_follow_up && F[0].follow_up.inherits.indexOf('month') >= 0 && F[0].time.rel === 'this_month' && F[0].tab === 'expense' && I(F[0]).terms.join() === 'بنزین', 'ادامه: بازه و نوع می‌ماند، فقط موجودیت عوض می‌شود');
  ok(F[1].time.rel === 'this_month' && X(F[1]).terms.join() === 'اسنپ' && F[1].follow_up.overrides.indexOf('excludeText') >= 0, 'ادامه: «بدون اسنپ» به همان سؤال اضافه می‌شود');
  ok(F[2].time.rel === 'prev_month' && F[2].tab === 'expense', 'ادامه: تغییر ماه');
  ok(F[3].action === 'run_tool' && F[3].slots.amount.max === 50000 && X(F[3]).terms.join() === 'بنزین' && F[3].tab === 'expense' && F[3].rewritten_from === 'زیر ۵۰ هزار', 'پاسخ «زیر ۵۰ هزار» به vague_size: مرز + «بدون بنزین» + نوع حفظ');
  ok(F[4].action === 'run_tool' && X(F[4]).terms.join() === 'اسنپ' && !I(F[4]).terms.length && F[4].tab === 'expense', '«نه منظورم اسنپ بود» همان واژهٔ ناشناخته را در همان جایگاه (بدون …) عوض می‌کند: «خرج بدون اسنپ»');
  ok(F[5].action === 'ask' && F[5].clarification.reason === 'contradiction' && F[6].action === 'ask' && F[6].clarification.reason === 'contradiction', 'تناقض (ادامه و تک‌جمله‌ای): ask contradiction');
  ok(F[7].action === 'ask' && F[7].clarification.reason === 'missing_scope', '«جمعش؟» بی زمینه: ask');
  // ۸) ابهام، رد و شکاف قابلیت
  const C = await an(['چقدر شد؟', 'قیمت دلار چنده؟', 'سهام بخرم یا نه؟', 'بدهی‌هام رو پرداخت کن', 'حقوق سال آینده‌ام چقدر میشه؟', 'هر دسته چقدر خرج شد؟', 'چند تا خرج داشتم و جمعشون چقدر شد؟', 'اسنپ و تپسی رو جدا بگو', 'کم‌خرج‌ترین ماهم کدومه؟', 'تراکنش‌ها رو پاک کن', 'سلام']);
  ok(C[0].action === 'ask' && C[0].clarification.reason === 'missing_scope', 'ابهام بی‌موضوع: ask');
  ok(C[1].action === 'refuse' && C[1].clarification.reason === 'market_price' && C[2].clarification.reason === 'investment_advice' && C[3].clarification.reason === 'write_operation' && C[4].clarification.reason === 'forecast_unsupported', 'بیرون از قابلیت: refuse با دلیل و gap out_of_scope/future_period');
  ok(C[1].gaps[0].code === 'out_of_scope' && C[4].gaps[0].code === 'future_period', 'gap ثبت شده');
  ok(C[5].gaps.some(g => g.code === 'group_by_category'), 'گروه‌بندی بر اساس دسته: gap');
  ok(C[6].operations.length === 2 && C[6].gaps.some(g => g.code === 'multi_part'), 'سؤال چندبخشی: operations و gap multi_part');
  ok(C[7].action === 'ask' && C[7].clarification.reason === 'capability_gap' && C[7].gaps[0].code === 'group_by_terms', 'جمع جدای هر مورد: capability_gap');
  ok(C[8].gaps.some(g => g.code === 'extreme_month') && C[9].action === 'refuse' && C[9].clarification.reason === 'write_operation' && C[10].action === 'chat', 'کم‌خرج‌ترین ماه=gap؛ «پاک کن»=refuse؛ سلام=chat');
  // ۹) ردیابی و وابستگی به داده
  ok(R.filter(r => r.action === 'run_tool').every(r => r.trace.length > 0), 'هر درخواست اجرایی ردیابی تصمیم دارد');
  ok(R[2].trace.some(t => t.slot === 'time') && R[2].trace.some(t => t.slot === 'exclude' && t.rule === 'negation_cue'), 'ردیابی: زمان و نفی با قاعده');
  // ۱۰) پایداری با/بدون داده: هر چیزی که بدون علامت «وابسته به داده» است، با و بدون داده یکسان است
  const SET = ['خرج این ماه', 'بیشترین خرج ماه قبل', 'خرج بدون بنزین', 'درآمد ماه قبل', 'خرج زیر ۵۰ هزار', 'چقدر هنوز نپرداختم؟', 'برنج و نان', 'خرجای کوچیک', 'قیمت دلار', 'برو به قرض', 'فقط ردیف‌های بنزین', 'هر دسته چقدر خرج شد؟', 'چقدر شد؟'];
  const withData = await an(SET);
  const empty = await page.evaluate((SET) => { const a = archive, p = periodData; archive = {}; periodData = emptyPeriodData(); const out = SET.map(t => hkAsstAnalyze(t)); archive = a; periodData = p; return out; }, SET);
  const sig = (r) => JSON.stringify([r.action, r.intent, r.slots, r.time, r.order, r.clarification && r.clarification.reason]);
  ok(SET.every((t, k) => withData[k].data_dependent.length > 0 || sig(withData[k]) === sig(empty[k])), 'بدون علامت وابستگی به داده، ساختار با داده و بدون داده یکسان است');
  const after = await page.evaluate(() => JSON.stringify(archive) + JSON.stringify(periodData));
  ok(before === after, 'هیچ دادهٔ مالی تغییر نکرد');
  ok(errs.length === 0, 'بدون خطای صفحه ' + errs.slice(0, 2).join('|'));
  await b.close();
  console.log('batch-1442: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();

// ۱.۴.۴۵ — مرحلهٔ ۴: محاسبهٔ قطعی (hkAsstCompute) و پاسخ فارسی (hkAsstRender) روی خروجی hkAsstMatch؛ زنجیرهٔ hkAsstChain.
// فقط دادهٔ ساختگی؛ اعداد مرجع در خود آزمون و مستقل از لایهٔ محاسبه (از روی دادهٔ ساخته‌شده) حساب می‌شوند.
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
    const row = (id, d, a, s, ac) => ({ id, day: '2', desc: d, amount: a, status: s || 'paid', account: ac || '', deletedAt: null, createdAt: 1, updatedAt: 1 });
    const cy = currentYear, cm = currentMonth; let py = cy, pm = cm - 1; if (pm < 1) { pm = 12; py = cy - 1; }
    const t = hkMainTitle() || 'من';
    const mk = (e, i) => { const pd = emptyPeriodData(); pd.expense.sections = [{ id: 'E', title: t, rows: e.map((r, k) => row('e' + k, r[0], r[1], r[2], r[3])) }]; pd.income.sections = [{ id: 'I', title: t, rows: i.map((r, k) => row('i' + k, r[0], r[1], r[2])) }]; return pd; };
    const cur = mk([['بنزین', 100000, 'paid', 'ملی'], ['نان', 40000], ['دانانو', 35000], ['اسنپ', 85000, 'paid', 'ملی'], ['قبض برق', 300000], ['قبض آب', 90000], ['بیمه‌ی ماشین', 500000], ['تپسی', 45000, 'unpaid', 'ملت'], ['دکتر', 250000], ['قسط وام', 700000], ['خوراکی ماهانه', 200000], ['هدیه', 0]], [['حقوق', 9000000], ['پاداش', 1000000, 'unpaid']]);
    const prev = mk([['بنزین', 400000], ['نان', 30000], ['قبض آب', 120000]], [['حقوق', 8000000]]);
    const st = (pd) => ['expense', 'income'].forEach(tb => pd[tb].sections.forEach(sc => sc.rows.forEach(r => { try { hkCatStampRow(r, true); } catch (e) {} })));
    st(cur); st(prev);
    periodData = cur; archive = {}; archive[periodKey(cy, cm)] = JSON.parse(JSON.stringify(cur)); archive[periodKey(py, pm)] = prev; _savings = { v: 1, items: [], prices: {} };
  });
  const fa2 = (n) => fa(n.toLocaleString('en-US'));
  const run = (qs) => page.evaluate((qs) => qs.map(q => { const st = {}; const arr = Array.isArray(q) ? q : [q]; let c; arr.forEach(t => { c = hkAsstChain(t, st); }); const a = c.answer, k = c.calc;
    return { q: arr[arr.length - 1], status: a.status, kind: a.kind, text: a.text, notes: a.notes, figures: a.figures, gaps: a.gaps, disclosed: a.disclosed, applied: a.applied, err: a.error || null, chk: hkAsstAnswerCheck(a).ok, trace: a.trace.length, calc: k && k.stats ? { sum: k.stats.sum, count: k.stats.count, avg: k.stats.avg, inc: k.stats.incomeSum, exp: k.stats.expenseSum, bal: k.stats.balance, unpaid: k.stats.unpaidSum, incomplete: k.incomplete, mixed: k.mixed, op: k.op, ext: k.extremes && k.extremes.map(e => e.rows.map(r => [r.desc, r.amount])), groups: k.groups, alts: k.alternatives } : null }; }), qs);
  const before = await page.evaluate(() => JSON.stringify(archive) + JSON.stringify(periodData) + JSON.stringify(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)])));
  const NOBAD = /NaN|undefined|null|\[object|Infinity/;
  // ۱) قرارداد و وضعیت‌های غیرمحاسباتی
  const K = await run(['خرج بدون زرتی', 'قیمت دلار چنده؟', 'سلام', 'برو به بخش قرض', 'خرج این ماه چقدر شد']);
  const AK = ['v', 'stage', 'status', 'kind', 'text', 'notes', 'suggestions', 'figures', 'applied', 'disclosed', 'gaps', 'warnings', 'app_actions', 'source', 'trace'];
  const shape = await page.evaluate((AK) => { const a = hkAsstAnswer(hkAsstMatch(hkAsstAnalyze('خرج این ماه چقدر شد'))); return { keys: AK.every(k => k in a), v: a.v === 1 && a.stage === 4, json: JSON.stringify(JSON.parse(JSON.stringify(Object.assign({}, a, { calc: null })))) === JSON.stringify(Object.assign({}, a, { calc: null })) }; }, AK);
  ok(shape.keys && shape.v && shape.json, 'قرارداد خروجی مرحلهٔ ۴: همهٔ کلیدها، v/stage، JSON-پذیر');
  ok(K[0].status === 'clarify' && K[0].kind === 'question' && K[0].calc === null && /زرتی/.test(K[0].text), 'clarify: فقط پرسش مرحلهٔ ۳؛ هیچ محاسبه‌ای');
  ok(K[1].status === 'refuse' && K[1].calc === null && !/\d|[۰-۹]/.test(K[1].text), 'refuse: بی‌عدد و بی‌محاسبه');
  ok(K[2].status === 'chat' && K[3].status === 'navigate' && K[2].calc === null && K[3].calc === null, 'chat و navigate بدون محاسبه');
  ok(K.every(r => !NOBAD.test(r.text) && r.text.length > 0 && r.chk), 'هیچ متن خالی/NaN/undefined؛ بررسی عدد سالم');
  // ۲) جمع هزینه/درآمد
  const E = 100000 + 40000 + 35000 + 85000 + 300000 + 90000 + 500000 + 45000 + 250000 + 700000 + 200000, I = 9000000 + 1000000, PE = 400000 + 30000 + 120000;
  const A = await run(['خرج این ماه چقدر شد', 'درآمد این ماه', 'خرج ماه قبل', 'درآمد ماه قبل', 'مخارج و درآمد این ماه']);
  ok(A[0].calc.sum === E && A[0].calc.count === 11 && A[0].text.indexOf(fmt(E)) >= 0 && A[0].text.indexOf('خرجت') >= 0, 'جمع هزینهٔ ماه جاری: عدد و واژهٔ «خرج»');
  ok(A[1].calc.sum === I && A[1].text.indexOf(fmt(I)) >= 0 && A[1].text.indexOf('درآمدت') >= 0, 'جمع درآمد ماه جاری');
  ok(A[2].calc.sum === PE && A[3].calc.sum === 8000000, 'ماه قبل: هزینه و درآمد جدا');
  ok(A[0].calc.unpaid === 45000 && /پرداخت‌نشده/.test(A[0].text) && A[1].calc.unpaid === 1000000 && /دریافت‌نشده/.test(A[1].text), 'سهم پرداخت‌نشده/دریافت‌نشده جدا اعلام شد');
  ok(A[4].calc.mixed && A[4].calc.inc === I && A[4].calc.exp === E && A[4].text.indexOf(fmt(E)) >= 0 && A[4].text.indexOf(fmt(I)) >= 0 && A[4].text.indexOf(fmt(I + E)) < 0 && A[4].text.indexOf(fmt(I - E)) >= 0, 'درآمد و هزینه هیچ‌گاه جمع نمی‌شوند؛ هر دو و مانده جدا');
  ok(A.slice(0, 4).every(r => /ردیف ناقص/.test(r.text) === (r.q.indexOf('درآمد') < 0 && r.q.indexOf('قبل') < 0)), 'ردیف بی‌مبلغ «هدیه» فقط در ماه و نوعی که دارد گزارش شد و شمرده نشد');
  // ۳) تعداد، میانگین، بیشترین، کمترین، فهرست، گروه
  const B = await run(['چند تا هزینه داشتم ماه جاری', 'میانگین هر خرج ماه جاری', 'بیشترین خرج ماه جاری', 'کمترین خرج ماه جاری', 'بیشترین درآمد', 'تراکنش‌های زیر ۵۰ هزار تومن ماه جاری', 'هزینه‌ها رو ماه به ماه بگو']);
  ok(B[0].calc.count === 11 && B[0].text.indexOf(fa(11)) >= 0 && B[0].figures.count === 11, 'تعداد تراکنش');
  ok(B[1].calc.avg === Math.round(E / 11) && B[1].text.indexOf(fmt(Math.round(E / 11))) >= 0, 'میانگین = جمع ÷ تعداد (بی‌مبلغ‌ها بیرون)');
  ok(B[2].calc.ext[0][0][1] === 700000 && /قسط وام/.test(B[2].text) && B[2].text.indexOf(fmt(700000)) >= 0, 'بیشترین خرج: قسط وام ۷۰۰٬۰۰۰');
  ok(B[3].calc.ext[0][0][1] === 35000 && /دانانو/.test(B[3].text), 'کمترین خرج (ردیف بی‌مبلغ شمرده نشد): دانانو ۳۵٬۰۰۰');
  ok(B[4].calc.ext[0][0][1] === 9000000 && /حقوق/.test(B[4].text), 'بیشترین درآمد در همهٔ ماه‌ها');
  ok(B[5].calc.count === 3 && B[5].calc.sum === 40000 + 35000 + 45000 && B[5].text.indexOf('«نان»') >= 0, 'فهرست زیر ۵۰ هزار: ردیف‌ها با نام');
  ok(B[6].calc.groups.length === 2 && B[6].calc.groups[0].key < B[6].calc.groups[1].key && B[6].calc.groups[1].sum === E && B[6].calc.groups[0].sum === PE, 'گروه ماه‌به‌ماه: مرتب و جمع هر ماه');
  const ties = await page.evaluate(() => { const a = periodData.expense.sections[0].rows; a.push({ id: 'tie', day: '3', desc: 'دوم قسط', amount: 700000, status: 'paid', account: '', deletedAt: null, createdAt: 1, updatedAt: 1 }); const c = hkAsstChain('بیشترین خرج ماه جاری', {}).answer; a.pop(); return { t: c.text, f: c.figures }; });
  ok(/۲ ردیف هم‌مبلغ/.test(ties.t) && /قسط وام/.test(ties.t) && /دوم قسط/.test(ties.t), 'مساوی بیشترین: همهٔ ردیف‌های هم‌مبلغ گفته می‌شود');
  // ۴) فیلترها، منفی، استثنا، مبلغ، وضعیت
  const F = await run(['خرج بدون بنزین این ماه', 'خرج به‌جز قسط وام این ماه', 'خرج بدون دستهٔ حمل‌ونقل این ماه', 'خرج زیر ۱۰۰ هزار این ماه', 'چقدر هنوز نپرداختم؟', 'فقط ردیف‌های نان این ماه', 'نان و دانانو این ماه', 'قبض برق این ماه']);
  ok(F[0].calc.sum === E - 100000 && /بدون «بنزین»/.test(F[0].text), 'نفی: بدون بنزین؛ شرط در متن آمد');
  ok(F[1].calc.sum === E - 700000 && /بدون «قسط وام»/.test(F[1].text), 'استثنای عبارت دوکلمه‌ای');
  ok(F[2].calc.sum === E - 100000 - 85000 - 45000 - 500000 && /بدون دستهٔ «حمل‌ونقل»/.test(F[2].text), 'استثنای دسته');
  ok(F[3].calc.sum === 100000 + 40000 + 35000 + 85000 + 90000 + 45000 && /حداکثر/.test(F[3].text), 'مبلغ: حداکثر ۱۰۰٬۰۰۰');
  ok(F[4].calc.sum === 45000 && /پرداخت‌نشده/.test(F[4].text) && (F[4].text.match(/پرداخت‌نشده/g) || []).length === 1, 'وضعیت پرداخت‌نشده؛ بدون تکرار جمله');
  ok(F[5].calc.sum === 40000 && F[6].calc.sum === 75000 && F[7].calc.sum === 300000, 'واژهٔ کامل («نان» ≠ «دانانو»)، اجتماع، عبارت');
  ok(F.every(r => r.chk && r.applied.length > 0), 'هر پاسخ فیلترشده شرط‌های اعمال‌شده را گزارش می‌کند (applied)');
  // ۵) خوانش جایگزین
  const D = await run(['بنزین این ماه چنده؟', 'حقوق این ماهم', 'خوراکی این ماه']);
  ok(D[0].calc.sum === 100000 + 85000 + 45000 + 500000 && D[0].calc.alts.length === 1 && D[0].calc.alts[0].sum === 100000 && /فقط ردیف‌های «بنزین»: /.test(D[0].text) && D[0].text.indexOf(fmt(100000)) >= 0, 'دستهٔ پیش‌فرض + خوانش ردیف افشا شد (عدد جدا)');
  ok(D[1].calc.sum === I && D[1].calc.alts[0].sum === 9000000 && /کل درآمد است/.test(D[1].text), 'کل درآمد + جایگزین ردیف «حقوق»');
  ok(D[2].calc.alts.length === 0 && !/نه فقط/.test(D[2].text), 'اگر جایگزینی نیست چیزی افشا نمی‌شود');
  // ۶) صفر در برابر نبود داده
  const Z = await run(['خرج پارسال', 'خرج بدون بنزین ماه قبل', 'سرچ کن گلابتون', 'فقط ردیف‌های قبض آب پارسال']);
  ok(Z[0].kind === 'empty' && /بدون داده/.test(Z[0].text) && /ثبت نشده/.test(Z[0].text), 'سال بی‌داده: «ثبت نشده / بدون داده» نه «صفر»');
  ok(Z[1].calc.sum === PE - 400000 && Z[1].status === 'answer', 'ماه قبل بدون بنزین محاسبه شد');
  ok(Z[2].kind === 'empty' && /گلابتون/.test(Z[2].text) && /پیدا نکردم/.test(Z[2].text), 'جست‌وجوی صریح بی‌نتیجه: «پیدا نکردم»');
  const Z2 = await page.evaluate(() => { const a = archive, p = periodData; const o = []; const say = (q) => hkAsstChain(q, {}).answer.text; const r0 = say('خرج این ماه'); const r1 = say('خرج بدون بنزین'); archive = {}; periodData = emptyPeriodData(); const e0 = say('خرج این ماه'); const e1 = say('سرچ کن نان'); archive = a; periodData = p; return { r0, r1, e0, e1 }; });
  ok(/هنوز هیچ ردیفی ثبت نشده/.test(Z2.e0) && /هیچ ردیفی/.test(Z2.e1), 'دادهٔ کاملاً خالی: پیام مخصوص، بی عدد ساختگی');
  const Z3 = await page.evaluate(() => { const rows = periodData.expense.sections[0].rows; const keep = rows.map(r => r.amount); rows.forEach(r => { r.amount = 0; }); const a = hkAsstChain('خرج این ماه چقدر شد', {}).answer; rows.forEach((r, i) => { r.amount = keep[i]; }); return a.text; });
  ok(/تراکنشی دارای مبلغ ثبت نشده/.test(Z3) && /ردیف.*مبلغ ندارد/.test(Z3), 'ردیف‌های موجود ولی همه بی‌مبلغ: صفر نمی‌گوید؛ دلیلش را می‌گوید');
  // ۷) شکاف و هشدار
  const G = await run(['هر دسته چقدر خرج شد؟']);
  ok(G[0].gaps.length > 0 && /نکته:/.test(G[0].text) && /بخش/.test(G[0].text), 'شکاف قابلیت پنهان نمی‌شود');
  // ۸) ادامهٔ گفتگو
  const dbg = await page.evaluate(() => { const a = periodData.expense.sections[0].rows; a.push({ id: 'tie', day: '3', desc: 'دوم قسط', amount: 700000, status: 'paid', account: '', deletedAt: null, createdAt: 1, updatedAt: 1 }); const c = hkAsstChain('بیشترین خرج ماه جاری', {}); a.pop(); const st = {}; const e = (() => { const A = archive, P = periodData; archive = {}; periodData = emptyPeriodData(); const x = hkAsstChain('سرچ کن نان', {}); archive = A; periodData = P; return x; })(); return [c.answer.text, e.answer.text, e.match.status]; });
  const Q = await run([['خرج این ماه چقدر شد؟', 'فقط ردیف‌های بنزین'], ['بنزین این ماه چقدر شد؟', 'جمعش؟'], ['خرج بدون زرتی', 'نه منظورم اسنپ بود'], ['خرجای کوچیک بدون بنزین', 'زیر ۵۰ هزار']]);
  ok(Q[0].calc.sum === 100000 && Q[1].calc.alts.length === 1 && Q[1].calc.sum === 730000, 'ادامهٔ گفتگو: فیلتر اضافه و «جمعش؟» با خوانش جایگزین');
  ok(Q[2].status === 'answer' && /بدون «اسنپ»/.test(Q[2].text) && Q[2].calc.sum === E + PE - 85000, 'پاسخ به پرسش واژهٔ ناشناخته: «بدون اسنپ»');
  ok(Q[3].status === 'answer' && Q[3].calc.sum === 40000 + 35000 + 45000 + 30000 && /بدون «بنزین»/.test(Q[3].text), 'ادامه: مرز مبلغ و «بدون بنزین» با هم');
  // ۹) سازگاری با ابزار موجود و ابزارهای تحلیلی
  const X = await page.evaluate(() => ['خرج این ماه چقدر شد', 'درآمد ماه قبل', 'خرج بدون بنزین ماه قبل', 'تراکنش‌های زیر ۵۰ هزار تومن ماه جاری'].map(q => { const c = hkAsstChain(q, {}); const t = hkAsstExec(c.match.exec.tool === 'transactions.search' ? 'transactions.search' : 'transactions.aggregate', c.match.exec.args).result; return [c.calc.stats.sum, t.sum != null ? t.sum : t.total, c.calc.stats.count, t.count]; }));
  ok(X.every(x => x[0] === x[1] && x[2] === x[3]), 'جمع/تعداد لایهٔ ۴ با ابزار خواندنیِ موجود برابر است');
  const P = await run(['موجودیم چقدره؟', 'این ماه رو با ماه قبل مقایسه کن', 'وضعیت مالیم چطوره؟']);
  ok(P.every(r => r.status === 'answer' && r.kind === 'tool' && !NOBAD.test(r.text) && r.text.length > 10), 'تحلیل/مقایسه: همان ابزار موجود؛ متن سالم');
  // ۱۰) محافظ عدد و خطا
  const Gd = await page.evaluate(() => {
    const m = hkAsstMatch(hkAsstAnalyze('خرج این ماه چقدر شد'));
    const bad = JSON.parse(JSON.stringify(m)); bad.selection.refs[0].id = 'ناموجود';
    const b1 = hkAsstAnswer(bad);
    const zero = JSON.parse(JSON.stringify(m)); zero.selection.refs = zero.selection.incomplete_refs.concat(zero.selection.refs.slice(0, 1)); const b2 = hkAsstAnswer(zero);
    const ok1 = hkAsstAnswer(m); const fake = Object.assign({}, ok1, { text: ok1.text + ' ۹۹۹۹۹ تومان' });
    const notStage3 = hkAsstAnswer({ stage: 2, status: 'ready' });
    const notReady = JSON.parse(JSON.stringify(m)); notReady.status = 'clarify'; notReady.clarification = { question: 'کدام؟' }; const b3 = hkAsstAnswer(notReady);
    return { b1: [b1.status, b1.error, /\d|[۰-۹]/.test(b1.text)], b2: [b2.status, b2.error], fake: hkAsstAnswerCheck(fake).ok, real: hkAsstAnswerCheck(ok1).ok, ns: notStage3.status, b3: [b3.status, b3.calc && b3.calc.ok] };
  });
  ok(Gd.b1[0] === 'error' && Gd.b1[1] === 'ref_missing' && !Gd.b1[2], 'مرجع ردیف ناموجود: خطا، بی‌عدد (عدد نمی‌سازد)');
  ok(Gd.b2[0] === 'error' && Gd.b2[1] === 'zero_amount_in_selection', 'ردیف بی‌مبلغ میان ردیف‌های انتخاب‌شده: محاسبه رد می‌شود');
  ok(Gd.fake === false && Gd.real === true && Gd.ns === 'error', 'محافظ عدد: عدد بی‌پشتوانه رد؛ ورودی غیر مرحلهٔ ۳ رد');
  ok(Gd.b3[0] === 'clarify' && Gd.b3[1] === false, 'status غیر ready به محاسبه نمی‌رسد');
  // ۱۱) متن مرحلهٔ ۴ فقط از match: با تغییر متن خام spec نتیجه ثابت است
  const R = await page.evaluate(() => { const m = hkAsstMatch(hkAsstAnalyze('خرج بدون بنزین این ماه')); const a = hkAsstAnswer(m); const m2 = JSON.parse(JSON.stringify(m)); m2.source.text = 'x'; const b = hkAsstAnswer(m2); return a.text === b.text; });
  ok(R, 'خروجی فقط تابع match است');
  // ۱۲) اثر جانبی
  const after = await page.evaluate(() => JSON.stringify(archive) + JSON.stringify(periodData) + JSON.stringify(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)])));
  ok(before === after, 'دادهٔ مالی، ذخیره‌سازی و حالت برنامه تغییر نکرد');
  ok(errs.length === 0, 'بدون خطای صفحه ' + errs.slice(0, 2).join('|'));
  await b.close();
  console.log('batch-1444: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();

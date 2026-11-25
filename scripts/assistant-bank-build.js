#!/usr/bin/env node
'use strict';
/* ساخت بانک دادهٔ دستیار (آموزش/ارزیابی). خروجی: data/assistant-bank/{train,dev,hard}.jsonl
   - همهٔ نمونه‌ها اصیل‌اند (قالب‌های نوشته‌شده برای این پروژه + نمونه‌های دستی)؛ هیچ داده‌ای از منبع خارجی وارد نشده است.
   - train و dev از «خانوادهٔ قالب» و واژگان جدا می‌آیند؛ hard فقط ارزیابی است و دستی نوشته شده.
   - عدد انتظار از fixture.json با scripts/assistant-bank-lib.js حساب می‌شود (نه از دستیار).
   اجرا: node scripts/assistant-bank-build.js */
const fs = require('fs'), path = require('path');
const { compute, DIR } = require('./assistant-bank-lib.js');
let seed = 20261124; const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const TOOL = { sum: 'transactions.aggregate', count: 'transactions.aggregate', average: 'transactions.aggregate', list_rows: 'transactions.search', max: 'transactions.search', min: 'transactions.search', group: 'transactions.group', compare: 'reports.compare', status: 'insights.overview', balance: 'insights.balance', savings: 'insights.savings', trend: 'insights.trend', forecast: 'insights.forecast', advice: 'insights.advice', budget: 'insights.budget', goal: 'insights.goal', daily: 'insights.daily', top: 'insights.top', anomaly: 'insights.anomaly', recurring: 'insights.recurring' };
const out = { train: [], dev: [], hard: [] }, seen = {};
let counters = { train: 0, dev: 0, hard: 0 };
const PRE = { train: 'tr', dev: 'dv', hard: 'hd' };
function add(split, family, o) {
  const text = o.text; const key = text + '|' + (o.context || []).join('>');
  if (seen[key]) return; seen[key] = split;
  const s = {
    id: PRE[split] + '-' + String(++counters[split]).padStart(4, '0'), split, lang: o.lang || 'fa', family,
    difficulty: o.difficulty || 'easy', tags: o.tags || [], context: o.context || [], text,
    intent: o.intent, action: o.action || 'run_tool', tool: o.tool !== undefined ? o.tool : (TOOL[o.intent] || null),
    args: o.args || {}, time: o.time === undefined ? null : o.time, result_kind: o.result_kind || null,
    clarification: o.clarification || null, reading: o.reading || null, expected: null,
    tool_alt: o.toolAlt || [], alt: null, capability_gap: !!o.gap, notes: o.notes || '', provenance: o.prov || 'authored-template', owner: 'original-project'
  };
  /* عدد انتظار فقط برای جمع/تعداد/میانگین/جست‌وجوی ردیف با فیلتر قابل‌محاسبه */
  if (s.action === 'run_tool' && /^transactions\.(aggregate|search)$/.test(s.tool || '') && !o.noExpected) {
    const spec = Object.assign({ time: s.time || 'all' }, s.args);
    const c = compute(spec); s.expected = { sum: c.sum, count: c.count, incomplete: c.incomplete };
    if (o.rowAlt) { const r = compute(Object.assign({ time: s.time || 'all' }, o.rowAlt)); s.expected.row_alternative = { args: o.rowAlt, sum: r.sum, count: r.count }; }
  }
  if (o.argsAlt && s.expected) { const a = compute(Object.assign({ time: s.time || 'all' }, o.argsAlt)); s.alt = { args: o.argsAlt, expected: { sum: a.sum, count: a.count } }; }
  out[split].push(s); return s;
}
const TNAME = { this_month: 'جاری', prev_month: 'قبل', all: 'همه' };
/* ---------- واژگان (train و dev جدا) ---------- */
const V = {
  train: {
    tab: { expense: ['خرج', 'هزینه‌ها'], income: ['درآمد', 'درآمدم'] },
    T: { this_month: ['این ماه', 'ماه جاری'], prev_month: ['ماه قبل', 'ماه پیش'], all: ['', 'تا حالا'] },
    Q: ['چقدر شد؟', 'چقدره؟', 'چقد شد', 'چنده؟'],
    rows: ['اسنپ', 'قبض برق', 'برنج', 'دکتر'], amb: [['بنزین', 'transport'], ['نان', 'food']],
    cats: [['خوراکی', 'food'], ['حمل‌ونقل', 'transport'], ['قبوض', 'bills']],
    nums: [20, 50, 100, 200], size: ['کوچیک', 'ریز'], fake: ['زرتی', 'گلابتون', 'قناری', 'پاپیون', 'سنجاقک']
  },
  dev: {
    tab: { expense: ['مخارج', 'خرج‌هام', 'هزینه‌هام'], income: ['دخل', 'واریزی‌هام'] },
    T: { this_month: ['همین ماه', 'این ماهم'], prev_month: ['ماه گذشته', 'ماه پیشین'], all: ['کلاً', 'در مجموع'] },
    Q: ['چقدر میشه؟', 'چقدر بود؟', 'رو بگو', 'چقد میشه؟'],
    rows: ['تپسی', 'سینما', 'قسط وام', 'قبض آب', 'دانانو', 'دارو'], amb: [],
    cats: [['سلامت', 'health'], ['تفریح', 'fun'], ['اقساط و وام', 'debt'], ['خوراکی‌ها', 'food']],
    nums: [30, 70, 150, 300], size: ['خرد', 'درشت'], fake: ['سیمرغ', 'ماهی‌قرمز', 'آبنبات', 'خودکار', 'فلانی']
  }
};
const tabs = ['expense', 'income'], times = ['this_month', 'prev_month', 'all'];
/* دستهٔ مرجع هر واژهٔ ردیف (برچسب دستی). خوانش پذیرفته: ردیف، یا دسته؛ اگر دسته انتخاب شد و عددش با ردیف فرق دارد باید عدد ردیف هم گفته شود */
const CATOF = { 'اسنپ': 'transport', 'تپسی': 'transport', 'قبض برق': 'bills', 'قبض آب': 'bills', 'برنج': 'food', 'دانانو': 'food', 'دکتر': 'health', 'دارو': 'health', 'سینما': 'fun', 'قسط وام': 'debt' };
const sp = (...p) => p.filter((x) => x !== '' && x != null).join(' ');
function gen(split) {
  const v = V[split], F = (n) => split + '.' + n;
  tabs.forEach((tab) => times.forEach((time) => {
    v.tab[tab].forEach((tw) => { v.T[time].forEach((tt) => {
      const q = pick(v.Q);
      add(split, F('sum-tab-a'), { text: sp(tt, tw, q), intent: 'sum', args: { tab }, time, result_kind: 'sum', tags: ['sum', 'time', 'tab'] });
      add(split, F('sum-tab-b'), { text: sp(tw, tt, pick(v.Q)), intent: 'sum', args: { tab }, time, result_kind: 'sum', tags: ['sum', 'time', 'tab'] });
    }); });
  }));
  /* ردیف‌های مشخص */
  v.rows.forEach((w) => times.forEach((time) => { const tt = pick(v.T[time]);
    add(split, F('sum-row'), { text: sp(w, tt, pick(v.Q)), intent: 'sum', args: { text: w }, time, result_kind: 'sum', reading: 'row_or_category', argsAlt: { cats: [CATOF[w]] }, tags: ['sum', 'row'] });
    add(split, F('only-row'), { text: sp('فقط', w, tt), intent: 'sum', args: { text: w }, time, result_kind: 'sum', reading: 'row_or_category', argsAlt: { cats: [CATOF[w]] }, tags: ['only', 'row'] });
    tabs.slice(0, 1).forEach((tab) => add(split, F('excl'), { text: sp(pick(v.tab.expense), tt, 'بدون', w), intent: 'sum', args: { tab: 'expense', excludeText: [w] }, time, result_kind: 'sum', tags: ['negation', 'row'], difficulty: 'medium' }));
    add(split, F('excl-b'), { text: sp('به‌جز', w, pick(v.tab.expense), tt, pick(v.Q)), intent: 'sum', args: { tab: 'expense', excludeText: [w] }, time, result_kind: 'sum', tags: ['negation', 'row'], difficulty: 'medium' });
  }));
  /* واژهٔ هم‌نام ردیف و دسته: پیش‌فرض دسته + عدد فقط ردیف‌ها به‌عنوان خوانش دوم */
  v.amb.forEach(([w, cat]) => times.forEach((time) => { const tt = pick(v.T[time]);
    add(split, F('ambig'), { text: sp(w, tt, pick(v.Q)), intent: 'sum', args: { cats: [cat] }, time, result_kind: 'sum', reading: 'category_default', rowAlt: { text: w }, tags: ['ambiguous', 'category-vs-row'], difficulty: 'medium', notes: 'پیش‌فرض: کل دسته؛ پاسخ باید بگوید کل دسته است و عدد فقط ردیف‌ها را هم بدهد' });
    add(split, F('row-cue'), { text: sp('فقط ردیف‌های', w, tt), intent: 'sum', args: { text: w }, time, result_kind: 'sum', reading: 'row', tags: ['row-cue', 'category-vs-row'], difficulty: 'medium' });
  }));
  v.cats.forEach(([cn, cat]) => times.forEach((time) => { const tt = pick(v.T[time]);
    add(split, F('cat'), { text: sp(cn, tt, pick(v.Q)), intent: 'sum', args: { cats: [cat] }, time, result_kind: 'sum', reading: 'category', tags: ['category'] });
    add(split, F('cat-total'), { text: sp('کل', cn, tt), intent: 'sum', args: { cats: [cat] }, time, result_kind: 'sum', reading: 'category', tags: ['category'] });
    add(split, F('cat-word'), { text: sp('دستهٔ', cn, pick(v.Q)), intent: 'sum', args: { cats: [cat] }, time: 'all', result_kind: 'sum', reading: 'category', tags: ['category', 'cat-vs-group'], difficulty: 'medium' });
  }));
  /* و / یا */
  for (let i = 0; i < v.rows.length; i++) for (let j = i + 1; j < v.rows.length && j < i + 3; j++) {
    const a = v.rows[i], b = v.rows[j], time = pick(times), tt = pick(v.T[time]);
    add(split, F('union-and'), { text: sp(a, 'و', b, tt, pick(v.Q)), intent: 'sum', args: { textAny: [a, b] }, time, result_kind: 'sum', reading: 'union', tags: ['union', 'and'], difficulty: 'medium' });
    add(split, F('union-or'), { text: sp(a, 'یا', b, tt), intent: 'sum', args: { textAny: [a, b] }, time, result_kind: 'sum', reading: 'union', tags: ['union', 'or'], difficulty: 'medium' });
  }
  /* مبلغ */
  v.nums.forEach((n) => times.forEach((time) => { const tw = pick(v.tab.expense), tt = pick(v.T[time]);
    add(split, F('amt-lt'), { text: sp(tw, tt, 'زیر', n, 'هزار'), intent: 'sum', args: { tab: 'expense', amountMax: n * 1000 }, time, result_kind: 'sum', tags: ['amount'] });
    add(split, F('amt-gt'), { text: sp(tw, tt, 'بالای', n, 'هزار'), intent: 'sum', args: { tab: 'expense', amountMin: n * 1000 }, time, result_kind: 'sum', tags: ['amount'] });
  }));
  v.size.forEach((sz) => v.nums.slice(0, 2).forEach((n) => {
    const big = /درشت/.test(sz);
    add(split, F('size-bound'), { text: sp(pick(v.tab.expense), sz, big ? 'بالای' : 'زیر', n, 'هزار'), intent: 'sum', args: big ? { tab: 'expense', amountMin: n * 1000 } : { tab: 'expense', amountMax: n * 1000 }, time: 'all', result_kind: 'sum', tags: ['amount', 'size-adjective'], difficulty: 'medium', notes: 'صفت اندازه با مرز مبلغ شرط نیست' });
  }));
  /* شمارش و میانگین و کم/زیاد */
  times.forEach((time) => { const tt = pick(v.T[time]);
    add(split, F('count'), { text: sp('چند تا', pick(['هزینه', 'خرج']) + ' داشتم', tt), intent: 'count', args: { tab: 'expense' }, time, result_kind: 'count', tags: ['count'] });
    add(split, F('count-b'), { text: sp('تعداد تراکنش‌های', pick(['خرج', 'هزینه']), tt), intent: 'count', args: { tab: 'expense' }, time, result_kind: 'count', tags: ['count'] });
    add(split, F('avg'), { text: sp('میانگین هر', pick(['خرج', 'هزینه']), tt), intent: 'average', args: { tab: 'expense' }, time, result_kind: 'avg', tags: ['average'] });
    add(split, F('max'), { text: sp('بیشترین', pick(['خرج', 'هزینه']), tt, pick(['چی بوده؟', 'کدومه؟'])), intent: 'max', args: { tab: 'expense', sort: 'amountDesc', limit: 1 }, time, result_kind: 'rows', tags: ['extreme'], noExpected: true });
    add(split, F('min'), { text: sp('کمترین', pick(['خرج', 'هزینه']), tt, pick(['چی بوده؟', 'کدومه؟'])), intent: 'min', args: { tab: 'expense', sort: 'amountAsc', limit: 1 }, time, result_kind: 'rows', tags: ['extreme'], noExpected: true });
  });
  add(split, F('unpaid'), { text: split === 'train' ? 'چقدر هنوز نپرداختم؟' : 'پرداخت‌نشده‌هام چقدره؟', intent: 'sum', args: { tab: 'expense', status: 'unpaid' }, time: 'all', result_kind: 'sum', tags: ['unpaid'] });
  add(split, F('unpaid-inc'), { text: split === 'train' ? 'چقدر هنوز نگرفتم؟' : 'درآمد دریافت‌نشده‌ام چقدره؟', intent: 'sum', args: { tab: 'income', status: 'unpaid' }, time: 'all', result_kind: 'sum', tags: ['unpaid'] });
  /* ابزارهای تحلیلی (بدون عدد انتظار؛ فقط برچسب ابزار) */
  const AN = split === 'train' ? [
    ['status', 'وضعیت مالیم چطوره؟'], ['status', 'دخل و خرجم چطوره؟'], ['balance', 'موجودیم چقدره؟'], ['balance', 'تو حسابم چقدر پوله؟'], ['savings', 'چقدر پس‌انداز کردم؟'],
    ['forecast', 'آخر ماه چقدر خرج می‌کنم؟'], ['advice', 'چطور کمتر خرج کنم؟'], ['daily', 'روزی چقدر می‌تونم خرج کنم؟'], ['top', 'پولم بیشتر کجا رفته؟'], ['trend', 'روند خرجم چطوره؟'],
    ['budget', 'بودجه‌م چطوره؟'], ['anomaly', 'خرج عجیب داشتم؟'], ['recurring', 'خرج‌های ثابتم چیه؟'],
    ['status', 'اوضاع مالیم چطوره؟'], ['balance', 'پولم چقدره؟'], ['savings', 'پس‌اندازم چقدر شد؟'], ['forecast', 'تا آخر ماه چقدر خرج می‌کنم؟'], ['advice', 'یه نصیحت مالی بکن'], ['top', 'بیشترین خرجم کجاست؟'], ['trend', 'خرجم دارم بالا میره؟'], ['daily', 'امروز چقدر می‌تونم خرج کنم؟'], ['budget', 'بودجه ماهانه‌م چقدره؟'], ['anomaly', 'خرج غیرعادی دارم؟'], ['recurring', 'خرج‌های تکراریم چیا هستن؟'], ['savings', 'ماه پیش چقدر ذخیره کردم؟']
  ] : [
    ['status', 'حال و روز مالیم چطوره؟'], ['status', 'اوضاع مالی این ماه؟'], ['balance', 'الان چقدر موجودی دارم؟'], ['savings', 'این ماه چقدر ذخیره کردم؟'], ['forecast', 'پیش‌بینی خرج تا آخر ماه؟'],
    ['advice', 'یه توصیه برای خرجم بده'], ['daily', 'سقف خرج روزانه‌م چقدره؟'], ['top', 'بیشترین خرجم تو کدوم دسته‌ست؟'], ['trend', 'خرجم بالا رفته یا پایین؟'], ['budget', 'بودجه‌بندی ماهانه‌م رو بگو'],
    ['anomaly', 'خرج غیرعادی داشتم؟'], ['recurring', 'خرج‌های تکراری‌م کدومان؟'],
    ['balance', 'تو حساب‌هام چقدر هست؟'], ['savings', 'پس‌انداز ماه گذشته‌م؟'], ['status', 'وضعیت دخل و خرجم؟'], ['advice', 'چطور هزینه‌هام رو کم کنم؟'], ['trend', 'روند هزینه‌هام چطوره؟'], ['top', 'پول بیشتر تو کدوم دسته رفته؟'], ['forecast', 'آخر این ماه چقدر خرج کرده‌ام؟'], ['daily', 'روزانه چقدر مجازم خرج کنم؟'], ['budget', 'بودجه‌ام کافیه؟']
  ];
  AN.forEach(([intent, text]) => add(split, F('analytic-' + intent), { text, intent, args: {}, time: null, tags: ['analytic', intent], noExpected: true, toolAlt: intent === 'daily' ? ['insights.budget'] : intent === 'forecast' ? ['insights.daily'] : intent === 'budget' ? ['insights.daily'] : [] }));
  add(split, F('compare'), { text: split === 'train' ? 'این ماه رو با ماه قبل مقایسه کن' : 'خرج این ماه نسبت به ماه پیش چطوره؟', intent: 'compare', args: {}, time: null, tags: ['compare'], noExpected: true });
  add(split, F('group-month'), { text: split === 'train' ? 'هزینه‌ها رو ماه به ماه بگو' : 'خرج هر ماه جدا جدا', intent: 'group', args: { by: 'month', tab: 'expense' }, time: 'all', tags: ['group'], noExpected: true });
  add(split, F('group-tab'), { text: split === 'train' ? 'درآمد و هزینه رو جدا کن' : 'درآمد و خرج رو از هم تفکیک کن', intent: 'group', args: { by: 'tab' }, time: 'all', tags: ['group'], noExpected: true });
  add(split, F('group-cat'), { text: split === 'train' ? 'هر دسته چقدر خرج شد؟' : 'خرج به تفکیک دسته', intent: 'top', tool: 'insights.top', args: {}, time: null, gap: true, tags: ['group', 'category-breakdown'], difficulty: 'medium', noExpected: true, notes: 'ابزار دقیق «گروه‌بندی بر اساس دسته» نیست: transactions.group فقط by=month|tab|section دارد؛ insights.top نزدیک‌ترین است' });
  /* سؤال‌های تکمیلی لازم (ask) */
  v.fake.forEach((w) => {
    const tw = pick(v.tab.expense), tt = pick(v.T.this_month);
    add(split, F('ask-unknown-neg'), { text: sp(tw, 'بدون', w), intent: 'clarify', action: 'ask', tool: null, clarification: { reason: 'unknown_term', term: w }, tags: ['unknown', 'negation'], difficulty: 'medium' });
    add(split, F('ask-unknown-only'), { text: sp('فقط', w, tt), intent: 'clarify', action: 'ask', tool: null, clarification: { reason: 'unknown_term', term: w }, tags: ['unknown'], difficulty: 'medium' });
    add(split, F('ask-unknown-plain'), { text: sp(tw, w, tt), intent: 'clarify', action: 'ask', tool: null, clarification: { reason: 'unknown_term', term: w }, tags: ['unknown'], difficulty: 'medium' });
  });
  v.size.forEach((sz) => {
    add(split, F('ask-size'), { text: sp(pick(v.tab.expense), sz, pick(v.Q)), intent: 'clarify', action: 'ask', tool: null, clarification: { reason: 'vague_size', term: sz }, tags: ['vague', 'size-adjective'], difficulty: 'medium' });
    add(split, F('ask-size-neg'), { text: sp(pick(v.tab.expense), sz, 'بدون', pick(v.rows)), intent: 'clarify', action: 'ask', tool: null, clarification: { reason: 'vague_size', term: sz }, tags: ['vague', 'negation'], difficulty: 'hard' });
  });
  (split === 'train' ? ['چقدر شد؟', 'جمعش؟', 'چقد؟'] : ['چقدر میشه؟', 'اونو بگو', 'بیشتر؟']).forEach((t) => add(split, F('ask-scope'), { text: t, intent: 'clarify', action: 'ask', tool: null, clarification: { reason: 'missing_scope' }, tags: ['vague', 'no-context'] }));
  /* گفتگو و رد کردن */
  (split === 'train' ? ['سلام', 'ممنون', 'تو کی هستی؟', 'چه کارایی بلدی؟'] : ['درود', 'مرسی', 'اسمت چیه؟', 'چطور ازت استفاده کنم؟']).forEach((t) => add(split, F('chat'), { text: t, intent: 'chat', action: 'chat', tool: null, tags: ['chat'] }));
  (split === 'train'
    ? [['قیمت دلار امروز چنده؟', 'market_price'], ['سهام بخرم یا نه؟', 'investment_advice'], ['این خرج رو ثبت کن', 'write_operation'], ['تراکنش‌های این ماه رو پاک کن', 'write_operation'], ['فردا هوا بارونیه؟', 'out_of_domain']]
    : [['ارزش بیت‌کوین الان چنده؟', 'market_price'], ['کدوم سهم رو بخرم؟', 'investment_advice'], ['یه ردیف تازه اضافه کن', 'write_operation'], ['بدهی‌هام رو پرداخت کن', 'write_operation'], ['امروز چه روزیه تو تقویم قمری؟', 'out_of_domain']])
    .forEach(([t, r]) => add(split, F('refuse'), { text: t, intent: 'refuse', action: 'refuse', tool: null, clarification: { reason: r }, tags: ['refuse', r], difficulty: 'medium' }));
  (split === 'train' ? [['برو به قسمت قرض‌ها', 'ledger'], ['باز کن یادآورها رو', 'reminders'], ['ببر به پس‌انداز', 'savings']] : [['منو ببر به بخش دنگ', 'dong'], ['بازش کن آمار رو', 'stats'], ['برو به شخصی‌سازی', 'personalize']])
    .forEach(([t, g]) => add(split, F('nav'), { text: t, intent: 'navigate', action: 'navigate', tool: null, args: { target: g }, tags: ['navigate'], notes: 'مقصدها: شخصی‌سازی، قرض، دنگ، یادآورها، پس‌انداز، آمار (پیام راهنمای خود دستیار)؛ فهرست رسمی جدا نیست' }));
  /* ادامهٔ مکالمه */
  const follow = [
    ['فقط ردیف‌های X', (w) => sp('فقط ردیف‌های', w)], ['بدون X', (w) => sp('بدون', w)]
  ];
  const base = split === 'train' ? ['خرج این ماه چقدر شد؟', 'خرج ماه قبل چقدر شد؟'] : ['مخارج همین ماه چقدر بود؟', 'مخارج ماه گذشته رو بگو'];
  base.forEach((b, bi) => { const time = bi === 0 ? 'this_month' : 'prev_month';
    v.rows.slice(0, 3).forEach((w) => {
      add(split, F('fu-row'), { context: [b], text: sp('فقط ردیف‌های', w), intent: 'sum', args: { tab: 'expense', text: w }, time, result_kind: 'sum', tags: ['follow-up', 'row', 'keep-period'], difficulty: 'hard' });
      add(split, F('fu-excl'), { context: [b], text: sp('بدون', w), intent: 'sum', args: { tab: 'expense', excludeText: [w] }, time, result_kind: 'sum', tags: ['follow-up', 'negation', 'keep-period'], difficulty: 'hard' });
    });
    if (bi === 0) add(split, F('fu-time'), { context: [b], text: split === 'train' ? 'ماه قبلش چی؟' : 'ماه قبل چطور؟', intent: 'sum', args: { tab: 'expense' }, time: 'prev_month', result_kind: 'sum', tags: ['follow-up', 'time'], difficulty: 'hard' });
    add(split, F('fu-sum'), { context: [b], text: 'جمعش؟', intent: 'sum', args: { tab: 'expense' }, time, result_kind: 'sum', tags: ['follow-up', 'anaphora'], difficulty: 'hard' });
  });
}
gen('train'); gen('dev');
/* افزایش نمونه با تنوع محاوره‌ای که برچسب را عوض نمی‌کند (فقط پیش‌گفتار و املای عامیانهٔ امن)؛ train و dev هر کدام با پیش‌گفتار خودشان */
const FILL = { train: ['آقا', 'ببخشید', 'لطفاً', 'یه سؤال'], dev: ['داداش', 'راستی', 'می‌خواستم بدونم'] };
const SPELL = [['چقدر', 'چقد'], ['چقد', 'چقدر'], ['میشه', 'می‌شه'], ['می‌شه', 'میشه']];
function augment(split, copiesFor) {
  const base = out[split].slice();
  base.forEach((b) => {
    const copies = copiesFor(b);
    for (let c = 0; c < copies; c++) {
      let t = b.text;
      if (c % 2 === 0 || rnd() < 0.4) t = pick(FILL[split]) + ' ' + t;
      if (c % 3 === 1) { const ws = t.split(' '); const idx = ws.map((w, k) => SPELL.some(([x]) => w.replace(/[؟?]$/, '') === x) ? k : -1).filter((k) => k >= 0); if (idx.length) { const k = pick(idx), w = ws[k], q = /[؟?]$/.test(w) ? w.slice(-1) : '', core = w.replace(/[؟?]$/, ''); ws[k] = pick(SPELL.filter(([x]) => x === core))[1] + q; t = ws.join(' '); } }
      if (t === b.text) continue;
      add(split, b.family + '.aug', { text: t, context: b.context, intent: b.intent, action: b.action, tool: b.tool, args: b.args, time: b.time, result_kind: b.result_kind, clarification: b.clarification, reading: b.reading, tags: b.tags.concat(['augmented']), difficulty: b.difficulty, notes: b.notes, gap: b.capability_gap, rowAlt: b.expected && b.expected.row_alternative ? b.expected.row_alternative.args : null, argsAlt: b.alt ? b.alt.args : null, toolAlt: b.tool_alt, noExpected: !b.expected });
    }
  });
}
augment('train', (b) => (b.intent === 'sum' && b.action === 'run_tool' ? 1 : b.action === 'run_tool' && /^transactions\./.test(b.tool || '') ? 2 : 6));
/* ---------- hard: دستی (فقط ارزیابی) ---------- */
const H = (t, o) => add('hard', 'hard.manual', Object.assign({ text: t, difficulty: 'hard', prov: 'authored-manual' }, o));
/* نان و دانانو: تطبیق واژهٔ کامل */
H('فقط ردیف‌های نان این ماه', { intent: 'sum', args: { text: 'نان' }, time: 'this_month', result_kind: 'sum', reading: 'row', tags: ['whole-word', 'category-vs-row'], notes: 'ردیف «دانانو» نباید شمرده شود (۴۰٬۰۰۰ نه ۷۵٬۰۰۰)' });
H('دانانو این ماه چقدر شد؟', { intent: 'sum', args: { text: 'دانانو' }, time: 'this_month', result_kind: 'sum', tags: ['whole-word'] });
H('خرج بدون نان این ماه', { intent: 'sum', args: { tab: 'expense', excludeText: ['نان'] }, time: 'this_month', result_kind: 'sum', tags: ['whole-word', 'negation'], notes: 'دانانو در جمع می‌ماند' });
H('نان و دانانو چقدر شد؟', { intent: 'sum', args: { textAny: ['نان', 'دانانو'] }, time: 'all', result_kind: 'sum', reading: 'union', tags: ['whole-word', 'union'] });
H('نان ماه پیش چقدر شد؟', { intent: 'sum', args: { cats: ['food'] }, time: 'prev_month', result_kind: 'sum', reading: 'category_default', rowAlt: { text: 'نان' }, tags: ['ambiguous', 'whole-word'] });
H('نانی که خریدم چقدر شد؟', { intent: 'sum', args: { text: 'نان' }, time: 'all', result_kind: 'sum', tags: ['whole-word', 'colloquial'], notes: 'فعل «خریدم» شرط نیست؛ «نان» ردیف است' });
/* دسته‌بندی از معنا/شرح ردیف */
H('پول دارو و دکتر چقدر شد؟', { intent: 'sum', args: { textAny: ['دارو', 'دکتر'] }, time: 'all', result_kind: 'sum', reading: 'union', tags: ['category-from-description', 'union'] });
H('خرج سلامتی این ماه', { intent: 'sum', args: { cats: ['health'] }, time: 'this_month', result_kind: 'sum', reading: 'category', tags: ['category-from-description'] });
H('چقدر خرج درمان کردم؟', { intent: 'sum', args: { cats: ['health'] }, time: 'all', result_kind: 'sum', reading: 'category', tags: ['category-from-description'], notes: '«درمان» مترادف دستهٔ سلامت؛ در داده ردیفی به این نام نیست' });
H('داروخانه رفتم چقدر شد؟', { intent: 'sum', args: { cats: ['health'] }, time: 'all', result_kind: 'sum', reading: 'category', tags: ['category-from-description', 'colloquial'] });
H('کرایه تاکسی و اسنپ این ماه', { intent: 'sum', args: { cats: ['transport'] }, time: 'this_month', result_kind: 'sum', reading: 'category', tags: ['category-from-description'], notes: 'در داده ردیف «کرایه تاکسی» نیست؛ دسته حمل‌ونقل' });
H('برای تفریح چقدر پول دادم؟', { intent: 'sum', args: { cats: ['fun'] }, time: 'all', result_kind: 'sum', reading: 'category', tags: ['category-from-description'] });
H('قسط هام چقدره', { intent: 'sum', args: { cats: ['debt'] }, time: 'all', result_kind: 'sum', reading: 'category', tags: ['category-from-description', 'colloquial'] });
/* بازه */
H('پارسال چقدر خرج کردم؟', { intent: 'sum', args: { tab: 'expense' }, time: 'unavailable', result_kind: 'sum', tags: ['time', 'no-data'], notes: 'دادهٔ سال قبل در fixture نیست؛ پاسخ درست «ثبت نشده» است نه عدد/حدس' });
H('دو ماه پیش چقدر خرج کردم؟', { intent: 'sum', args: { tab: 'expense' }, time: 'unavailable', result_kind: 'sum', tags: ['time', 'no-data'], notes: 'دو ماه پیش ≠ ماه قبل؛ در fixture نیست' });
H('خرج ۳ ماه اخیر', { intent: 'sum', args: { tab: 'expense' }, time: 'all', result_kind: 'sum', tags: ['time', 'range'], notes: 'fixture فقط دو ماه دارد؛ جمع دو ماه' });
/* نفی و استثنا */
H('غیر از قسط وام و دکتر خرجم چقدره؟', { intent: 'sum', args: { tab: 'expense', excludeText: ['قسط وام', 'دکتر'] }, time: 'all', result_kind: 'sum', tags: ['negation', 'multi-word'], notes: 'قسط وام عبارتی چندواژه‌ای است' });
H('هزینه‌ها به‌جز قبض آب ماه قبل', { intent: 'sum', args: { tab: 'expense', excludeText: ['قبض آب'] }, time: 'prev_month', result_kind: 'sum', tags: ['negation', 'multi-word'] });
H('بدون هیچ شرطی خرج این ماه', { intent: 'sum', args: { tab: 'expense' }, time: 'this_month', result_kind: 'sum', tags: ['negation'], notes: '«هیچ شرطی» یعنی بدون استثنا' });
H('خرج ماه قبل به استثنای اسنپ', { intent: 'sum', args: { tab: 'expense', excludeText: ['اسنپ'] }, time: 'prev_month', result_kind: 'sum', tags: ['negation'] });
H('هر چیزی جز حقوق', { intent: 'sum', args: { excludeText: ['حقوق'] }, time: 'all', result_kind: 'sum', tags: ['negation', 'no-tab'], notes: 'نوع مشخص نیست: درآمد+هزینه؛ پاسخ مفید سه خط درآمد/هزینه/مانده' });
H('فقط بنزین بدون بنزین', { intent: 'clarify', action: 'ask', tool: null, clarification: { reason: 'contradiction', term: 'بنزین' }, tags: ['negation', 'contradiction'] });
/* جمع و تعداد */
H('چند تا خرج داشتم و جمعشون چقدر شد؟', { intent: 'sum', args: { tab: 'expense' }, time: 'all', result_kind: 'sum', tags: ['multi-part', 'count', 'sum'], notes: 'سؤال دوبخشی: تعداد ۱۱ و جمع؛ دستیار یک ابزار در هر نوبت اجرا می‌کند', gap: true, noExpected: true });
H('تعداد تراکنش‌های ماه قبل و جمع درآمدش', { intent: 'count', args: {}, time: 'prev_month', result_kind: 'count', tags: ['multi-part'], gap: true, noExpected: true });
H('چند تا اسنپ سوار شدم؟', { intent: 'count', args: { text: 'اسنپ' }, time: 'all', result_kind: 'count', tags: ['count', 'row'] });
H('میانگین خرج‌های ماه قبل', { intent: 'average', args: { tab: 'expense' }, time: 'prev_month', result_kind: 'avg', tags: ['average'] });
H('جمع کل چقدره؟', { intent: 'clarify', action: 'ask', tool: null, clarification: { reason: 'missing_scope' }, tags: ['vague'], notes: 'درآمد و هزینه با هم عددی بی‌معناست' });
/* بیشترین/کمترین */
H('گران‌ترین خرج این ماه چی بوده؟', { intent: 'max', args: { tab: 'expense', sort: 'amountDesc', limit: 1 }, time: 'this_month', result_kind: 'rows', tags: ['extreme'], noExpected: true });
H('ارزون‌ترین ردیف ماه قبل', { intent: 'min', args: { tab: 'expense', sort: 'amountAsc', limit: 1 }, time: 'prev_month', result_kind: 'rows', tags: ['extreme'], noExpected: true });
H('سه تا خرج بزرگم', { intent: 'max', args: { tab: 'expense', sort: 'amountDesc', limit: 3 }, time: 'all', result_kind: 'rows', tags: ['extreme', 'count-quantifier'], noExpected: true });
H('هزینه‌های بزرگ چقدر شد؟', { intent: 'clarify', action: 'ask', tool: null, clarification: { reason: 'vague_size', term: 'بزرگ' }, tags: ['vague', 'size-adjective'], notes: '«بزرگ» بی‌شمارنده = صفت اندازه، نه «بیشترین»' });
H('خرج کوچیک‌ها چقدر شد؟', { intent: 'clarify', action: 'ask', tool: null, clarification: { reason: 'vague_size', term: 'کوچیک' }, tags: ['vague', 'size-adjective'] });
/* مبهم و نامعتبر */
H('پولم کم شده؟', { intent: 'trend', args: {}, time: null, tags: ['vague', 'colloquial'], noExpected: true, notes: 'قابل‌تفسیر: روند/موجودی؛ دستیار می‌تواند فرض را در جمله اول بگوید' });
H('اون خرجه بود که دیروز کردم، چنده؟', { intent: 'clarify', action: 'ask', tool: null, clarification: { reason: 'missing_scope' }, tags: ['vague', 'no-context'] });
H('همه چی', { intent: 'clarify', action: 'ask', tool: null, clarification: { reason: 'missing_scope' }, tags: ['vague'] });
H('خرج بدون زرتی و گلابتون', { intent: 'clarify', action: 'ask', tool: null, clarification: { reason: 'unknown_term', term: 'زرتی' }, tags: ['unknown', 'negation'] });
H('بنزین و گلابتون چقدر شد', { intent: 'clarify', action: 'ask', tool: null, clarification: { reason: 'unknown_term', term: 'گلابتون' }, tags: ['unknown', 'union'] });
H('حقوق سال آینده‌ام چقدر میشه؟', { intent: 'refuse', action: 'refuse', tool: null, clarification: { reason: 'forecast_unsupported' }, tags: ['refuse'], notes: 'پیش‌بینی سال بعد روی دادهٔ ثبت‌نشده؛ نباید «۰» یا عدد ساخته شود' });
H('شماره کارتم چیه؟', { intent: 'refuse', action: 'refuse', tool: null, clarification: { reason: 'out_of_domain' }, tags: ['refuse', 'privacy'] });
H('کدوم بانک نرخ وام بهتری داره؟', { intent: 'refuse', action: 'refuse', tool: null, clarification: { reason: 'out_of_domain' }, tags: ['refuse'] });
/* ادامه */
H('جمعش؟', { context: ['بنزین ماه قبل چقدر شد؟'], intent: 'sum', args: { cats: ['transport'] }, time: 'prev_month', result_kind: 'sum', reading: 'category_default', tags: ['follow-up', 'anaphora'], rowAlt: { text: 'بنزین' } });
H('نه منظورم اسنپ بود', { context: ['خرج بدون زرتی'], intent: 'sum', args: { tab: 'expense', excludeText: ['اسنپ'] }, time: 'all', result_kind: 'sum', tags: ['follow-up', 'correction'], difficulty: 'hard', notes: 'جایگزینی واژهٔ ناشناخته با پاسخ کاربر' });
H('فقط ردیف‌های بنزین', { context: ['خرج این ماه چقدر شد؟', 'بدون اسنپ'], intent: 'sum', args: { tab: 'expense', text: 'بنزین', excludeText: ['اسنپ'] }, time: 'this_month', result_kind: 'sum', tags: ['follow-up', 'keep-period', 'keep-negation'] });
H('ماه قبلش؟', { context: ['برنج و نان این ماه'], intent: 'sum', args: { textAny: ['برنج', 'نان'] }, time: 'prev_month', result_kind: 'sum', reading: 'union', tags: ['follow-up', 'time', 'union'] });
H('زیر ۵۰ هزار', { context: ['خرجای کوچیک بدون بنزین'], intent: 'sum', args: { tab: 'expense', amountMax: 50000, excludeText: ['بنزین'] }, time: 'all', result_kind: 'sum', tags: ['follow-up', 'size-adjective', 'negation'], difficulty: 'hard' });
/* دو زبانه (نمونهٔ انگلیسی/ترکیبی؛ فقط ارزیابی) */
H('how much did I spend this month?', { lang: 'en', intent: 'sum', args: { tab: 'expense' }, time: 'this_month', result_kind: 'sum', tags: ['english'], notes: 'دستیار فارسی است؛ انگلیسی خارج از دامنهٔ فعلی' });
H('spending on food last month', { lang: 'en', intent: 'sum', args: { cats: ['food'], tab: 'expense' }, time: 'prev_month', result_kind: 'sum', tags: ['english'] });
H('خرج Snapp این ماه', { lang: 'mixed', intent: 'sum', args: { text: 'اسنپ' }, time: 'this_month', result_kind: 'sum', tags: ['mixed-script'], notes: 'نام لاتینی برند؛ نگاشت به «اسنپ» حدس است' , action: 'ask', tool: null, clarification: { reason: 'unknown_term', term: 'Snapp' } });
/* ادامهٔ سخت‌ها */
H('قبض برق رو بگو', { intent: 'sum', args: { text: 'قبض برق' }, time: 'all', result_kind: 'sum', tags: ['multi-word', 'category-vs-row'], notes: 'عبارت نام یک ردیف است؛ نه کل دستهٔ قبوض (قبض آب هم دارد)' });
H('قبض‌ها رو بگو', { intent: 'sum', args: { cats: ['bills'] }, time: 'all', result_kind: 'sum', reading: 'category', tags: ['category'] });
H('قبظ برق چقدر شد', { intent: 'sum', args: { text: 'قبض برق' }, time: 'all', result_kind: 'sum', tags: ['typo', 'multi-word'], notes: 'غلط املایی ض/ظ؛ باید با نوشتهٔ واقعی داده اجرا و تصحیح گفته شود' });
H('اسنب این ماه چقدر شد', { intent: 'sum', args: { text: 'اسنپ' }, time: 'this_month', result_kind: 'sum', tags: ['typo'], notes: 'یک حرف فاصله با واژهٔ موجود در داده' });
H('تپسی و اسنپ هر دو', { intent: 'sum', args: { textAny: ['تپسی', 'اسنپ'] }, time: 'all', result_kind: 'sum', reading: 'union', tags: ['union'] });
H('خرج سینما یا دکتر این ماه بدون دکتر', { intent: 'clarify', action: 'ask', tool: null, clarification: { reason: 'contradiction', term: 'دکتر' }, tags: ['union', 'negation', 'contradiction'] });
H('هر ماه چقدر خرج می‌کنم؟', { intent: 'group', args: { by: 'month', tab: 'expense' }, time: 'all', tags: ['group', 'colloquial'], noExpected: true });
H('کم‌خرج‌ترین ماهم کدومه؟', { intent: 'group', args: { by: 'month', tab: 'expense' }, time: 'all', tags: ['group', 'extreme'], noExpected: true, notes: 'تفکیک ماهانه و انتخاب کمترین؛ ابزار مستقیم ندارد' , gap: true });
H('خرج و درآمد این ماه رو با هم بگو', { intent: 'sum', args: {}, time: 'this_month', result_kind: 'sum', tags: ['multi-part'], noExpected: true, notes: 'نوع مشخص نشده: سه خط درآمد/هزینه/مانده (بدون عدد جمع مختلط)' });
H('موجودی حسابم رو می‌خوام نه پس‌انداز', { intent: 'balance', args: {}, time: null, tags: ['balance-vs-savings'], noExpected: true, notes: 'موجودی ≠ پس‌انداز ≠ تفاضل درآمد و هزینه' });
H('چقدر از درآمدم مونده؟', { intent: 'daily', args: {}, time: 'this_month', tags: ['balance-vs-savings', 'colloquial'], noExpected: true });
H('درآمد این ماهم چقدر بوده با پاداشی که هنوز نگرفتم', { intent: 'sum', args: { tab: 'income' }, time: 'this_month', result_kind: 'sum', tags: ['unpaid', 'income'], notes: 'پرداخت‌نشده/دریافت‌نشده طبق Q1 جدا گفته می‌شود' });
H('حقوق این ماهم', { intent: 'sum', args: { text: 'حقوق' }, time: 'this_month', result_kind: 'sum', tags: ['category-vs-row', 'income'], notes: 'ردیف «حقوق» (۹٬۰۰۰٬۰۰۰) نه کل درآمد' });
H('درآمدم به‌جز حقوق', { intent: 'sum', args: { tab: 'income', excludeText: ['حقوق'] }, time: 'all', result_kind: 'sum', tags: ['negation', 'income'] });
H('ردیف‌هایی که مبلغ ندارن چندتان؟', { intent: 'count', args: {}, time: 'all', result_kind: 'count', tags: ['incomplete-rows'], noExpected: true, notes: 'ردیف ناقص طبق Q3 جدا گزارش می‌شود (در fixture: یک ردیف)' });
H('چند تا تراکنش ماه قبل داشتم؟', { intent: 'count', args: {}, time: 'prev_month', result_kind: 'count', tags: ['count', 'time'] });
H('تراکنش‌های زیر ۵۰ هزار تومن ماه قبل', { intent: 'list_rows', args: { amountMax: 50000 }, time: 'prev_month', result_kind: 'rows', tags: ['amount', 'list'] });
H('بیشتر از دو میلیون هزینه داشتم؟', { intent: 'sum', args: { tab: 'expense', amountMin: 2000000 }, time: 'all', result_kind: 'sum', tags: ['amount', 'yes-no'], notes: 'پاسخ «ثبت نشده/نه» با عدد صفر؛ سؤال بله/خیر' });
H('خرج بین ۵۰ تا ۱۰۰ هزار ماه قبل', { intent: 'sum', args: { tab: 'expense', amountMin: 50000, amountMax: 100000 }, time: 'prev_month', result_kind: 'sum', tags: ['amount', 'range'] });
H('اسنپ و تپسی رو جدا بگو', { intent: 'group', args: {}, time: 'all', tags: ['multi-part', 'union'], gap: true, noExpected: true, notes: 'دو عدد جدا؛ ابزار تک‌شرطی است' });
H('خرج کل ماه چقدر میشه آخرش؟', { intent: 'forecast', args: {}, time: 'this_month', tags: ['forecast', 'colloquial'], noExpected: true });
H('پس‌اندازم رو میخوام', { intent: 'savings', args: {}, time: null, tags: ['balance-vs-savings'], noExpected: true, notes: 'مبهم بین پس‌اندازِ ماه و دارایی پس‌انداز؛ فرض باید در جملهٔ اول گفته شود' });
H('نمودار خرجام', { intent: 'chart', tool: 'insights.chart', args: {}, time: null, tags: ['chart'], noExpected: true });
H('سهم اسنپ از خرجام چنده؟', { intent: 'share', tool: 'insights.share', args: { text: 'اسنپ' }, time: null, tags: ['share'], noExpected: true });
H('چطور میشه ماهی ۲ میلیون پس‌انداز کنم؟', { intent: 'goal', args: { target: 2000000 }, time: null, tags: ['goal'], noExpected: true, notes: 'ساختار مقدار هدف؛ پاسخ باید از ابزار هدف باشد' });
H('برنج ماه پیش و نان ماه پیش', { intent: 'sum', args: { textAny: ['برنج', 'نان'] }, time: 'prev_month', result_kind: 'sum', reading: 'union', tags: ['union', 'repeated-time'] });
H('خرج اسنپ بدون اسنپ', { intent: 'clarify', action: 'ask', tool: null, clarification: { reason: 'contradiction', term: 'اسنپ' }, tags: ['negation', 'contradiction'] });
H('پول رفته کجا؟', { intent: 'top', args: {}, time: null, tags: ['colloquial'], noExpected: true });
H('اشتباه فهمیدی', { intent: 'clarify', action: 'ask', tool: null, clarification: { reason: 'correction_without_context' }, tags: ['follow-up', 'no-context'] });
/* ---------- نوشتن ---------- */
for (const sp_ of ['train', 'dev', 'hard']) {
  fs.writeFileSync(path.join(DIR, sp_ + '.jsonl'), out[sp_].map((s) => JSON.stringify(s)).join('\n') + '\n', 'utf8');
}
const stat = Object.keys(out).map((k) => k + '=' + out[k].length).join(' ');
console.log('assistant-bank:', stat, 'total=' + (out.train.length + out.dev.length + out.hard.length));

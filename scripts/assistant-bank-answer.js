#!/usr/bin/env node
'use strict';
/* سنجش مرحلهٔ ۴ (محاسبه و پاسخ) روی بانک: متن ← hkAsstChain؛ عددها با انتظار بانک و با محاسبهٔ مستقلِ همین ارزیاب (از مرجع ردیف‌های انتخاب‌شده) سنجیده می‌شوند.
   جمع/تعداد فقط در همین ارزیاب (مستقل از مرحلهٔ ۳) از روی مرجع ردیف‌های انتخاب‌شده حساب می‌شود؛ خود hkAsstMatch هیچ مبلغی جمع نمی‌زند.
   اجرا: node scripts/assistant-bank-match.js [index.html] [dev|hard|train|all] [خروجی.json] */
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const { fixture, DIR, norm } = require('./assistant-bank-lib.js');
const argv = process.argv.slice(2);
const INDEX = path.resolve(argv[0] || path.join(__dirname, '..', 'index.html')), WHICH = argv[1] || 'dev', OUTF = argv[2] || '';
const load = (n) => fs.readFileSync(path.join(DIR, n + '.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const sets = WHICH === 'all' ? ['train', 'dev', 'hard'] : [WHICH];
const samples = [].concat(...sets.map(load)).filter((s) => s.lang === 'fa');
const P = 'hesabKetabArchive_v5', LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ timezoneId: 'Asia/Tehran' });
  await c.addInitScript((o) => { for (const k in o) localStorage.setItem(k, o[k]); }, LS);
  const pg = await c.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); await pg.goto('file://' + INDEX); await pg.waitForTimeout(1500);
  const res = await pg.evaluate(({ samples, fx }) => {
    const cy = currentYear, cm = currentMonth; let py = cy, pm = cm - 1; if (pm < 1) { pm = 12; py = cy - 1; }
    const t = hkMainTitle() || 'من';
    const mk = (m) => { const pd = emptyPeriodData(); ['expense', 'income'].forEach((tab) => { pd[tab].sections = [{ id: tab[0].toUpperCase(), title: t, rows: fx.rows.filter((r) => r.m === m && r.tab === tab).map((r, i) => ({ id: tab[0] + i, day: '2', desc: r.desc, amount: r.amount, status: r.status, account: '', deletedAt: null, createdAt: 1, updatedAt: 1 })) }]; }); ['expense', 'income'].forEach((tb) => pd[tb].sections.forEach((sc) => sc.rows.forEach((r) => { try { hkCatStampRow(r, true); } catch (e) {} }))); return pd; };
    const cur = mk('this_month'), prev = mk('prev_month');
    periodData = cur; archive = {}; archive[periodKey(cy, cm)] = JSON.parse(JSON.stringify(cur)); archive[periodKey(py, pm)] = prev; _savings = { v: 1, items: [], prices: {} };
    const byRef = {}; hkAsstRows().forEach((r) => { byRef[hkAsstMatchRefKey(r)] = r; });
    const rk = (r) => hkAsstMatchRefKey({ key: r.key, secId: r.sec, idx: r.idx, tab: r.tab, id: r.id });
    const storage0 = JSON.stringify(Object.keys(localStorage).sort().map((k) => [k, localStorage.getItem(k)])), data0 = JSON.stringify(archive) + JSON.stringify(periodData);
    const out = samples.map((s) => {
      const st = {}; (s.context || []).forEach((q) => hkAsstChain(q, st));
      const c = hkAsstChain(s.text, st), a = c.answer, m = c.match, rows = m.selection.refs.map((r) => byRef[rk(r)]).filter(Boolean);
      const ind = { n: rows.length, sum: rows.reduce((x, r) => x + r.amount, 0), max: rows.length ? Math.max.apply(null, rows.map((r) => r.amount)) : null, min: rows.length ? Math.min.apply(null, rows.map((r) => r.amount)) : null, inc: rows.filter((r) => r.tab === 'income').reduce((x, r) => x + r.amount, 0), exp: rows.filter((r) => r.tab !== 'income').reduce((x, r) => x + r.amount, 0), tabs: [...new Set(rows.map((r) => r.tab))].length };
      const alts = (c.calc && c.calc.alternatives || []).map((x) => ({ word: x.word, sum: x.sum, count: x.count }));
      return { id: s.id, status: a.status, kind: a.kind, text: a.text, err: a.error || null, mstatus: m.status, clar: m.clarification && m.clarification.reason, ind, calc: c.calc && c.calc.stats ? { sum: c.calc.stats.sum, count: c.calc.stats.count, avg: c.calc.stats.avg, inc: c.calc.stats.incomeSum, exp: c.calc.stats.expenseSum, incomplete: c.calc.incomplete, mixed: c.calc.mixed, op: c.calc.op, ext: c.calc.extremes && c.calc.extremes.map((e) => e.rows.map((r) => r.amount)) } : null, alts, chk: hkAsstAnswerCheck(a).ok, ntrace: a.trace.length, gaps: (a.gaps || []).length, notesGap: /نکته:/.test(a.text), fmt: { M: (n) => 0 } && null };
    });
    const fmtM = {}; samples.forEach((s) => { [].concat(s.expected ? [s.expected.sum, s.expected.count, s.expected.row_alternative && s.expected.row_alternative.sum, s.alt && s.alt.expected && s.alt.expected.sum] : []).forEach((n) => { if (n != null) fmtM[n] = [hkAsstMoney(n), toPersianDigits(String(n))]; }); });
    return { out, fmtM, sideEffects: { storage: storage0 !== JSON.stringify(Object.keys(localStorage).sort().map((k) => [k, localStorage.getItem(k)])), data: data0 !== JSON.stringify(archive) + JSON.stringify(periodData) } };
  }, { samples, fx: fixture });
  await b.close();
  const byId = {}; res.out.forEach((o) => byId[o.id] = o);
  const NAN = /NaN|undefined|null|\[object|Infinity/;
  const rows = samples.map((s) => {
    const o = byId[s.id], r = { id: s.id, split: s.split, tags: s.tags, difficulty: s.difficulty, text: s.text, ok: true, why: [], answer: o.text, status: o.status };
    const bad = (w) => { r.ok = false; r.why.push(w); };
    const has = (n) => { const f = res.fmtM[n]; return f && (o.text.indexOf(f[0]) >= 0 || o.text.indexOf(f[1]) >= 0); };
    if (!o.text || NAN.test(o.text)) bad('bad_text');
    if (!o.chk) bad('unbacked_number');
    if (s.action === 'run_tool') {
      if (o.status === 'clarify' || o.status === 'refuse') bad('not_answered:' + o.status + (o.clar ? '/' + o.clar : ''));
      else if (o.status === 'error') bad('error:' + o.err);
      else if (o.status !== 'answer') bad('status:' + o.status);
      else if (!s.capability_gap && s.expected && s.result_kind !== null && o.calc) {
        const E = s.expected, alt = s.alt && s.alt.expected, rk = s.result_kind, c = o.calc;
        const sameAs = (x) => x && ((rk === 'sum' && c.sum === x.sum) || (rk === 'count' && c.count === x.count) || (rk === 'avg' && x.count && c.avg === Math.round(x.sum / x.count)) || (rk === 'rows' && c.sum === x.sum));
        const use = sameAs(E) ? E : sameAs(alt) ? alt : null;
        if (!use) bad('number:' + c.sum + '/' + c.count + '≠' + E.sum + '/' + E.count);
        else {
          if (c.sum !== ind(o).sum || c.count !== o.ind.n) bad('calc≠independent');
          if (rk === 'sum' && !c.mixed && !has(use.sum)) bad('text_missing_sum');
          else if (rk === 'sum' && c.mixed && !(has(c.inc) || o.text.indexOf(res.fmtM[use.sum] ? res.fmtM[use.sum][0] : '#') >= 0)) { /* جداسازی درآمد/هزینه */ }
          if (rk === 'count' && !has(use.count)) bad('text_missing_count');
          if (rk === 'avg' && o.text.indexOf(String(c.avg).length ? '' : '#') < 0) bad('avg');
          if (use.incomplete != null && c.incomplete !== use.incomplete) bad('incomplete:' + c.incomplete + '≠' + use.incomplete);
        }
        const row = E.row_alternative; if (row && s.reading === 'category_default' && !has(row.sum)) bad('row_alternative_not_in_text');
      } else if (!s.capability_gap && o.calc && (s.intent === 'max' || s.intent === 'min')) {
        const want = s.intent === 'max' ? o.ind.max : o.ind.min;
        if (o.ind.tabs > 1) { /* دو نوع: هر نوع جدا */ }
        else if (!o.calc.ext || o.calc.ext[0][0] !== want) bad('extreme:' + (o.calc.ext && o.calc.ext[0][0]) + '≠' + want);
      }
      if (s.capability_gap && !o.notesGap && !o.gaps && o.status === 'answer') bad('gap_not_stated');
    } else if (s.action === 'ask') { if (o.status !== 'clarify') bad('not_clarified:' + o.status); }
    else if (s.action === 'refuse') { if (o.status !== 'refuse' && o.status !== 'clarify') bad('status:' + o.status); }
    else if (s.action === 'chat') { if (o.status !== 'chat') bad('status:' + o.status); }
    else if (s.action === 'navigate') { if (o.status !== 'navigate') bad('status:' + o.status); }
    if (o.ntrace === 0 && o.status !== 'chat') bad('no_trace');
    r.o = o; return r;
  });
  function ind(o) { return o.ind; }
  const grp = (f) => { const g = {}; rows.forEach((r) => (f(r) || []).forEach((k) => { g[k] = g[k] || { n: 0, ok: 0 }; g[k].n++; if (r.ok) g[k].ok++; })); return g; };
  const show = (t, g) => { console.log('\n' + t); Object.keys(g).sort().forEach((k) => console.log('  ' + k.padEnd(26) + g[k].ok + '/' + g[k].n + '  (' + Math.round(100 * g[k].ok / g[k].n) + '%)')); };
  console.log('assistant-bank-answer: ' + WHICH + ' | نمونه=' + rows.length + ' | موفق=' + rows.filter((r) => r.ok).length + ' (' + (100 * rows.filter((r) => r.ok).length / rows.length).toFixed(1) + '%)');
  console.log('اثر جانبی: ذخیره‌سازی ' + res.sideEffects.storage + '، دادهٔ مالی ' + res.sideEffects.data + ' | خطای صفحه ' + errs.length + '');
  show('split', grp((r) => [r.split])); show('پاسخ', grp((r) => [r.status])); show('دشواری', grp((r) => [r.difficulty]));
  const tg = grp((r) => r.tags.filter((t) => t !== 'augmented')), weak = {}; Object.keys(tg).filter((k) => tg[k].n >= 4 && tg[k].ok / tg[k].n < 0.85).forEach((k) => weak[k] = tg[k]); show('برچسب‌های ضعیف (<۸۵٪)', weak);
  const why = {}; rows.filter((r) => !r.ok).forEach((r) => r.why.forEach((w) => { const k = w.split(':')[0]; why[k] = (why[k] || 0) + 1; })); console.log('\nدلیل‌ها:', JSON.stringify(why));
  if (OUTF) fs.writeFileSync(OUTF, JSON.stringify({ index: path.basename(INDEX), which: WHICH, sideEffects: res.sideEffects, rows }, null, 1));
})();

#!/usr/bin/env node
'use strict';
/* سنجش مرحلهٔ ۳ (hkAsstMatch) روی بانک: متن ← hkAsstAnalyze ← hkAsstMatch؛ نتیجه با عدد انتظار بانک سنجیده می‌شود.
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
    const byRef = {}; hkAsstRows().forEach((r) => { byRef[hkAsstMatchRefKey(r)] = r.amount; });
    const sumRefs = (refs) => refs.reduce((s, r) => s + (byRef[hkAsstMatchRefKey({ key: r.key, secId: r.sec, idx: r.idx, tab: r.tab, id: r.id })] || 0), 0);
    const storage0 = JSON.stringify(Object.keys(localStorage).sort().map((k) => [k, localStorage.getItem(k)])), data0 = JSON.stringify(archive) + JSON.stringify(periodData);
    const out = samples.map((s) => {
      let prevSpec = null;
      (s.context || []).forEach((q) => { const sp = hkAsstAnalyze(q, { prev: prevSpec }); const m = hkAsstMatch(sp); if (m.resume && m.status === 'clarify') sp.resume = m.resume; prevSpec = sp; });
      const sp = hkAsstAnalyze(s.text, { prev: prevSpec }), m = hkAsstMatch(sp);
      return { id: s.id, m: { status: m.status, clar: m.clarification, readings: { primary: m.readings.primary, alts: m.readings.alternatives.map((a) => ({ word: a.word, n: a.refs.length, sum: sumRefs(a.refs) })) }, sel: { n: m.selection.refs.length, sum: sumRefs(m.selection.refs), inc: m.selection.incomplete_refs.length, empty: m.selection.empty }, open: m.open_data_decisions, closed: m.closed_data_decisions.length, gaps: m.gaps.map((g) => g.code), warnings: m.warnings.map((w) => w.code), hasTrace: m.trace.length > 0, tool: m.exec && m.exec.tool, conds: m.conditions.length } };
    });
    return { out, sideEffects: { storage: storage0 !== JSON.stringify(Object.keys(localStorage).sort().map((k) => [k, localStorage.getItem(k)])), data: data0 !== JSON.stringify(archive) + JSON.stringify(periodData) } };
  }, { samples, fx: fixture });
  await b.close();
  const byId = {}; res.out.forEach((o) => byId[o.id] = o.m);
  const rows = samples.map((s) => {
    const m = byId[s.id], r = { id: s.id, split: s.split, tags: s.tags, difficulty: s.difficulty, text: s.text, ok: true, why: [] };
    const bad = (w) => { r.ok = false; r.why.push(w); };
    if (s.action === 'run_tool') {
      if (m.status !== 'ready') bad('status:' + m.status + (m.clar ? '/' + m.clar.reason : ''));
      else if (!s.capability_gap && s.expected && s.result_kind !== null) {
        const E = s.expected, prim = (x) => (x.sum === E.sum && (s.result_kind === 'sum' || m.sel.n === E.count)) && (s.result_kind !== 'count' || m.sel.n === E.count);
        const selOk = m.sel.sum === E.sum && (s.result_kind !== 'count' && s.result_kind !== 'avg' || m.sel.n === E.count);
        const altE = s.alt && s.alt.expected, selAlt = altE && m.sel.sum === altE.sum;
        const row = E.row_alternative, hasRowAlt = row ? m.readings.alts.some((a) => a.sum === row.sum) : true;
        if (s.time === 'unavailable') { if (!m.sel.empty) bad('not_empty'); }
        else if (!(selOk || selAlt)) bad('selection_sum:' + m.sel.sum + '≠' + E.sum);
        else if (s.reading === 'category_default' && row && E.sum !== row.sum && !hasRowAlt) bad('row_alternative_missing');
        else if (selAlt && !selOk && E.sum !== altE.sum && !m.readings.alts.some((a) => a.sum === E.sum)) bad('alt_reading_not_disclosed');
      }
      if (!m.hasTrace) bad('no_trace');
    } else if (s.action === 'ask') {
      const rs = s.clarification && s.clarification.reason;
      if (m.status !== 'clarify') bad('not_clarified:' + m.status);
      else if (rs === 'unknown_term') { if (!(m.clar.reason === 'unknown_term' && norm(m.clar.term) === norm(s.clarification.term))) bad('term:' + (m.clar.term || m.clar.reason)); }
      else if (['vague_size', 'contradiction', 'correction_without_context'].indexOf(rs) >= 0 && m.clar.reason !== rs) bad('reason:' + m.clar.reason);
    } else if (s.action === 'refuse') { if (m.status !== 'refuse' && m.status !== 'clarify') bad('status:' + m.status); }
    else if (s.action === 'chat') { if (m.status !== 'chat') bad('status:' + m.status); }
    else if (s.action === 'navigate') { if (m.status !== 'navigate') bad('status:' + m.status); }
    if (m.open.length) bad('open_data_decisions:' + m.open.join(','));
    r.m = m; return r;
  });
  const grp = (f) => { const g = {}; rows.forEach((r) => (f(r) || []).forEach((k) => { g[k] = g[k] || { n: 0, ok: 0 }; g[k].n++; if (r.ok) g[k].ok++; })); return g; };
  const show = (t, g) => { console.log('\n' + t); Object.keys(g).sort().forEach((k) => console.log('  ' + k.padEnd(26) + g[k].ok + '/' + g[k].n + '  (' + Math.round(100 * g[k].ok / g[k].n) + '%)')); };
  console.log('assistant-bank-match: ' + WHICH + ' | نمونه=' + rows.length + ' | موفق=' + rows.filter((r) => r.ok).length + ' (' + (100 * rows.filter((r) => r.ok).length / rows.length).toFixed(1) + '%)');
  console.log('اثر جانبی: ذخیره‌سازی ' + res.sideEffects.storage + '، دادهٔ مالی ' + res.sideEffects.data + ' | خطای صفحه ' + errs.length + ' | تصمیم باز مانده ' + rows.filter((r) => r.m.open.length).length);
  show('split', grp((r) => [r.split])); show('اقدام', grp((r) => [r.m.status])); show('دشواری', grp((r) => [r.difficulty]));
  const tg = grp((r) => r.tags.filter((t) => t !== 'augmented')), weak = {}; Object.keys(tg).filter((k) => tg[k].n >= 4 && tg[k].ok / tg[k].n < 0.85).forEach((k) => weak[k] = tg[k]); show('برچسب‌های ضعیف (<۸۵٪)', weak);
  const why = {}; rows.filter((r) => !r.ok).forEach((r) => r.why.forEach((w) => { const k = w.split(':')[0]; why[k] = (why[k] || 0) + 1; })); console.log('\nدلیل‌ها:', JSON.stringify(why));
  if (OUTF) fs.writeFileSync(OUTF, JSON.stringify({ index: path.basename(INDEX), which: WHICH, sideEffects: res.sideEffects, rows }, null, 1));
})();

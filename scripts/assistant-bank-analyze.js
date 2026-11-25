#!/usr/bin/env node
'use strict';
/* سنجش تحلیل‌گر درخواست (hkAsstAnalyze) روی بانک داده.
   اجرا: node scripts/assistant-bank-analyze.js [index.html] [dev|hard|train|all] [خروجی.json] [--nodata]
   --nodata: بدون دفتر ساختگی (برای اندازه‌گیری وابستگی تحلیل‌گر به دادهٔ کاربر). مقایسه با برچسب‌هاست؛ هیچ دادهٔ ذخیره‌شده‌ای تغییر نمی‌کند. */
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const { fixture, DIR, norm } = require('./assistant-bank-lib.js');
const argv = process.argv.slice(2), NODATA = argv.indexOf('--nodata') >= 0, pos = argv.filter((a) => a[0] !== '-');
const INDEX = path.resolve(pos[0] || path.join(__dirname, '..', 'index.html')), WHICH = pos[1] || 'dev', OUTF = pos[2] || '';
const load = (n) => fs.readFileSync(path.join(DIR, n + '.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const sets = WHICH === 'all' ? ['train', 'dev', 'hard'] : [WHICH];
const samples = [].concat(...sets.map(load)).filter((s) => s.lang === 'fa');
const P = 'hesabKetabArchive_v5', LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ timezoneId: 'Asia/Tehran' });
  await c.addInitScript((o) => { for (const k in o) localStorage.setItem(k, o[k]); }, LS);
  const pg = await c.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); await pg.goto('file://' + INDEX); await pg.waitForTimeout(1500);
  const res = await pg.evaluate(({ samples, fx, nodata }) => {
    const cy = currentYear, cm = currentMonth; let py = cy, pm = cm - 1; if (pm < 1) { pm = 12; py = cy - 1; }
    if (!nodata) {
      const t = hkMainTitle() || 'من';
      const mk = (m) => { const pd = emptyPeriodData(); ['expense', 'income'].forEach((tab) => { pd[tab].sections = [{ id: tab[0].toUpperCase(), title: t, rows: fx.rows.filter((r) => r.m === m && r.tab === tab).map((r, i) => ({ id: tab[0] + i, day: '2', desc: r.desc, amount: r.amount, status: r.status, account: '', deletedAt: null, createdAt: 1, updatedAt: 1 })) }]; }); ['expense', 'income'].forEach((tb) => pd[tb].sections.forEach((sc) => sc.rows.forEach((r) => { try { hkCatStampRow(r, true); } catch (e) {} }))); return pd; };
      const cur = mk('this_month'), prev = mk('prev_month');
      periodData = cur; archive = {}; archive[periodKey(cy, cm)] = JSON.parse(JSON.stringify(cur)); archive[periodKey(py, pm)] = prev; _savings = { v: 1, items: [], prices: {} };
    }
    const lsBefore = JSON.stringify(Object.keys(localStorage).sort().map((k) => [k, localStorage.getItem(k)]));
    const theme0 = document.documentElement.getAttribute('data-theme');
    /* شبیه‌سازی مرحلهٔ ۳ فقط برای ارزیابی: اگر واژه‌ای در دادهٔ دفتر نیست، همان واژه برای «پاسخ اصلاحی» بعدی در resume می‌آید (در برنامه این کار را hkAsstGuard می‌کند) */
    const out = samples.map((s) => { let prev = null; (s.context || []).forEach((q) => { const sp = hkAsstAnalyze(q, { prev }); if (sp.action === 'run_tool' && sp.binding && !sp.resume) { let unk = []; try { unk = hkAsstUnknownTerms({ tool: sp.binding.tool, args: sp.binding.args }, false); } catch (e) {} if (unk.length) sp.resume = { q: q, term: unk[0] }; } prev = sp; }); return { id: s.id, spec: hkAsstAnalyze(s.text, { prev }) }; });
    const lsAfter = JSON.stringify(Object.keys(localStorage).sort().map((k) => [k, localStorage.getItem(k)]));
    return { cy, cm, py, pm, out, sideEffects: { storage: lsBefore !== lsAfter, theme: theme0 !== document.documentElement.getAttribute('data-theme') } };
  }, { samples, fx: fixture, nodata: NODATA });
  await b.close();
  const byId = {}; res.out.forEach((o) => byId[o.id] = o.spec);
  const same = (w, a) => Array.isArray(w) ? Array.isArray(a) && w.length === a.length && w.every((x) => a.indexOf(x) >= 0) : String(a) === String(w);
  const EQI = (g, sp) => g === sp || (/^(sum|list_rows)$/.test(g) && /^(sum|list_rows)$/.test(sp));
  const rows = samples.map((s) => {
    const sp = byId[s.id], r = { id: s.id, split: s.split, tags: s.tags, difficulty: s.difficulty, text: s.text, ok: true, why: [], deferred: false };
    const bad = (w) => { r.ok = false; r.why.push(w); };
    const A = sp.binding ? sp.binding.args : {}, terms = [].concat(sp.slots.include.terms, sp.slots.include.any_terms, sp.slots.exclude.terms).map(norm);
    if (s.action === 'run_tool' && s.capability_gap) { if (!(sp.gaps.length || sp.action === 'ask')) bad('gap_not_flagged:' + sp.action); else if (sp.action === 'run_tool' && s.tool && sp.binding && !/^(insights|transactions|reports)/.test(sp.binding.tool)) bad('tool:' + sp.binding.tool); }
    else if (s.action === 'run_tool') {
      if (sp.action !== 'run_tool') bad('action:' + sp.action + (sp.clarification ? '/' + sp.clarification.reason : ''));
      else {
        const tool = sp.binding.tool, okTool = tool === s.tool || (s.tool_alt || []).indexOf(tool) >= 0 || (/^(sum|count|average|list_rows)$/.test(s.intent) && /^transactions\.(aggregate|search)$/.test(tool) && /^transactions\.(aggregate|search)$/.test(s.tool));
        if (!s.capability_gap && !okTool) bad('tool:' + tool);
        if (!s.capability_gap && okTool && !EQI(s.intent, sp.intent) && !/^(sum|list_rows|count|average)$/.test(s.intent) && (s.tool_alt || []).indexOf(tool) < 0) bad('intent:' + sp.intent);
        if (s.intent === 'count' && sp.intent !== 'count') bad('intent:' + sp.intent);
        if (s.intent === 'average' && sp.intent !== 'average') bad('intent:' + sp.intent);
        const match = (want) => Object.keys(want).every((k) => k === 'limit' ? true : same(want[k], A[k]));
        const prim = match(s.args), alt = s.alt && match(s.alt.args);
        if (!s.capability_gap && !prim && !alt) Object.keys(s.args).forEach((k) => { if (k !== 'limit' && !same(s.args[k], A[k])) r.why.push('arg:' + k); });
        if (!r.why.length || r.why.every((w) => !/^arg:/.test(w))) { /* ok */ } else r.ok = false;
        if (s.args.limit != null && s.intent !== 'sum' && sp.order.limit !== s.args.limit && !s.capability_gap) bad('limit');
        const txTool = /^(transactions|reports)\./.test(tool);
        if (!txTool) { /* زمان ابزارهای تحلیلی را خود ابزار تعیین می‌کند */ }
        else if (s.time === 'unavailable') { if (!(sp.time.explicit && sp.time.rel !== 'this_month' && sp.time.rel !== 'prev_month' && sp.time.kind !== 'all')) bad('time'); }
        else if (txTool && s.time && s.time !== 'null' && !s.capability_gap) { const got = sp.time.kind === 'all' ? 'all' : sp.time.kind === 'range' && s.time === 'all' ? 'all' : sp.time.rel; if (got !== s.time) bad('time:' + got); }
        if (txTool && !s.time && sp.time.explicit && !s.capability_gap) r.why.push('time_extra'), r.ok = false;
        if (s.capability_gap && !sp.gaps.length && /^(multi_part|group_by_category)$/.test('')) bad('gap_missing');
        if (s.capability_gap && !sp.gaps.length && (s.tags.indexOf('multi-part') >= 0 || s.tags.indexOf('category-breakdown') >= 0)) bad('gap_missing');
      }
    } else if (s.action === 'ask') {
      const rs = s.clarification && s.clarification.reason;
      if (rs === 'unknown_term') { /* وابسته به داده: تحلیل‌گر باید واژه را در شرط‌ها نگه دارد (مرحلهٔ ۳ می‌پرسد) یا خودش بپرسد */
        if (sp.action === 'ask') { /* ok */ } else if (sp.action === 'run_tool' && terms.some((t) => t.indexOf(norm(s.clarification.term)) >= 0)) r.deferred = true; else bad('term_lost:' + sp.action);
      } else if (rs === 'vague_size' || rs === 'contradiction' || rs === 'correction_without_context') { if (!(sp.action === 'ask' && sp.clarification.reason === rs)) bad('clar:' + sp.action + '/' + (sp.clarification && sp.clarification.reason)); }
      else if (rs === 'missing_scope') { if (sp.action !== 'ask') bad('not_asked:' + sp.action); }
      else if (sp.action !== 'ask') bad('not_asked:' + sp.action);
    } else if (s.action === 'refuse') { if (sp.action !== 'refuse' && sp.action !== 'ask') bad('not_refused:' + sp.action); else if (s.clarification && sp.clarification && s.clarification.reason !== sp.clarification.reason && sp.action === 'refuse') r.why.push('reason:' + sp.clarification.reason); }
    else if (s.action === 'chat') { if (sp.action !== 'chat') bad('not_chat:' + sp.action); }
    else if (s.action === 'navigate') { if (sp.action !== 'navigate') bad('not_nav:' + sp.action); }
    r.spec = { action: sp.action, intent: sp.intent, ops: sp.operations, tab: sp.tab, time: sp.time.rel || sp.time.kind, gaps: sp.gaps.map((g) => g.code), clar: sp.clarification && sp.clarification.reason, dd: sp.data_dependent, args: A };
    return r;
  });
  const grp = (f) => { const m = {}; rows.forEach((r) => (f(r) || []).forEach((k) => { m[k] = m[k] || { n: 0, ok: 0 }; m[k].n++; if (r.ok) m[k].ok++; })); return m; };
  const show = (t, m) => { console.log('\n' + t); Object.keys(m).sort().forEach((k) => console.log('  ' + k.padEnd(26) + m[k].ok + '/' + m[k].n + '  (' + Math.round(100 * m[k].ok / m[k].n) + '%)')); };
  console.log('assistant-bank-analyze: ' + WHICH + (NODATA ? ' [بدون داده]' : '') + ' | نمونه=' + rows.length + ' | هم‌خوان=' + rows.filter((r) => r.ok).length + ' (' + Math.round(100 * rows.filter((r) => r.ok).length / rows.length) + '%) | به مرحلهٔ ۳ واگذار=' + rows.filter((r) => r.deferred).length);
  console.log('اثر جانبی: ذخیره‌سازی ' + res.sideEffects.storage + '، تم ' + res.sideEffects.theme + ' | خطای صفحه ' + errs.length);
  show('split', grp((r) => [r.split])); show('اقدام', grp((r) => [r.spec.action])); show('دشواری', grp((r) => [r.difficulty]));
  const tg = grp((r) => r.tags.filter((t) => t !== 'augmented')); const weak = {}; Object.keys(tg).filter((k) => tg[k].n >= 4 && tg[k].ok / tg[k].n < 0.85).forEach((k) => weak[k] = tg[k]); show('برچسب‌های ضعیف (<۸۵٪)', weak);
  const why = {}; rows.filter((r) => !r.ok).forEach((r) => r.why.forEach((w) => { const k = w.split(':').slice(0, 2).join(':'); why[k] = (why[k] || 0) + 1; })); console.log('\nدلیل‌ها:', JSON.stringify(why));
  if (OUTF) fs.writeFileSync(OUTF, JSON.stringify({ index: path.basename(INDEX), which: WHICH, nodata: NODATA, sideEffects: res.sideEffects, specs: byId, rows }, null, 1));
})();

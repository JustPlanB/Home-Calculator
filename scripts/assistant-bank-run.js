#!/usr/bin/env node
'use strict';
/* اجرای دستیار فعلی روی بانک و سنجش هم‌خوانی با برچسب‌ها (نه «درستی» مطلق: برچسب‌ها را نویسنده نوشته).
   اجرا: node scripts/assistant-bank-run.js [index.html] [dev|hard|train|all] [خروجی.json]
   نیازمند playwright (مثل آزمون‌های پروژه). دادهٔ مالی را تغییر نمی‌دهد؛ فقط fixture ساختگی را در حافظه می‌گذارد. */
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const { fixture, DIR, norm } = require('./assistant-bank-lib.js');
const INDEX = path.resolve(process.argv[2] || path.join(__dirname, '..', 'index.html'));
const WHICH = process.argv[3] || 'dev'; const OUTF = process.argv[4] || '';
const load = (n) => fs.readFileSync(path.join(DIR, n + '.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const sets = WHICH === 'all' ? ['train', 'dev', 'hard'] : [WHICH];
const samples = [].concat(...sets.map(load)).filter((s) => s.lang === 'fa');
const P = 'hesabKetabArchive_v5', LS = { [P + '_tourDone']: '1', [P + '_bankSetupDone']: '1', [P + '_cardSwipeHintDone']: '1', [P + '_recCleanupAsked']: '1' };
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ timezoneId: 'Asia/Tehran' });
  await c.addInitScript((o) => { for (const k in o) localStorage.setItem(k, o[k]); }, LS);
  const pg = await c.newPage(); await pg.goto('file://' + INDEX); await pg.waitForTimeout(1500);
  const res = await pg.evaluate(({ samples, fx }) => {
    const cy = currentYear, cm = currentMonth; let py = cy, pm = cm - 1; if (pm < 1) { pm = 12; py = cy - 1; }
    const t = hkMainTitle() || 'من';
    const mk = (m) => { const pd = emptyPeriodData(); ['expense', 'income'].forEach((tab) => { pd[tab].sections = [{ id: tab[0].toUpperCase(), title: t, rows: fx.rows.filter((r) => r.m === m && r.tab === tab).map((r, i) => ({ id: tab[0] + i, day: '2', desc: r.desc, amount: r.amount, status: r.status, account: '', deletedAt: null, createdAt: 1, updatedAt: 1 })) }]; }); ['expense', 'income'].forEach((tb) => pd[tb].sections.forEach((sc) => sc.rows.forEach((r) => { try { hkCatStampRow(r, true); } catch (e) {} }))); return pd; };
    const cur = mk('this_month'), prev = mk('prev_month');
    periodData = cur; archive = {}; archive[periodKey(cy, cm)] = JSON.parse(JSON.stringify(cur)); archive[periodKey(py, pm)] = prev; _savings = { v: 1, items: [], prices: {} };
    const snap = (r) => ({ ask: r.decision === 'ask' && !r.tool, tool: r.tool || '', args: (r.cmd && r.cmd.args) || {}, text: String(r.text || ''), kind: r.kind });
    const reset = () => { _hkAsstCtx = null; _hkAsstLastTarget = null; try { _hkAsstPending = null; } catch (e) {} };
    return { cy, cm, py, pm, out: samples.map((s) => { reset(); (s.context || []).forEach((q) => hkAsstAsk(q)); return { id: s.id, got: snap(hkAsstAsk(s.text)) }; }) };
  }, { samples, fx: fixture });
  await b.close();
  const fmt = (n) => String(Math.round(n).toLocaleString('en-US')).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
  const mon = (t) => t === 'this_month' ? [res.cy, res.cm] : t === 'prev_month' ? [res.py, res.pm] : null;
  const byId = {}; res.out.forEach((o) => byId[o.id] = o.got);
  const rows = samples.map((s) => {
    const g = byId[s.id], r = { id: s.id, split: s.split, difficulty: s.difficulty, tags: s.tags, text: s.text, gold_action: s.action, ok: true, why: [] };
    const asked = g.ask || (!g.tool && /نفهمیدم|نتونستم بفهمم|چقدرِ چی|منظورت|چیه\؟/.test(g.text));
    const refused = !g.tool && !asked;
    if (s.action === 'run_tool') {
      if (asked) { r.ok = false; r.why.push('false_ask'); }
      else if (!g.tool) { r.ok = false; r.why.push('no_tool'); }
      else {
        const same = (w, a) => Array.isArray(w) ? Array.isArray(a) && w.length === a.length && w.every((x) => a.indexOf(x) >= 0) : String(a) === String(w);
        const argsMatch = (want) => Object.keys(want).every((k) => k === 'limit' || same(want[k], g.args[k]));
        const EQ = /^(sum|count|average|list_rows)$/.test(s.intent) && /^transactions\.(aggregate|search)$/.test(g.tool) && /^transactions\.(aggregate|search)$/.test(s.tool); /* جمع/تعداد با فیلتر: aggregate و search معادل‌اند */
        if (!s.capability_gap && g.tool !== s.tool && !EQ && (s.tool_alt || []).indexOf(g.tool) < 0) { r.ok = false; r.why.push('tool:' + g.tool); }
        const primary = !s.capability_gap && argsMatch(s.args);
        const altOk = s.alt && argsMatch(s.alt.args);
        if (!s.capability_gap && !primary && !altOk) { r.ok = false; Object.keys(s.args).forEach((k) => { if (k !== 'limit' && !same(s.args[k], g.args[k])) r.why.push('arg:' + k); }); }
        if (s.time === 'unavailable') { if (!/ثبت نشده|پیدا نکردم/.test(g.text) || g.args.month === undefined && g.args.year === undefined) { /* باید «ثبت نشده» بگوید */ } if (!/ثبت نشده|پیدا نکردم/.test(g.text)) { r.ok = false; r.why.push('no_data_not_stated'); } else if (s.id && g.args.month && g.args.year === res.cy) { r.ok = false; r.why.push('wrong_period'); } }
        else {
          const m = mon(s.time); if (m && !s.capability_gap && (g.args.year !== m[0] || g.args.month !== m[1]) && /^transactions\./.test(g.tool)) { r.ok = false; r.why.push('time'); }
          if (s.expected && /^transactions\.(aggregate|search)$/.test(g.tool) && s.result_kind === 'sum') {
            const target = altOk && !primary ? s.alt.expected : s.expected;
            if (g.text.indexOf(fmt(target.sum)) < 0 && !(target.sum === 0 && /ثبت نشده|پیدا نکردم/.test(g.text))) { r.ok = false; r.why.push('number'); }
            if (altOk && !primary && s.alt.expected.sum !== s.expected.sum && g.text.indexOf(fmt(s.expected.sum)) < 0) { r.ok = false; r.why.push('category_without_row_number'); }
          }
          if (s.expected && s.result_kind === 'count' && g.text.indexOf(fmt(s.expected.count)) < 0) { r.ok = false; r.why.push('count'); }
          if (s.expected && s.expected.row_alternative && g.text.indexOf(fmt(s.expected.row_alternative.sum)) < 0 && (!g.args.text)) { r.ok = false; r.why.push('row_alternative_missing'); }
        }
      }
    } else if (s.action === 'ask') { if (!asked) { r.ok = false; r.why.push(g.tool ? 'false_accept' : 'not_asked'); } else if (s.clarification && s.clarification.term && norm(g.text).indexOf(norm(s.clarification.term)) < 0 && s.clarification.reason === 'unknown_term') { r.ok = false; r.why.push('wrong_term'); } }
    else if (s.action === 'refuse') { if (g.tool) { r.ok = false; r.why.push('false_accept'); } }
    else if (s.action === 'chat') { if (g.tool || g.kind === undefined) { /* chat بدون ابزار */ } if (g.tool) { r.ok = false; r.why.push('tool_for_chat'); } }
    else if (s.action === 'navigate') { if (g.tool) { r.ok = false; r.why.push('tool_for_nav'); } }
    r.got = { tool: g.tool, args: g.args, text: g.text.slice(0, 120).replace(/\n/g, ' ⏎ ') };
    return r;
  });
  const grp = (f) => { const m = {}; rows.forEach((r) => (f(r) || []).forEach((k) => { m[k] = m[k] || { n: 0, ok: 0 }; m[k].n++; if (r.ok) m[k].ok++; })); return m; };
  const show = (title, m) => { console.log('\n' + title); Object.keys(m).sort().forEach((k) => console.log('  ' + k.padEnd(24) + m[k].ok + '/' + m[k].n + '  (' + Math.round(100 * m[k].ok / m[k].n) + '%)')); };
  console.log('assistant-bank-run: ' + WHICH + ' | نمونه=' + rows.length + ' | هم‌خوان=' + rows.filter((r) => r.ok).length + ' (' + Math.round(100 * rows.filter((r) => r.ok).length / rows.length) + '%)');
  show('به‌تفکیک split', grp((r) => [r.split])); show('به‌تفکیک اقدام', grp((r) => [r.gold_action])); show('به‌تفکیک دشواری', grp((r) => [r.difficulty]));
  show('به‌تفکیک برچسب', grp((r) => r.tags.filter((t) => t !== 'augmented')));
  const why = {}; rows.forEach((r) => r.why.forEach((w) => why[w.split(':')[0]] = (why[w.split(':')[0]] || 0) + 1)); console.log('\nدلیل ناهم‌خوانی:', JSON.stringify(why));
  if (OUTF) fs.writeFileSync(OUTF, JSON.stringify({ index: path.basename(INDEX), which: WHICH, rows }, null, 1));
})();

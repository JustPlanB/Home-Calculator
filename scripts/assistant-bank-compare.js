#!/usr/bin/env node
'use strict';
/* مقایسهٔ موتور جدید (chain) و قدیم (legacy) روی بانک، بدون اثر جانبی (hkAsstCompareEngines). هر موتور با زمینهٔ گفتگوی خودش؛ عدد با برچسب بانک سنجیده می‌شود.
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
    const snap = () => JSON.stringify(Object.keys(localStorage).sort().map((k) => [k, localStorage.getItem(k)])) + JSON.stringify(archive) + JSON.stringify(periodData) + String(typeof _hkAsstCtx === 'object' ? JSON.stringify(_hkAsstCtx) : '') + document.title + (document.body.className || '') + (typeof currentTab !== 'undefined' ? currentTab : '');
    const s0 = snap();
    const out = samples.map((s) => { const c = hkAsstCompareEngines(s.text, s.context || []); return { id: s.id, legacy: c.legacy, chain: c.chain }; });
    return { out, sideEffects: snap() !== s0 };
  }, { samples, fx: fixture });
  await b.close();
  const byId = {}; res.out.forEach((o) => byId[o.id] = o);
  const rows = samples.map((s) => {
    const o = byId[s.id], L = o.legacy, C = o.chain, r = { id: s.id, split: s.split, tags: s.tags, text: s.text, action: s.action, L: { kind: L.kind, tool: L.tool, sum: L.sum, count: L.count, text: L.text }, C: { kind: C.kind, tool: C.tool, sum: C.sum, count: C.count, text: C.text, engine: C.engine } };
    const E = s.expected, rk = s.result_kind, gold = (e, X) => e && ((rk === 'sum' && X.sum === e.sum) || (rk === 'count' && X.count === e.count) || (rk === 'avg' && X.count && X.sum != null && X.count === e.count) || (rk === 'rows' && X.sum === e.sum));
    const num = (X) => !!(s.action === 'run_tool' && !s.capability_gap && E && rk && X.kind === 'result' && gold(E, X) || (s.alt && s.alt.expected && gold(s.alt.expected, X)));
    r.goldL = s.action === 'run_tool' && E && rk && !s.capability_gap ? num(L) : null; r.goldC = s.action === 'run_tool' && E && rk && !s.capability_gap ? num(C) : null;
    r.cls = L.kind === C.kind && L.tool === C.tool ? (L.text === C.text ? 'identical' : (L.sum === C.sum && L.count === C.count ? 'wording_only' : 'numbers_differ')) : 'route_differs';
    r.dry = L.dryLog + C.dryLog;
    return r;
  });
  const cnt = {}; rows.forEach((r) => cnt[r.cls] = (cnt[r.cls] || 0) + 1);
  const gl = rows.filter((r) => r.goldL !== null), okL = gl.filter((r) => r.goldL).length, okC = gl.filter((r) => r.goldC).length;
  console.log('assistant-bank-compare: ' + WHICH + ' | نمونه=' + rows.length + ' | اثر جانبی: ' + res.sideEffects + ' | خطای صفحه ' + errs.length);
  console.log('طبقه‌ها:', JSON.stringify(cnt));
  console.log('مطابقت عددی با برچسب بانک (' + gl.length + ' نمونهٔ عددی): قدیم ' + okL + ' (' + (100 * okL / gl.length).toFixed(1) + '٪) | جدید ' + okC + ' (' + (100 * okC / gl.length).toFixed(1) + '٪)');
  console.log('فقط جدید درست: ' + gl.filter((r) => r.goldC && !r.goldL).length + ' | فقط قدیم درست: ' + gl.filter((r) => r.goldL && !r.goldC).length + ' | هیچ‌کدام: ' + gl.filter((r) => !r.goldL && !r.goldC).length);
  if (OUTF) fs.writeFileSync(OUTF, JSON.stringify({ which: WHICH, sideEffects: res.sideEffects, cnt, rows }, null, 1));
})();

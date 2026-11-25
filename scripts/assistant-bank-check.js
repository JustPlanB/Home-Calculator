#!/usr/bin/env node
'use strict';
/* اعتبارسنجی بانک دادهٔ دستیار: طرح‌واره، ابزار/آرگومان‌های مجاز، هم‌خوانی عدد انتظار با fixture، جدا بودن train/dev/hard.
   اجرا: node scripts/assistant-bank-check.js  (کد خروج ۱ در صورت خطا) */
const fs = require('fs'), path = require('path');
const { compute, DIR, norm } = require('./assistant-bank-lib.js');
const caps = JSON.parse(fs.readFileSync(path.join(DIR, 'capabilities.json'), 'utf8'));
const load = (n) => fs.readFileSync(path.join(DIR, n + '.jsonl'), 'utf8').split('\n').filter(Boolean).map((l, i) => { try { return JSON.parse(l); } catch (e) { return { __bad: n + ':' + (i + 1) }; } });
const data = { train: load('train'), dev: load('dev'), hard: load('hard') };
const ACTIONS = ['run_tool', 'ask', 'refuse', 'chat', 'navigate'];
const INTENTS = ['sum', 'count', 'average', 'max', 'min', 'list_rows', 'group', 'compare', 'status', 'balance', 'savings', 'trend', 'forecast', 'advice', 'budget', 'goal', 'daily', 'top', 'anomaly', 'recurring', 'share', 'chart', 'navigate', 'chat', 'clarify', 'refuse'];
const REASONS = ['unknown_term', 'vague_size', 'missing_scope', 'contradiction', 'no_data_for_period', 'unsupported_period', 'forecast_unsupported', 'market_price', 'investment_advice', 'write_operation', 'out_of_domain', 'correction_without_context'];
const TIMES = [null, 'this_month', 'prev_month', 'all', 'unavailable'];
const DIFF = ['easy', 'medium', 'hard'];
const REQ = ['tool_alt', 'alt', 'id', 'split', 'lang', 'family', 'difficulty', 'tags', 'context', 'text', 'intent', 'action', 'tool', 'args', 'time', 'result_kind', 'clarification', 'reading', 'expected', 'capability_gap', 'notes', 'provenance', 'owner'];
let pass = 0, fail = 0; const errs = [];
const ok = (c, m) => { if (c) pass++; else { fail++; if (errs.length < 40) errs.push(m); } };
const ids = {}, textSeen = {}, fixtureWords = new Set(); require('./assistant-bank-lib.js').fixture.rows.forEach((r) => norm(r.desc).split(' ').forEach((w) => fixtureWords.add(w)));
Object.keys(data).forEach((split) => data[split].forEach((s) => {
  if (s.__bad) { ok(false, 'JSON خراب ' + s.__bad); return; }
  const w = split + ' ' + s.id;
  ok(REQ.every((k) => k in s), w + ': فیلد ناقص ' + REQ.filter((k) => !(k in s)).join(','));
  ok(s.split === split, w + ': split با فایل نمی‌خواند');
  ok(!ids[s.id], w + ': شناسهٔ تکراری'); ids[s.id] = 1;
  ok(ACTIONS.indexOf(s.action) >= 0 && INTENTS.indexOf(s.intent) >= 0 && DIFF.indexOf(s.difficulty) >= 0 && TIMES.indexOf(s.time) >= 0, w + ': مقدار نامعتبر');
  ok(typeof s.text === 'string' && s.text.trim().length > 0 && s.text.length < 200, w + ': متن نامعتبر');
  ok(Array.isArray(s.context) && s.context.every((c) => typeof c === 'string'), w + ': context نامعتبر');
  if (s.action === 'run_tool') {
    ok(s.tool && caps.tools[s.tool], w + ': ابزار ناموجود ' + s.tool);
    const allowed = caps.tools[s.tool] || [];
    Object.keys(s.args || {}).forEach((k) => ok(allowed.indexOf(k) >= 0, w + ': آرگومان غیرمجاز ' + k + ' برای ' + s.tool));
    ok(!('year' in s.args) && !('month' in s.args), w + ': زمان باید در فیلد time باشد');
    ok(s.clarification === null, w + ': run_tool با clarification');
  } else if (s.action === 'navigate') { ok(s.tool === null, w + ': navigate با ابزار'); }
  else { ok(s.tool === null, w + ': ' + s.action + ' نباید ابزار داشته باشد'); }
  if (s.action === 'ask' || s.action === 'refuse') ok(s.clarification && REASONS.indexOf(s.clarification.reason) >= 0, w + ': دلیل پرسش/رد نامعتبر');
  if (s.clarification && s.clarification.reason === 'unknown_term' && s.clarification.term && s.lang === 'fa') ok(!fixtureWords.has(norm(s.clarification.term)), w + ': واژهٔ «ناشناخته» در fixture هست: ' + s.clarification.term);
  /* عدد انتظار دوباره حساب شود */
  if (s.expected) {
    const c = compute(Object.assign({ time: s.time || 'all' }, s.args));
    ok(c.sum === s.expected.sum && c.count === s.expected.count, w + ': عدد انتظار با fixture نمی‌خواند');
    if (s.expected.row_alternative) { const r = compute(Object.assign({ time: s.time || 'all' }, s.expected.row_alternative.args)); ok(r.sum === s.expected.row_alternative.sum, w + ': خوانش ردیف با fixture نمی‌خواند'); }
  }
  ok(Array.isArray(s.tool_alt) && s.tool_alt.every((t) => caps.tools[t]), w + ': tool_alt نامعتبر');
  if (s.alt) { const a = compute(Object.assign({ time: s.time || 'all' }, s.alt.args)); ok(a.sum === s.alt.expected.sum && a.count === s.alt.expected.count, w + ': خوانش دوم (alt) با fixture نمی‌خواند'); Object.keys(s.alt.args).forEach((k) => ok((caps.tools[s.tool] || []).indexOf(k) >= 0, w + ': آرگومان alt غیرمجاز ' + k)); }
  const key = norm(s.text) + '|' + s.context.map(norm).join('>');
  ok(!(textSeen[key] && textSeen[key] !== split) && !(textSeen[key] === split), w + ': متن تکراری (' + (textSeen[key] || '') + ')'); textSeen[key] = split;
  if (split === 'hard') ok(s.tags.indexOf('augmented') < 0 && s.provenance === 'authored-manual', w + ': hard باید دستی و بدون افزایش باشد');
  if (split !== 'hard') ok(s.provenance === 'authored-template', w + ': provenance');
}));
/* جداسازی: هیچ متن مشترکی نیست (بالا) و واژگان ردیف/دستهٔ اختصاصی هر split گزارش می‌شود */
const vocab = (a) => { const v = new Set(); a.forEach((s) => norm(s.text).split(' ').forEach((w) => v.add(w))); return v; };
const vt = vocab(data.train), vd = vocab(data.dev);
const inter = [...vt].filter((w) => vd.has(w)).length, uni = new Set([...vt, ...vd]).size;
const sizes = Object.keys(data).map((k) => k + '=' + data[k].length).join(' ');
console.log('assistant-bank: ' + sizes + ' | vocab overlap train/dev (Jaccard)=' + (inter / uni).toFixed(2));
ok(data.train.length >= 500 && data.dev.length >= 200 && data.hard.length >= 50, 'اندازهٔ کمینه');
ok(data.train.length > data.dev.length, 'train از dev بزرگ‌تر است');
errs.forEach((e) => console.log('  ✗ ' + e));
console.log('\nassistant-bank-check: ' + pass + ' passed, ' + fail + ' failed');
if (require.main === module) process.exit(fail ? 1 : 0);
module.exports = { pass: () => pass, fail: () => fail };

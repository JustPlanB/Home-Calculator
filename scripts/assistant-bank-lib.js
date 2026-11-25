'use strict';
/* محاسبهٔ مرجع (مستقل از دستیار) روی fixture.json — فقط منطق قطعی ساده: جمع/تعداد با فیلتر.
   تطبیق متن = «واژهٔ کامل» (نه زیررشته): «نان» با «دانانو» نمی‌خواند. */
const fs = require('fs'), path = require('path');
const DIR = path.join(__dirname, '..', 'data', 'assistant-bank');
const fixture = JSON.parse(fs.readFileSync(path.join(DIR, 'fixture.json'), 'utf8'));
const norm = (s) => String(s || '').replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/‌/g, ' ').replace(/\s+/g, ' ').trim();
const toks = (s) => norm(s).split(' ').filter(Boolean);
function wordMatch(desc, term) {
  const d = toks(desc), t = toks(term);
  if (!t.length) return false;
  for (let i = 0; i + t.length <= d.length; i++) { let ok = true; for (let j = 0; j < t.length; j++) if (d[i + j] !== t[j]) { ok = false; break; } if (ok) return true; }
  return false;
}
/* spec: {tab, time:'this_month'|'prev_month'|'all', text, textAny, excludeText, cats, excludeCats, unionCats, amountMin, amountMax, status} */
function matches(r, spec) {
  if (spec.time && spec.time !== 'all' && r.m !== spec.time) return false;
  if (spec.tab && r.tab !== spec.tab) return false;
  if (spec.status && r.status !== spec.status) return false;
  if (spec.amountMin != null && r.amount < spec.amountMin) return false;
  if (spec.amountMax != null && r.amount > spec.amountMax) return false;
  if ((spec.excludeText || []).some((w) => wordMatch(r.desc, w))) return false;
  if ((spec.excludeCats || []).indexOf(r.cat) >= 0) return false;
  const hw = spec.text ? wordMatch(r.desc, spec.text) : null;
  const ha = (spec.textAny || []).length ? spec.textAny.some((w) => wordMatch(r.desc, w)) : null;
  const hc = (spec.cats || []).length ? spec.cats.indexOf(r.cat) >= 0 : null;
  if (hw === false) return false;
  if (ha !== null && hc !== null) return spec.unionCats ? (ha || hc) : (ha && hc);
  if (ha === false) return false;
  if (hc === false) return false;
  return true;
}
function compute(spec) {
  if (spec.time === 'unavailable') return { sum: 0, count: 0, incomplete: 0 };
  const all = fixture.rows;
  const rows = all.filter((r) => r.amount !== 0 && matches(r, spec));
  /* ردیف ناقص (مبلغ صفر): فقط اگر با بقیهٔ فیلترها بخواند (بدون شرط مبلغ) */
  const noAmt = Object.assign({}, spec); delete noAmt.amountMin; delete noAmt.amountMax;
  const inc = all.filter((r) => r.amount === 0 && matches(r, noAmt));
  return { sum: rows.reduce((s, r) => s + r.amount, 0), count: rows.length, incomplete: inc.length };
}
module.exports = { fixture, compute, wordMatch, norm, DIR };

// بانک گستردهٔ سؤال دستیار (داده ساختگی): هر سؤال پایه با «لحن‌های واقعی» بازنویسی می‌شود تا گستره هزاران برابر شود.
// پایه: tests/lib/assistant-corpus.js؛ اینجا فقط پیشوند/پسوند محاوره‌ای، حروف عربی (ي ك)، نیم‌فاصله و علامت‌ها عوض می‌شود.
// هدف: پاسخ نباید با عوض شدن «لحن گفتن» عوض شود.
'use strict';
const { build } = require('./assistant-corpus.js');

const PRE = ['', 'ببین ', 'راستی ', 'یه سوال داشتم، ', 'داداش ', 'لطفاً ', 'خب ', 'اگه میشه ', 'میخواستم بدونم ', 'یه چیزی بگو ', 'سلام ببخشید ', 'عزیزم '];
const SUF = ['', ' دیگه', ' لطفاً', ' ممنون', ' بگو', ' ؟', '؟؟', ' خواهشاً', ' راستش'];
const SKIP = new Set(['chat', 'smalltalk']);   // گفتگوی عادی با پیشوند معنی دیگری می‌گیرد

function arabic(s) { return s.replace(/ی/g, 'ي').replace(/ک/g, 'ك'); }
function noZwnj(s) { return s.replace(/‌/g, ' '); }
function noMark(s) { return s.replace(/[؟?]/g, ''); }
function enDigits(s) { return s.replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06F0)); }

function buildWide() {
  const base = build().filter((it) => !SKIP.has(it.kind));
  const out = [];
  base.forEach((it, i) => {
    const mk = (q, tag) => out.push(Object.assign({}, it, { q, kind: 'wide-' + tag, fuzzy: true }));
    const pre = PRE[(i * 7 + 3) % PRE.length], suf = SUF[(i * 5 + 1) % SUF.length];
    const bare = it.q.replace(/[؟?]+$/, '');
    mk(pre + bare + suf, 'tone');
    mk(arabic(it.q), 'arabic');
    mk(noMark(noZwnj(it.q)), 'plain');
    if (/[۰-۹]/.test(it.q)) mk(enDigits(it.q), 'digits');
    if (i % 3 === 0) mk(PRE[(i * 3 + 5) % PRE.length] + bare + SUF[(i * 11 + 2) % SUF.length], 'tone2');
  });
  return out;
}
module.exports = { buildWide };

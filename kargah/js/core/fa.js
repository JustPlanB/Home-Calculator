/* ارقام و قالب‌بندی فارسی — همان رفتار حساب‌کتاب: رقم فارسی، جداکننده‌ی لاتین «,» */
const FA = '۰۱۲۳۴۵۶۷۸۹';
const AR = '٠١٢٣٤٥٦٧٨٩';
export const toFa = (s) => String(s).replace(/\d/g, (d) => FA[d]);
export const toEn = (s) => String(s)
  .replace(/[۰-۹]/g, (d) => FA.indexOf(d))
  .replace(/[٠-٩]/g, (d) => AR.indexOf(d));
export const fmtNum = (n) => toFa(Math.round(Number(n) || 0).toLocaleString('en-US').replace('-', '−'));
export const fmtPct = (n) => toFa(Math.round(Number(n) || 0)) + '٪';
export function parseNum(s) {
  const t = toEn(s).replace(/[,٬،\s]/g, '').replace(/٪|%/g, '');
  if (t === '' || t === '-') return NaN;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}
export const initials = (name) => {
  const w = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!w.length) return '؟';
  return w.length === 1 ? w[0].slice(0, 1) : w[0].slice(0, 1) + '‌' + w[w.length - 1].slice(0, 1);
};

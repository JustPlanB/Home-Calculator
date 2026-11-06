/* تقویم شمسی. تاریخ‌ها در برنامه رشته‌ی «۱۴۰۵-۰۷-۲۵» با ارقام لاتین هستند (ISO شمسی). */
import { toFa, toEn } from './fa.js';

const div = (a, b) => Math.trunc(a / b);
const mod = (a, b) => a - Math.trunc(a / b) * b;
const BREAKS = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];

function jalCal(jy, withoutLeap) {
  const bl = BREAKS.length, gy = jy + 621;
  let leapJ = -14, jp = BREAKS[0], jm, jump = 0, n, i;
  if (jy < jp || jy >= BREAKS[bl - 1]) throw new RangeError('سال شمسی نامعتبر: ' + jy);
  for (i = 1; i < bl; i += 1) {
    jm = BREAKS[i]; jump = jm - jp;
    if (jy < jm) break;
    leapJ += div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  n = jy - jp;
  leapJ += div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  if (withoutLeap) return { gy, march };
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { leap, gy, march };
}
const g2d = (gy, gm, gd) => {
  let d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4) + div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
};
const d2g = (jdn) => {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1, gm = mod(div(i, 153), 12) + 1;
  return { gy: div(j, 1461) - 100100 + div(8 - gm, 6), gm, gd };
};
const j2d = (jy, jm, jd) => {
  const r = jalCal(jy, true);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
};
const d2j = (jdn) => {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy, false), jdn1f = g2d(gy, 3, r.march);
  let k = jdn - jdn1f;
  if (k >= 0) {
    if (k <= 185) return { y: jy, m: 1 + div(k, 31), d: mod(k, 31) + 1 };
    k -= 186;
  } else {
    jy -= 1; k += 179;
    if (r.leap === 1) k += 1;
  }
  return { y: jy, m: 7 + div(k, 30), d: mod(k, 30) + 1 };
};

export const MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
export const WEEKDAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

export const isLeapJ = (y) => jalCal(y, false).leap === 0;
export const daysInMonthJ = (y, m) => (m <= 6 ? 31 : m <= 11 ? 30 : isLeapJ(y) ? 30 : 29);

const pad = (n) => String(n).padStart(2, '0');
export const makeJ = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
export function parseJ(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(toEn(String(s).trim()).replace(/\//g, '-'));
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  if (mo < 1 || mo > 12 || d < 1 || d > daysInMonthJ(y, mo)) return null;
  return { y, m: mo, d };
}
export const isValidJ = (s) => parseJ(s) !== null;

export const jdnOf = (s) => { const p = parseJ(s); return p ? j2d(p.y, p.m, p.d) : NaN; };
export const fromJdn = (jdn) => { const p = d2j(jdn); return makeJ(p.y, p.m, p.d); };
export const addDaysJ = (s, n) => fromJdn(jdnOf(s) + n);
export const diffDaysJ = (a, b) => jdnOf(a) - jdnOf(b);          // a − b
export const weekdayJ = (s) => mod(jdnOf(s) + 2, 7);                // ۰ = شنبه
export const weekdayNameJ = (s) => WEEKDAYS[weekdayJ(s)];

export function fromDate(date) {
  return fromJdn(g2d(date.getFullYear(), date.getMonth() + 1, date.getDate()));
}
let todayOverride = null;
export const setToday = (s) => { todayOverride = s; };          // برای تست و نمونه‌ی ثابت
export const todayJ = () => todayOverride || fromDate(new Date());
export const toGregorian = (s) => { const g = d2g(jdnOf(s)); return new Date(g.gy, g.gm - 1, g.gd); };

export const fmtJ = (s) => { const p = parseJ(s); return p ? toFa(`${p.y}/${pad(p.m)}/${pad(p.d)}`) : '—'; };
export const fmtLongJ = (s) => {
  const p = parseJ(s); if (!p) return '—';
  return `${weekdayNameJ(s)} ${toFa(p.d)} ${MONTHS[p.m - 1]} ${toFa(p.y)}`;
};
export const fmtShortJ = (s) => { const p = parseJ(s); return p ? `${toFa(p.d)} ${MONTHS[p.m - 1]}` : '—'; };

/** متنی که کاربر می‌نویسد (۱۴۰۵/۷/۳، با ارقام فارسی یا لاتین) را به «1405-07-03» برمی‌گرداند؛ نامعتبر = null */
export function parseInputJ(text) {
  const t = toEn(String(text).trim()).replace(/\//g, '-').replace(/-(\d)(?=-|$)/g, '-0$1');
  const p = parseJ(t);
  return p ? makeJ(p.y, p.m, p.d) : null;
}

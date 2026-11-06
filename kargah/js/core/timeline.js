/* منطق خالص محور زمان (بدون DOM): سطح جزئیات بر اساس زوم، چیدن جعبه‌ها در ردیف‌ها، بازه‌ی زمانی.
   «ppd» یعنی پیکسل برای هر روز؛ هرچه بزرگ‌تر، زوم بیشتر. */
import { addDaysJ, diffDaysJ } from './jalali.js';

export const MAX_PPD = 140;
export const LOD_NAMES = ['ماه', 'هفته', 'روز', 'جزئیات'];

/** سطح جزئیات: ۰ فقط جعبه‌ها، ۱ عنوان، ۲ + متراژ و نفرات، ۳ + نمودار روزانه و غیبت و نام کارگرها */
export const lodOf = (ppd) => (ppd < 7 ? 0 : ppd < 22 ? 1 : ppd < 56 ? 2 : 3);

export const clampPpd = (ppd, min) => Math.max(min, Math.min(MAX_PPD, ppd));

/** فاصله‌ی برچسب روزها طوری که بین دو برچسب حداقل ۳۰ پیکسل بماند */
export function dayStep(ppd) {
  return [1, 2, 5, 7, 10, 15, 30].find((s) => s * ppd >= 30) ?? 30;
}

/** هر جعبه یک ردیف می‌گیرد؛ جعبه‌هایی که با هم همپوشانی ندارند در یک ردیف می‌مانند (حریصانه) */
export function packLanes(works) {
  const sorted = [...works].sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));
  const ends = [], lane = {};
  for (const w of sorted) {
    let i = ends.findIndex((e) => w.start > e);
    if (i < 0) { i = ends.length; ends.push(w.end); } else ends[i] = w.end;
    lane[w.id] = i;
  }
  return { lane, count: ends.length };
}

/** بازه‌ی نمایش: از اولین شروع تا آخرین پایان (و امروز)، با کمی حاشیه */
export function timeRange(works, today, pad = 3) {
  let first = today, last = today;
  for (const w of works) { if (w.start < first) first = w.start; if (w.end > last) last = w.end; }
  first = addDaysJ(first, -pad); last = addDaysJ(last, pad);
  return { first, last, days: diffDaysJ(last, first) + 1 };
}

/** تاریخ بعدی که می‌شود برایش کارکرد ثبت کرد: امروز؛ اگر ثبت شده، روز قبلِ ثبت‌نشده */
export function nextLogDate(log, today, start) {
  const has = new Set(log.map((l) => l.date));
  for (let d = today; d >= start; d = addDaysJ(d, -1)) if (!has.has(d)) return d;
  return null;
}

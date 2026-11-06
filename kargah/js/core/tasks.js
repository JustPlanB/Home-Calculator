/* منطق خالص کارها (بدون DOM) — قابل تست.
   قاعده از یادداشت: کارِ انجام‌نشده‌ی روزهای قبل در «باقی‌مانده» می‌آید؛ کارهای انجام‌شده به فهرست کلی می‌روند. */
import { diffDaysJ } from './jalali.js';

export function tasksForDay(tasks, day) {
  const today = tasks.filter((t) => t.date === day);
  const carried = tasks.filter((t) => t.date < day && (!t.done || t.doneDate === day));
  return { today, carried };
}

export function dayStatus(list) {
  const total = list.length;
  const done = list.filter((t) => t.done).length;
  return { total, done, left: total - done, allDone: total > 0 && done === total, pct: total ? Math.round((done / total) * 100) : 0 };
}

export function groupByTrade(list, trades) {
  const out = [];
  for (const tr of trades) {
    const items = list.filter((t) => t.tradeId === tr.id);
    if (items.length) out.push({ trade: tr, items });
  }
  return out;
}

/* پیشرفت کل پروژه: میانگین وزنی پیشرفت هر عملیات بر اساس طول بازه‌اش */
export function overallProgress(plans) {
  let w = 0, s = 0;
  for (const p of plans) {
    const len = Math.max(1, diffDaysJ(p.end, p.start) + 1);
    w += len; s += len * p.progress;
  }
  return w ? Math.round(s / w) : 0;
}

/* پیشرفت امروز نسبت به دیروز از روی گزارش‌های ناظر */
export function reportDelta(reports, report) {
  const prev = reports.filter((r) => r.date < report.date).sort((a, b) => b.date.localeCompare(a.date))[0];
  return prev ? report.progress - prev.progress : null;
}

let n = 0;
export const uid = (p = 'x') => `${p}${Date.now().toString(36)}${(n++).toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;

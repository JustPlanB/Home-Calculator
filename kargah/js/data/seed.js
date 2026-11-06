/* داده‌ی نمونه — همه‌ی تاریخ‌ها نسبت به «امروز» ساخته می‌شوند تا نمونه همیشه زنده به نظر برسد. */
import { addDaysJ, diffDaysJ, weekdayJ } from '../core/jalali.js';

/* تولیدکننده‌ی شبه‌تصادفی با دانه‌ی ثابت: داده‌ی نمونه همیشه یکسان می‌ماند (برای تست و عکس) */
const mulberry = (a) => () => {
  a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/* کارکرد روزانه‌ی یک کار از شروع تا دیروز؛ جمعه تعطیل؛ گاهی یک نفر غایب و کارکرد کمتر */
function makeLog(w, today, rnd) {
  const days = diffDaysJ(w.end, w.start) + 1;
  let working = 0;
  for (let i = 0; i < days; i++) if (weekdayJ(addDaysJ(w.start, i)) !== 6) working++;
  const per = w.qty / working, log = [];
  for (let i = 0; i < days; i++) {
    const day = addDaysJ(w.start, i);
    if (day >= today) break;
    if (weekdayJ(day) === 6) continue;
    const absent = rnd() < 0.14 ? 1 : 0;
    log.push({ date: day, done: Math.round(per * (0.7 + rnd() * 0.6) * (absent ? 0.65 : 1)), absent });
  }
  if (w.end < today && log.length) {            // کار تمام‌شده: جمع دقیقاً برابر کل متراژ
    const sum = log.reduce((s, l) => s + l.done, 0);
    log[log.length - 1].done = Math.max(0, log[log.length - 1].done + w.qty - sum);
  }
  return log;
}

export function seedState(today) {
  const d = (n) => addDaysJ(today, n);
  const trades = [
    { id: 't-brick', name: 'آجرکاری', icon: 'brick', color: 1 },
    { id: 't-pipe', name: 'لوله‌کشی', icon: 'pipe', color: 2 },
    { id: 't-gas', name: 'گاز', icon: 'flame', color: 3 },
    { id: 't-bitumen', name: 'قیرگونی', icon: 'layers', color: 4 },
    { id: 't-elec', name: 'برق', icon: 'bolt', color: 5 },
  ];
  const people = [
    { id: 'p1', name: 'رضا کریمی', role: 'استادکار', tradeId: 't-brick', phone: '۰۹۱۲۱۱۱۲۲۳۳' },
    { id: 'p2', name: 'حسن نوری', role: 'کارگر', tradeId: 't-brick', phone: '۰۹۱۲۳۳۳۴۴۵۵' },
    { id: 'p3', name: 'مهدی صادقی', role: 'لوله‌کش', tradeId: 't-pipe', phone: '۰۹۱۹۵۵۵۶۶۷۷' },
    { id: 'p4', name: 'علی رضایی', role: 'جوشکار گاز', tradeId: 't-gas', phone: '۰۹۳۵۷۷۷۸۸۹۹' },
    { id: 'p5', name: 'سعید امینی', role: 'قیرگون', tradeId: 't-bitumen', phone: '۰۹۱۲۹۹۹۰۰۱۱' },
    { id: 'p6', name: 'کامران یزدانی', role: 'برقکار', tradeId: 't-elec', phone: '۰۹۱۳۱۲۱۲۳۴۳' },
  ];
  const T = (id, tradeId, title, date, done, who, doneDate) => ({ id, tradeId, title, date, done, doneDate: done ? (doneDate || date) : null, people: who });
  const tasks = [
    // دو روز پیش و دیروز — بعضی ناتمام (باقی‌مانده)
    T('k1', 't-pipe', 'تست فشار لوله‌های طبقه‌ی دوم', d(-2), false, ['p3']),
    T('k2', 't-brick', 'دیوارچینی محور B طبقه‌ی سوم', d(-1), false, ['p1', 'p2']),
    T('k3', 't-gas', 'نصب کلاهک‌ها و مهار لوله‌ی گاز', d(-1), true, ['p4']),
    // امروز
    T('k4', 't-brick', 'دیوارچینی محور C طبقه‌ی سوم', d(0), true, ['p1', 'p2']),
    T('k5', 't-brick', 'تخلیه‌ی آجر و چیدن در انبار', d(0), true, ['p2']),
    T('k6', 't-brick', 'اجرای سردر پنجره‌ها', d(0), false, ['p1']),
    T('k7', 't-pipe', 'لوله‌کشی سرویس بهداشتی طبقه‌ی سوم', d(0), true, ['p3']),
    T('k8', 't-pipe', 'نصب شیرآلات ورودی', d(0), false, ['p3']),
    T('k9', 't-bitumen', 'قیرگونی کف تراس', d(0), false, ['p5']),
    T('k10', 't-elec', 'لوله‌گذاری برق طبقه‌ی دوم', d(0), true, ['p6']),
    // فردا
    T('k11', 't-brick', 'دیوارچینی محور D طبقه‌ی سوم', d(1), false, ['p1', 'p2']),
    T('k12', 't-gas', 'تست فشار لوله‌کشی گاز', d(1), false, ['p4']),
    T('k13', 't-elec', 'سیم‌کشی طبقه‌ی دوم', d(1), false, ['p6']),
  ];
  const rnd = mulberry(1405);
  const W = (id, tradeId, title, a, b, unit, qty, who) => {
    const w = { id, tradeId, title, start: d(a), end: d(b), unit, qty, progress: 0, people: who };
    return { ...w, log: makeLog(w, today, rnd) };
  };
  const plans = [
    W('w1', 't-brick', 'دیوارچینی طبقه‌ی دوم', -45, -12, 'متر', 380, ['p1', 'p2']),
    W('w2', 't-brick', 'دیوارچینی طبقه‌ی سوم', -11, 14, 'متر', 400, ['p1', 'p2']),
    W('w3', 't-pipe', 'لوله‌کشی طبقه‌ی دوم', -20, 5, 'متر', 180, ['p3']),
    W('w4', 't-pipe', 'لوله‌کشی طبقه‌ی سوم', 6, 26, 'متر', 200, ['p3']),
    W('w5', 't-gas', 'لوله‌کشی گاز', -6, 9, 'متر', 90, ['p4']),
    W('w6', 't-bitumen', 'قیرگونی بام', -2, 10, 'متر مربع', 140, ['p5']),
    W('w7', 't-elec', 'لوله‌گذاری برق', -10, 18, 'متر', 220, ['p6']),
    W('w8', 't-elec', 'سیم‌کشی', 19, 40, 'متر', 300, ['p6']),
  ];
  const reports = [
    { id: 'r1', date: d(-1), author: 'ناظر سپهر', progress: 51, note: 'دیوارچینی طبقه‌ی سوم ادامه دارد. گچ کامیون ساعت ۴ وارد شد.', tags: ['پیشرفت', 'انبار'] },
    { id: 'r2', date: d(0), author: 'ناظر سپهر', progress: 53, note: 'امروز یک اتاق خواب دیگر دیوارچینی شد. برای دیوارچینی هفته‌ی بعد گچ لازم است.', tags: ['پیشرفت', 'سفارش'] },
  ];
  const orders = [
    { id: 'o1', item: 'گچ (کیسه‌ی ۴۰ کیلویی)', qty: 50, unit: 'کیسه', neededBy: d(3), orderedBy: 'ناظر سپهر', status: 'pending' },
    { id: 'o2', item: 'آجر ۱۰ سوراخ', qty: 4000, unit: 'عدد', neededBy: d(5), orderedBy: 'ناظر سپهر', status: 'ordered' },
    { id: 'o3', item: 'لوله‌ی پنج‌لایه ۳/۴ اینچ', qty: 120, unit: 'متر', neededBy: d(-1), orderedBy: 'مهدی صادقی', status: 'delivered' },
  ];
  return {
    v: 2, demo: true, theme: 'dark',
    project: { id: 'prj1', name: 'ساختمان نمونه — خیابان گلستان', startDate: d(-45), endDate: d(30) },
    trades, people, tasks, plans, reports, orders,
  };
}

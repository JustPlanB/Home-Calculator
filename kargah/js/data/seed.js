/* داده‌ی نمونه — همه‌ی تاریخ‌ها نسبت به «امروز» ساخته می‌شوند تا نمونه همیشه زنده به نظر برسد. */
import { addDaysJ } from '../core/jalali.js';

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
  const plans = [
    { id: 'pl1', tradeId: 't-brick', start: d(-30), end: d(12), progress: 78, crew: 4, absent: 1 },
    { id: 'pl2', tradeId: 't-pipe', start: d(-20), end: d(18), progress: 52, crew: 2, absent: 0 },
    { id: 'pl3', tradeId: 't-gas', start: d(-6), end: d(9), progress: 40, crew: 1, absent: 0 },
    { id: 'pl4', tradeId: 't-bitumen', start: d(-2), end: d(10), progress: 12, crew: 2, absent: 1 },
    { id: 'pl5', tradeId: 't-elec', start: d(-10), end: d(26), progress: 36, crew: 2, absent: 0 },
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
    v: 1, demo: true, theme: 'dark',
    project: { id: 'prj1', name: 'ساختمان نمونه — خیابان گلستان', startDate: d(-45), endDate: d(30) },
    trades, people, tasks, plans, reports, orders,
  };
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { toFa, toEn, fmtNum, parseNum, fmtPct } from '../js/core/fa.js';
import { addDaysJ, diffDaysJ, weekdayJ, fromDate, parseJ, fmtJ, fmtLongJ, daysInMonthJ, isLeapJ, makeJ, toGregorian } from '../js/core/jalali.js';
import { tasksForDay, dayStatus, groupByTrade, overallProgress, reportDelta } from '../js/core/tasks.js';
import { seedState } from '../js/data/seed.js';
import { ICONS } from '../js/ui/icons.js' ;

test('ارقام فارسی و عددخوانی', () => {
  assert.equal(toFa('1405/07/25'), '۱۴۰۵/۰۷/۲۵');
  assert.equal(toEn('۱۴۰۵٫٣'), '1405٫3');
  assert.equal(fmtNum(14090000), '۱۴,۰۹۰,۰۰۰');
  assert.equal(fmtNum(-1800000), '−۱,۸۰۰,۰۰۰');
  assert.equal(parseNum('۱,۵۰۰,۰۰۰'), 1500000);
  assert.equal(parseNum('۵۰٪'), 50);
  assert.ok(Number.isNaN(parseNum('abc')));
  assert.equal(fmtPct(52.4), '۵۲٪');
});

test('تقویم شمسی با Intl یکی است (۱۴۰۰ تا ۱۴۱۰، هر روز)', () => {
  const f = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC' });
  let n = 0;
  for (let t = Date.UTC(2021, 2, 1); t < Date.UTC(2031, 2, 30); t += 86400000) {
    const d = new Date(t);
    const parts = Object.fromEntries(f.formatToParts(d).map((p) => [p.type, p.value]));
    const mine = fromDate(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    assert.equal(mine, makeJ(+parts.year, +parts.month, +parts.day), 'روز ' + d.toISOString());
    n++;
  }
  assert.ok(n > 3600);
});

test('محاسبه‌ی روز، هفته و ماه', () => {
  assert.equal(addDaysJ('1405-07-25', 6), '1405-08-01');
  assert.equal(addDaysJ('1403-12-29', 1), '1403-12-30');   // ۱۴۰۳ کبیسه است
  assert.equal(addDaysJ('1404-12-29', 1), '1405-01-01');   // ۱۴۰۴ کبیسه نیست
  assert.equal(diffDaysJ('1405-08-01', '1405-07-25'), 6);
  assert.equal(weekdayJ('1405-07-25'), 0);           // ۲۵ مهر ۱۴۰۵ = شنبه (۱۷ اکتبر ۲۰۲۶)
  assert.equal(fmtLongJ('1405-07-25'), 'شنبه ۲۵ مهر ۱۴۰۵');
  assert.equal(fmtJ('1405-02-05'), '۱۴۰۵/۰۲/۰۵');
  assert.equal(parseJ('1405-13-01'), null);
  assert.equal(parseJ('1405-07-31'), null);
  assert.equal(daysInMonthJ(1405, 6), 31);
  assert.deepEqual(toGregorian('1405-07-25').toDateString(), new Date(2026, 9, 17).toDateString());
});

test('کارهای باقی‌مانده به روز بعد منتقل می‌شوند', () => {
  const T = (id, date, done, doneDate = null) => ({ id, tradeId: 'a', title: id, date, done, doneDate });
  const tasks = [T('old-open', '1405-07-23', false), T('old-done', '1405-07-23', true, '1405-07-23'),
    T('old-done-today', '1405-07-23', true, '1405-07-25'), T('today', '1405-07-25', false), T('tomorrow', '1405-07-26', false)];
  const { today, carried } = tasksForDay(tasks, '1405-07-25');
  assert.deepEqual(today.map((t) => t.id), ['today']);
  assert.deepEqual(carried.map((t) => t.id), ['old-open', 'old-done-today']);   // انجام‌شده‌ی قبلی دیده نمی‌شود
  assert.equal(tasksForDay(tasks, '1405-07-26').carried.map((t) => t.id).includes('today'), true);
});

test('وضعیت روز و «همه انجام شد»', () => {
  assert.deepEqual(dayStatus([]), { total: 0, done: 0, left: 0, allDone: false, pct: 0 });
  assert.equal(dayStatus([{ done: true }, { done: true }]).allDone, true);
  assert.equal(dayStatus([{ done: true }, { done: false }]).pct, 50);
});

test('گروه‌بندی، پیشرفت کل و تغییر گزارش', () => {
  const trades = [{ id: 'a' }, { id: 'b' }];
  assert.deepEqual(groupByTrade([{ tradeId: 'b' }], trades).map((g) => g.trade.id), ['b']);
  assert.equal(overallProgress([{ start: '1405-01-01', end: '1405-01-10', progress: 100 }, { start: '1405-01-01', end: '1405-01-10', progress: 0 }]), 50);
  const reports = [{ date: '1405-07-24', progress: 51 }, { date: '1405-07-25', progress: 53 }];
  assert.equal(reportDelta(reports, reports[1]), 2);
  assert.equal(reportDelta(reports, reports[0]), null);
});

test('داده‌ی نمونه سالم است', () => {
  const s = seedState('1405-07-25');
  const ids = new Set(s.trades.map((t) => t.id));
  assert.ok(s.tasks.every((t) => ids.has(t.tradeId)));
  assert.ok(s.plans.every((p) => ids.has(p.tradeId) && p.start <= p.end));
  assert.ok(s.trades.every((t) => ICONS[t.icon]), 'آیکن هر عملیات باید در icons.js باشد');
});

/* ───── محور زمان ───── */
import { lodOf, dayStep, packLanes, timeRange, nextLogDate, clampPpd, MAX_PPD } from '../js/core/timeline.js';
import { workDone, workProgress } from '../js/core/tasks.js';
import { migrate } from '../js/core/migrate.js';
import { parseInputJ } from '../js/core/jalali.js';

test('سطح جزئیات از روی زوم', () => {
  assert.deepEqual([3, 6.9, 7, 21.9, 22, 55.9, 56, 140].map(lodOf), [0, 0, 1, 1, 2, 2, 3, 3]);
  assert.equal(clampPpd(999, 2), MAX_PPD);
  assert.equal(clampPpd(0.1, 2), 2);
});

test('فاصله‌ی برچسب روزها حداقل ۳۰ پیکسل', () => {
  for (const ppd of [7, 10, 14, 22, 40, 100]) assert.ok(dayStep(ppd) * ppd >= 30, 'ppd=' + ppd);
  assert.equal(dayStep(40), 1);
  assert.equal(dayStep(10), 5);
});

test('چیدن جعبه‌ها در ردیف: بدون همپوشانی در یک ردیف', () => {
  const w = (id, start, end) => ({ id, start, end });
  const { lane, count } = packLanes([w('b', '1405-07-05', '1405-07-20'), w('a', '1405-07-01', '1405-07-10'), w('c', '1405-07-11', '1405-07-15'), w('d', '1405-07-21', '1405-07-25')]);
  assert.equal(lane.a, 0);
  assert.equal(lane.b, 1);          // با a همپوشانی دارد
  assert.equal(lane.c, 0);          // بعد از پایان a
  assert.equal(lane.d, 0);          // بعد از c
  assert.equal(count, 2);
  assert.equal(packLanes([]).count, 0);
  assert.equal(packLanes([w('x', '1405-07-01', '1405-07-05'), w('y', '1405-07-05', '1405-07-09')]).count, 2, 'روز مشترک یعنی همپوشانی');
});

test('بازه‌ی نمایش شامل امروز و حاشیه است', () => {
  const r = timeRange([{ start: '1405-07-10', end: '1405-07-20' }], '1405-07-25', 3);
  assert.equal(r.first, '1405-07-07');
  assert.equal(r.last, '1405-07-28');
  assert.equal(r.days, 22);
  assert.equal(timeRange([], '1405-07-25', 0).days, 1);
});

test('تاریخ بعدی ثبت کارکرد', () => {
  const log = [{ date: '1405-07-25' }, { date: '1405-07-24' }];
  assert.equal(nextLogDate([], '1405-07-25', '1405-07-20'), '1405-07-25');
  assert.equal(nextLogDate(log, '1405-07-25', '1405-07-20'), '1405-07-23');
  assert.equal(nextLogDate([{ date: '1405-07-25' }], '1405-07-25', '1405-07-25'), null);
});

test('پیشرفت کار از متراژ می‌آید، وگرنه از درصد دستی', () => {
  const w = { qty: 200, log: [{ done: 50 }, { done: 30 }], progress: 99 };
  assert.equal(workDone(w), 80);
  assert.equal(workProgress(w), 40);
  assert.equal(workProgress({ qty: 10, log: [{ done: 50 }] }), 100, 'سقف ۱۰۰');
  assert.equal(workProgress({ qty: 0, progress: 33, log: [] }), 33);
  assert.equal(workProgress({ progress: 12 }), 12);
});

test('ارتقای داده‌ی نسخه‌ی ۱ به ۲', () => {
  const v1 = { v: 1, trades: [{ id: 't', name: 'آجرکاری' }], people: [{ id: 'p', tradeId: 't' }, { id: 'q', tradeId: 'x' }],
    plans: [{ id: 'a', tradeId: 't', start: '1405-07-01', end: '1405-07-10', progress: 40, crew: 3, absent: 1 }] };
  const v2 = migrate(structuredClone(v1));
  assert.equal(v2.v, 2);
  assert.equal(v2.plans[0].title, 'آجرکاری');
  assert.deepEqual(v2.plans[0].people, ['p']);
  assert.deepEqual(v2.plans[0].log, []);
  assert.equal(workProgress(v2.plans[0]), 40, 'درصد قبلی حفظ شود');
  assert.equal(migrate({ v: 2, plans: [] }).v, 2);
});

test('خواندن تاریخ ورودی کاربر', () => {
  assert.equal(parseInputJ('۱۴۰۵/۷/۳'), '1405-07-03');
  assert.equal(parseInputJ('1405-07-30'), '1405-07-30');
  assert.equal(parseInputJ('1405/07/31'), null);
  assert.equal(parseInputJ('abc'), null);
});

test('کارکردهای داده‌ی نمونه معتبرند', () => {
  const s = seedState('1405-07-25');
  for (const p of s.plans) {
    assert.ok(Array.isArray(p.people) && p.people.every((id) => s.people.some((x) => x.id === id)), p.id + ' کارگر ناشناس');
    const dates = p.log.map((l) => l.date);
    assert.equal(new Set(dates).size, dates.length, p.id + ' تاریخ تکراری');
    for (const l of p.log) {
      assert.ok(l.date >= p.start && l.date <= p.end && l.date < '1405-07-25', p.id + ' کارکرد خارج از بازه');
      assert.notEqual(weekdayJ(l.date), 6, 'جمعه کارکرد ندارد');
      assert.ok(l.done >= 0 && l.absent >= 0);
    }
  }
  assert.equal(workProgress(s.plans.find((p) => p.id === 'w1')), 100, 'کار تمام‌شده صددرصد است');
  assert.deepEqual(seedState('1405-07-25').plans, s.plans, 'نمونه قطعی است');
});

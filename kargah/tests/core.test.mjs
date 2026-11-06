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

/* کارهای یک روز — «امروز» و «فردا» هر دو از همین تابع می‌آیند.
   قاعده‌ی یادداشت: ناتمام‌های روزهای قبل در «باقی‌مانده» می‌آیند؛ با تیک‌خوردن همه، پیام «همه انجام شد». */
import { h } from '../core/dom.js';
import { icon, disc } from '../ui/icons.js';
import { checkbox, avatars, chip, deleteOp, card, addPill } from '../ui/controls.js';
import { confirmDialog, toast } from '../ui/overlay.js';
import { get, update } from '../core/store.js';
import { todayJ, addDaysJ, fmtLongJ, fmtShortJ } from '../core/jalali.js';
import { tasksForDay, dayStatus, groupByTrade } from '../core/tasks.js';
import { toFa } from '../core/fa.js';
import { openAddTask } from '../ui/forms.js';
import { screenHead, tradeOf, colorVar, personName } from './common.js';

function taskRow(st, t, day, { future }) {
  const names = (t.people || []).map((id) => personName(st, id)).filter(Boolean);
  const carriedFrom = t.date < day;
  return h('div', { class: 'k-listrow' + (t.done ? ' is-done' : '') },
    checkbox(t.done, (val) => update((s) => {
      const x = s.tasks.find((k) => k.id === t.id); x.done = val; x.doneDate = val ? day : null;
    }), { disabled: future }),
    h('div', { class: 'k-grow' },
      h('div', { class: 'k-listrow__title' }, t.title),
      carriedFrom && h('div', { class: 'k-xs k-warn' }, 'از ' + fmtShortJ(t.date))),
    names.length > 0 && avatars(names),
    deleteOp(async () => {
      if (await confirmDialog({ message: 'این کار حذف شود؟' })) { update((s) => { s.tasks = s.tasks.filter((k) => k.id !== t.id); }); toast('کار حذف شد'); }
    }));
}

export function dayScreen(st, { offset = 0 } = {}) {
  const day = addDaysJ(todayJ(), offset);
  const future = offset > 0;
  const { today, carried } = tasksForDay(st.tasks, day);
  const own = future ? today : today;
  const all = future ? own : [...carried, ...own];
  const stat = dayStatus(all);
  const title = (offset === 0 ? 'کارهای ' : offset === 1 ? 'کارهای فردا، ' : 'کارهای ') + fmtLongJ(day);

  const parts = [screenHead(title, { add: () => openAddTask(day), addLabel: 'کار جدید' })];

  if (stat.allDone && !future) {
    parts.push(h('div', { class: 'k-banner k-banner--green' }, icon('check'), 'همه‌ی کارهای محول‌شده‌ی امروز انجام شد'));
  } else if (!future) {
    parts.push(h('div', { class: 'k-banner' }, icon('list-checks'), `${toFa(stat.done)} از ${toFa(stat.total)} کار انجام شده`));
  }

  if (!future && carried.length) {
    parts.push(card({ title: 'باقی‌مانده از روزهای قبل', sub: toFa(carried.filter((t) => !t.done).length) + ' کار منتقل شده', iconName: 'repeat' },
      carried.map((t) => taskRow(st, t, day, { future }))));
  }

  const groups = groupByTrade(own, st.trades);
  groups.forEach(({ trade, items }) => {
    const d = dayStatus(items);
    parts.push(card({
      title: trade.name, sub: `${toFa(d.done)} از ${toFa(d.total)}`, iconName: trade.icon,
      actions: chip(toFa(d.pct) + '٪', d.allDone ? 'green' : ''),
    }, items.map((t) => taskRow(st, t, day, { future }))));
    parts[parts.length - 1].style.setProperty('--accent-line', colorVar(trade));
    parts[parts.length - 1].classList.add('k-card--trade');
  });

  if (!own.length && !carried.length) {
    parts.push(h('div', { class: 'k-empty' }, disc('calendar'), h('h3', {}, 'کاری برنامه‌ریزی نشده'), h('p', {}, 'با دکمه‌ی + کار جدید اضافه کنید.')));
  }
  parts.push(h('div', { style: { display: 'flex', justifyContent: 'center' } }, addPill('کار جدید', () => openAddTask(day))));
  return h('div', { class: 'k-stack' }, parts);
}

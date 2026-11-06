/* نقشه‌ی زمانی (گانت): هر عملیات یک نوار روی محور روز؛ خط «امروز»؛ زیرش جدول نفرات/غیبت/پیشرفت. */
import { h } from '../core/dom.js';
import { disc } from '../ui/icons.js';
import { createTable } from '../ui/table.js';
import { update } from '../core/store.js';
import { todayJ, addDaysJ, diffDaysJ, MONTHS, parseJ } from '../core/jalali.js';
import { toFa, fmtPct } from '../core/fa.js';
import { screenHead, tradeOf, colorVar } from './common.js';

const COL = 30;      // عرض هر روز (px)
const LABEL = 112;   // عرض ستون برچسب عملیات

export function timelineScreen(st) {
  const today = todayJ();
  const first = addDaysJ(st.plans.reduce((m, p) => (p.start < m ? p.start : m), today), -2);
  const last = addDaysJ(st.plans.reduce((m, p) => (p.end > m ? p.end : m), today), 2);
  const days = diffDaysJ(last, first) + 1;
  const width = days * COL;

  /* سربرگ: نام ماه روی اولین روز هر ماه + شماره‌ی روزها */
  const head = h('div', { class: 'k-gantt__days', style: { width: width + 'px' } });
  for (let i = 0; i < days; i++) {
    const day = addDaysJ(first, i), p = parseJ(day);
    head.append(h('div', { class: 'k-gantt__day' + (day === today ? ' is-today' : ''), style: { width: COL + 'px' } },
      (i === 0 || p.d === 1) ? h('em', {}, MONTHS[p.m - 1]) : null, toFa(p.d)));
  }

  const rows = st.plans.map((pl) => {
    const tr = tradeOf(st, pl.tradeId);
    const off = diffDaysJ(pl.start, first) * COL, w = (diffDaysJ(pl.end, pl.start) + 1) * COL;
    const bar = h('div', { class: 'k-gantt__bar', style: { insetInlineStart: off + 'px', width: w + 'px', background: colorVar(tr) } },
      h('i', { style: { width: pl.progress + '%' } }), h('span', {}, fmtPct(pl.progress)));
    return h('div', { class: 'k-gantt__row' },
      h('div', { class: 'k-gantt__label' }, disc(tr.icon, { small: true }), tr.name),
      h('div', { class: 'k-gantt__track', style: { width: width + 'px' } }, bar));
  });

  const todayIdx = diffDaysJ(today, first);
  const line = h('div', { class: 'k-gantt__today', style: { insetInlineStart: (LABEL + todayIdx * COL + COL / 2) + 'px' }, 'aria-hidden': 'true' });
  const inner = h('div', { class: 'k-gantt__in', style: { width: (width + LABEL) + 'px', '--label': LABEL + 'px' } },
    h('div', { class: 'k-gantt__headrow' }, h('div', { class: 'k-gantt__label' }), head), rows, line);
  const scroller = h('div', { class: 'k-gantt' }, inner);
  // پیمایش افقی به محل «امروز» (در RTL مقدار scrollLeft منفی است)
  requestAnimationFrame(() => { scroller.scrollLeft = -Math.max(0, todayIdx * COL - scroller.clientWidth / 2 + LABEL); });

  const table = createTable({
    title: 'نفرات و پیشرفت عملیات',
    columns: [
      { key: 'name', label: 'عملیات', type: 'text', editable: false },
      { key: 'crew', label: 'نفرات', type: 'num', total: 'sum' },
      { key: 'absent', label: 'غایب', type: 'num', total: 'sum' },
      { key: 'progress', label: 'پیشرفت', type: 'percent' },
    ],
    rows: st.plans.map((p) => ({ ...p, name: tradeOf(st, p.tradeId).name })),
    onCellChange: (row, key, value) => update((s) => { s.plans.find((p) => p.id === row.id)[key] = value; }),
  });

  return h('div', { class: 'k-stack' }, screenHead('نقشه‌ی زمانی پروژه'), scroller, table.el);
}

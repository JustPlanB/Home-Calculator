/* گزارش روزانه‌ی ناظر: پیشرفت نسبت به گزارش قبل، برچسب‌ها، سفارش‌های ثبت‌شده از همان گزارش. */
import { h } from '../core/dom.js';
import { icon } from '../ui/icons.js';
import { card, chip, avatar, progress, emptyState } from '../ui/controls.js';
import { reportDelta } from '../core/tasks.js';
import { fmtLongJ } from '../core/jalali.js';
import { toFa, fmtPct } from '../core/fa.js';
import { openAddReport } from '../ui/forms.js';
import { screenHead } from './common.js';

const TAG_TONE = { 'پیشرفت': 'green', 'انبار': 'blue', 'سفارش': 'warn', 'مشکل': 'red' };

export function reportsScreen(st) {
  const list = [...st.reports].sort((a, b) => b.date.localeCompare(a.date) || 0);
  const cards = list.map((r) => {
    const d = reportDelta(st.reports, r);
    return card({ title: r.author, sub: fmtLongJ(r.date) },
      h('div', { class: 'k-row', style: { justifyContent: 'space-between', margin: '4px 0 6px' } },
        h('span', { class: 'k-xs k-muted' }, 'پیشرفت کل'),
        h('span', { class: 'k-row' },
          d != null && chip((d >= 0 ? '+' : '−') + toFa(Math.abs(d)) + '٪ نسبت به گزارش قبل', d > 0 ? 'green' : d < 0 ? 'red' : '', d > 0 ? 'chevron-up' : d < 0 ? 'chevron-down' : null),
          h('b', {}, fmtPct(r.progress)))),
      progress(r.progress, 'green'),
      h('p', { style: { margin: '12px 0 10px', lineHeight: 1.9 } }, r.note),
      h('div', { class: 'k-row', style: { flexWrap: 'wrap' } }, r.tags.map((t) => chip(t, TAG_TONE[t] || '', 'tag'))));
  });
  return h('div', { class: 'k-stack' },
    screenHead('گزارش ناظر', { add: openAddReport, addLabel: 'گزارش جدید' }),
    cards.length ? cards : emptyState({ iconName: 'clipboard', title: 'گزارشی ثبت نشده', text: 'ناظر هر روز پیشرفت کار را اینجا ثبت می‌کند.' }));
}

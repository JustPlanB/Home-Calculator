/* صفحه‌ی اصلی: کارت خلاصه + کاشی‌های ابزار + نوار پایین (افزودن / پیشرفت کل / جستجو) */
import { h } from '../core/dom.js';
import { icon } from '../ui/icons.js';
import { statBox, tile, tileBox, addOp, searchOp, ring } from '../ui/controls.js';
import { go } from '../core/router.js';
import { todayJ } from '../core/jalali.js';
import { tasksForDay, dayStatus, overallProgress } from '../core/tasks.js';
import { toFa } from '../core/fa.js';
import { openAddTask, openSearch } from '../ui/forms.js';

export function home(st) {
  const day = todayJ();
  const { today, carried } = tasksForDay(st.tasks, day);
  const all = [...carried, ...today];
  const s = dayStatus(all);
  const overall = overallProgress(st.plans);

  const summary = h('section', { class: 'k-card k-card--raised k-home-summary' },
    h('h2', { class: 'k-card__title k-home-summary__name' }, st.project.name),
    h('div', { class: 'k-home-summary__grid' },
      h('button', { class: 'k-home-add', type: 'button', 'aria-label': 'کار جدید', onclick: () => openAddTask(day) }, icon('plus')),
      h('div', { class: 'k-stack', style: { display: 'grid', gap: '10px' } },
        statBox('کارهای امروز:', [
          { label: 'کل', value: toFa(s.total) },
          { label: 'انجام‌شده', value: toFa(s.done), tone: 'green' },
          { label: 'باقی‌مانده', value: toFa(s.left), tone: s.left ? 'red' : 'green' },
        ]),
        statBox('پروژه:', [
          { label: 'پیشرفت کل', value: toFa(overall) + '٪', tone: 'green' },
          { label: 'کار در حال اجرا', value: toFa(st.plans.filter((p) => p.start <= day && p.end >= day).length) },
        ]))));

  const tiles = [
    tileBox(
      tile({ label: 'کارهای امروز', iconName: 'list-checks', onclick: () => go('/daily') }),
      tile({ label: 'کارهای فردا', iconName: 'calendar', onclick: () => go('/tomorrow') }),
      tile({ label: 'نقشه‌ی زمانی', iconName: 'gantt', onclick: () => go('/timeline') })),
    tileBox(
      tile({ label: 'گزارش ناظر', iconName: 'clipboard', onclick: () => go('/reports') }),
      tile({ label: 'سفارش خرید', iconName: 'cart', onclick: () => go('/orders') }),
      tile({ label: 'پرسنل', iconName: 'users', onclick: () => go('/people') })),
    tileBox(
      tile({ label: 'انبار', iconName: 'box', badge: 'به‌زودی', onclick: () => go('/warehouse') }),
      tile({ label: 'مالی', iconName: 'wallet', badge: 'به‌زودی', onclick: () => go('/finance') }),
      tile({ label: 'مدارک', iconName: 'folder', badge: 'به‌زودی', onclick: () => go('/docs') })),
  ];
  return h('div', { class: 'k-stack' }, summary, tiles);
}

/* نوار پایین صفحه‌ی اصلی */
export function homeBottom(st) {
  const overall = overallProgress(st.plans);
  return h('div', { class: 'k-bottombar' }, h('div', { class: 'k-bottombar__in' },
    addOp(() => openAddTask(todayJ()), 'کار جدید', true),
    h('div', { class: 'k-bottombar__mid' }, h('b', {}, 'پیشرفت'), h('span', {}, toFa(overall) + '٪')),
    searchOp(openSearch)));
}

/* اجزای مشترک صفحه‌ها: سربرگ صفحه با «بازگشت» و عنوان. */
import { h } from '../core/dom.js';
import { backOp, addOp } from '../ui/controls.js';
import { back } from '../core/router.js';

export function screenHead(title, { add, addLabel } = {}) {
  return h('div', { class: 'k-screenhead' },
    backOp(back),
    h('h1', { class: 'k-screenhead__title' }, title),
    add ? addOp(add, addLabel) : h('span', { class: 'k-screenhead__gap' }));
}
export const tradeOf = (st, id) => st.trades.find((t) => t.id === id);
export const colorVar = (trade) => `var(--trade-${trade?.color || 1})`;
export const personName = (st, id) => st.people.find((p) => p.id === id)?.name || '';

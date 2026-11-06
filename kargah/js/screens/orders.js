/* سفارش‌های خرید: همان جدول استاندارد؛ ستون وضعیت با شیت انتخاب عوض می‌شود. */
import { h } from '../core/dom.js';
import { createTable } from '../ui/table.js';
import { update } from '../core/store.js';
import { uid } from '../core/tasks.js';
import { todayJ, addDaysJ } from '../core/jalali.js';
import { toast } from '../ui/overlay.js';
import { screenHead } from './common.js';

export const ORDER_STATUS = [
  { value: 'pending', label: 'در انتظار', tone: 'warn', icon: 'clock' },
  { value: 'ordered', label: 'سفارش شد', tone: 'blue', icon: 'truck' },
  { value: 'delivered', label: 'تحویل شد', tone: 'green', icon: 'check' },
];

export function ordersScreen(st) {
  const addRow = () => { update((s) => s.orders.push({ id: uid('o'), item: 'کالای جدید', qty: 1, unit: 'عدد', neededBy: addDaysJ(todayJ(), 3), orderedBy: 'ناظر سپهر', status: 'pending' })); toast('ردیف سفارش اضافه شد'); };
  const table = createTable({
    title: 'سفارش‌های خرید',
    columns: [
      { key: 'item', label: 'کالا', type: 'text', sub: (r) => r.orderedBy },
      { key: 'qty', label: 'مقدار', type: 'num', unit: (r) => r.unit },
      { key: 'neededBy', label: 'تاریخ نیاز', type: 'date' },
      { key: 'status', label: 'وضعیت', type: 'status', options: ORDER_STATUS },
    ],
    rows: st.orders,
    onCellChange: (row, key, value) => update((s) => { s.orders.find((o) => o.id === row.id)[key] = value; }),
    onDelete: (row) => update((s) => { s.orders = s.orders.filter((o) => o.id !== row.id); }),
    onAdd: addRow, addLabel: 'سفارش', emptyText: 'سفارشی ثبت نشده است',
  });
  return h('div', { class: 'k-stack' }, screenHead('سفارش خرید'), table.el);
}

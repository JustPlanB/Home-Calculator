/* پرسنل: جدول استاندارد با ستون انتخابی «عملیات». */
import { h } from '../core/dom.js';
import { createTable } from '../ui/table.js';
import { update } from '../core/store.js';
import { uid } from '../core/tasks.js';
import { toast } from '../ui/overlay.js';
import { screenHead } from './common.js';

export function peopleScreen(st) {
  const table = createTable({
    title: 'پرسنل پروژه',
    columns: [
      { key: 'name', label: 'نام', type: 'person', editable: false },
      { key: 'role', label: 'نقش', type: 'text' },
      { key: 'tradeId', label: 'عملیات', type: 'select', options: st.trades.map((t) => ({ value: t.id, label: t.name })) },
    ],
    rows: st.people,
    onCellChange: (row, key, value) => update((s) => { s.people.find((p) => p.id === row.id)[key] = value; }),
    onDelete: (row) => update((s) => { s.people = s.people.filter((p) => p.id !== row.id); }),
    onAdd: () => { update((s) => s.people.push({ id: uid('p'), name: 'فرد جدید', role: 'کارگر', tradeId: s.trades[0].id, phone: '' })); toast('فرد اضافه شد'); },
    addLabel: 'نفر', emptyText: 'کسی ثبت نشده است',
  });
  return h('div', { class: 'k-stack' }, screenHead('پرسنل'), table.el);
}

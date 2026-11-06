/* فرم‌های شیت‌ایی: کار جدید، گزارش ناظر، جستجو و منو. فقط از کامپوننت‌های مشترک ساخته شده‌اند. */
import { h } from '../core/dom.js';
import { get, update, exportBackup, importBackup, resetDemo } from '../core/store.js';
import { uid } from '../core/tasks.js';
import { fmtLongJ, fmtJ, todayJ, addDaysJ, diffDaysJ, fmtShortJ, parseInputJ } from '../core/jalali.js';
import { parseNum, toFa, fmtNum, fmtPct } from '../core/fa.js';
import { workDone, workProgress } from '../core/tasks.js';
import { nextLogDate } from '../core/timeline.js';
import { openSheet, confirmDialog, toast } from './overlay.js';
import { icon } from './icons.js';
import { field, textInput, numInput, textArea, chip, progress, avatar } from './controls.js';
import { createTable } from './table.js';
import { mount } from '../core/dom.js';
import { go } from '../core/router.js';

/* انتخاب چندتایی/تکی به شکل چیپ‌های قابل لمس */
function picker(items, selected, multi) {
  const sel = new Set(selected);
  const wrap = h('div', { class: 'k-row', style: { flexWrap: 'wrap', gap: '8px' } });
  const paint = () => [...wrap.children].forEach((b) => b.setAttribute('aria-pressed', String(sel.has(b.dataset.v))));
  items.forEach((it) => wrap.append(h('button', { class: 'k-chip k-chip--pick', type: 'button', data: { v: it.value }, onclick: () => {
    if (multi) { sel.has(it.value) ? sel.delete(it.value) : sel.add(it.value); } else { sel.clear(); sel.add(it.value); }
    paint();
  } }, it.label)));
  paint();
  return { el: wrap, value: () => (multi ? [...sel] : [...sel][0]) };
}

const cancel = { label: 'انصراف', onClick: (c) => c() };

export function openAddTask(day) {
  const st = get();
  const title = textInput({ placeholder: 'مثلاً: دیوارچینی محور C', 'aria-label': 'عنوان کار' });
  const trade = picker(st.trades.map((t) => ({ value: t.id, label: t.name })), [st.trades[0]?.id], false);
  const who = picker(st.people.map((p) => ({ value: p.id, label: p.name })), [], true);
  openSheet({
    title: 'کار جدید — ' + fmtLongJ(day),
    content: h('div', {}, field('عنوان کار', title), field('عملیات', trade.el), field('مسئول', who.el)),
    actions: [{ label: 'ثبت', kind: 'primary', onClick: (close) => {
      const t = title.value.trim();
      if (!t) { toast('عنوان کار را بنویسید'); return; }
      update((s) => s.tasks.push({ id: uid('k'), tradeId: trade.value(), title: t, date: day, done: false, doneDate: null, people: who.value() }));
      close(); toast('کار ثبت شد');
    } }, cancel],
  });
}

export function openAddReport() {
  const st = get();
  const last = [...st.reports].sort((a, b) => b.date.localeCompare(a.date))[0];
  const pct = numInput({ value: toFa(last ? last.progress : 0), 'aria-label': 'درصد پیشرفت کل' });
  const note = textArea({ placeholder: 'امروز چه کاری انجام شد؟', 'aria-label': 'شرح گزارش' });
  const tags = picker(['پیشرفت', 'انبار', 'سفارش', 'مشکل'].map((x) => ({ value: x, label: x })), ['پیشرفت'], true);
  const item = textInput({ placeholder: 'مثلاً: گچ', 'aria-label': 'کالا' });
  const qty = numInput({ placeholder: '۵۰', 'aria-label': 'مقدار' });
  const need = textInput({ placeholder: fmtJ(addDaysJ(todayJ(), 3)), class: 'k-input k-input--num', 'aria-label': 'تاریخ نیاز' });
  openSheet({
    title: 'گزارش جدید ناظر',
    content: h('div', {}, field('درصد پیشرفت کل پروژه', pct), field('شرح', note), field('برچسب', tags.el),
      h('p', { class: 'k-field__label', style: { marginTop: '16px' } }, 'سفارش خرید (اختیاری)'),
      field('کالا', item), field('مقدار', qty), field('تاریخ نیاز', need)),
    actions: [{ label: 'ثبت گزارش', kind: 'primary', onClick: (close) => {
      const p = parseNum(pct.value);
      if (!Number.isFinite(p) || p < 0 || p > 100) { toast('درصد را بین ۰ تا ۱۰۰ وارد کنید'); return; }
      if (!note.value.trim()) { toast('شرح گزارش را بنویسید'); return; }
      let order = null;
      if (item.value.trim()) {
        const q = parseNum(qty.value);
        const d = parseInputJ(need.value);
        if (!Number.isFinite(q) || q <= 0) { toast('مقدار سفارش را وارد کنید'); return; }
        if (!d) { toast('تاریخ نیاز را مثل ۱۴۰۵/۰۲/۰۵ وارد کنید'); return; }
        order = { id: uid('o'), item: item.value.trim(), qty: q, unit: 'عدد', neededBy: d, orderedBy: 'ناظر سپهر', status: 'pending' };
      }
      const t = new Set(tags.value()); if (order) t.add('سفارش');
      update((s) => {
        s.reports.push({ id: uid('r'), date: todayJ(), author: 'ناظر سپهر', progress: Math.round(p), note: note.value.trim(), tags: [...t] });
        if (order) s.orders.push(order);
      });
      close(); toast(order ? 'گزارش و سفارش ثبت شد' : 'گزارش ثبت شد');
    } }, cancel],
  });
}

export function openSearch() {
  const q = textInput({ placeholder: 'جستجو در کارها و سفارش‌ها…', 'aria-label': 'جستجو' });
  const out = h('div', { style: { marginTop: '12px' } });
  const paint = () => {
    const s = get(), term = q.value.trim();
    out.textContent = '';
    if (!term) return;
    const tr = (id) => s.trades.find((t) => t.id === id)?.name || '';
    const rows = [
      ...s.tasks.filter((t) => t.title.includes(term)).map((t) => ({ icon: 'list-checks', text: t.title, sub: `${tr(t.tradeId)} · ${fmtShortJ(t.date)}`, to: '/daily' })),
      ...s.orders.filter((o) => o.item.includes(term)).map((o) => ({ icon: 'cart', text: o.item, sub: `سفارش · نیاز تا ${fmtShortJ(o.neededBy)}`, to: '/orders' })),
    ].slice(0, 20);
    if (!rows.length) out.append(h('p', { class: 'k-muted', style: { textAlign: 'center', padding: '16px' } }, 'موردی پیدا نشد'));
    rows.forEach((r) => out.append(h('button', { class: 'k-menuitem', type: 'button', onclick: () => { go(r.to); document.querySelector('.k-overlay')?.remove(); } },
      icon(r.icon), h('span', { class: 'k-grow' }, h('div', {}, r.text), h('div', { class: 'k-xs k-muted' }, r.sub)))));
  };
  q.addEventListener('input', paint);
  openSheet({ title: 'جستجو', content: h('div', {}, q, out) });
  setTimeout(() => q.focus(), 60);
}

export function openMenu({ onTheme }) {
  const st = get();
  const item = (iconName, label, onclick, danger) => h('button', { class: 'k-menuitem' + (danger ? ' k-menuitem--danger' : ''), type: 'button', onclick }, icon(iconName), label);
  let close;
  const file = h('input', { type: 'file', accept: 'application/json,.json', class: 'k-hidden', onchange: async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { importBackup(await f.text()); toast('پشتیبان بازیابی شد'); close(); } catch (err) { toast(err.message); }
  } });
  close = openSheet({
    title: 'منو',
    content: h('div', {},
      item(st.theme === 'dark' ? 'sun' : 'moon', st.theme === 'dark' ? 'تم روز' : 'تم شب', () => { onTheme(); close(); }),
      item('download', 'پشتیبان‌گیری (فایل JSON)', () => {
        const a = h('a', { href: URL.createObjectURL(new Blob([exportBackup()], { type: 'application/json' })), download: 'kargah-backup.json' });
        document.body.append(a); a.click(); a.remove(); toast('فایل پشتیبان ساخته شد');
      }),
      item('upload', 'بازیابی از پشتیبان', () => file.click()),
      item('trash', 'بازنشانی داده‌ی نمونه', async () => {
        if (await confirmDialog({ message: 'همه‌ی داده‌ها پاک و داده‌ی نمونه جایگزین شود؟', yes: 'بازنشانی' })) { resetDemo(); toast('داده‌ی نمونه بازگشت'); close(); }
      }, true),
      file),
  });
}

/* ── کار جدید روی محور زمان ── */
export function openAddWork() {
  const st = get();
  const title = textInput({ placeholder: 'مثلاً: دیوارچینی طبقه‌ی چهارم', 'aria-label': 'عنوان کار' });
  const trade = picker(st.trades.map((t) => ({ value: t.id, label: t.name })), [st.trades[0]?.id], false);
  const start = textInput({ value: fmtJ(todayJ()), class: 'k-input k-input--num', 'aria-label': 'شروع' });
  const end = textInput({ value: fmtJ(addDaysJ(todayJ(), 14)), class: 'k-input k-input--num', 'aria-label': 'پایان' });
  const qty = numInput({ placeholder: '۱۲۰', 'aria-label': 'کل متراژ' });
  const unit = textInput({ value: 'متر', 'aria-label': 'واحد' });
  const who = picker(st.people.map((p) => ({ value: p.id, label: p.name })), [], true);
  openSheet({
    title: 'کار جدید روی محور زمان',
    content: h('div', {}, field('عنوان کار', title), field('عملیات', trade.el), field('شروع', start), field('پایان', end),
      field('کل متراژ (اختیاری)', qty), field('واحد', unit), field('کارگرها', who.el)),
    actions: [{ label: 'ثبت', kind: 'primary', onClick: (close) => {
      const a = parseInputJ(start.value), b = parseInputJ(end.value);
      if (!title.value.trim()) { toast('عنوان کار را بنویسید'); return; }
      if (!a || !b) { toast('تاریخ‌ها را مثل ۱۴۰۵/۰۲/۰۵ وارد کنید'); return; }
      if (a > b) { toast('پایان نباید قبل از شروع باشد'); return; }
      const q = qty.value.trim() ? parseNum(qty.value) : 0;
      if (!Number.isFinite(q) || q < 0) { toast('متراژ را درست وارد کنید'); return; }
      update((s) => s.plans.push({ id: uid('w'), tradeId: trade.value(), title: title.value.trim(), start: a, end: b,
        unit: unit.value.trim() || 'متر', qty: q, progress: 0, people: who.value(), log: [] }));
      close(); toast('کار روی محور اضافه شد');
    } }, cancel],
  });
}

/* ── جزئیات کامل یک کار: خلاصه، کارگرها و جدول کارکرد روزانه ── */
export function openWorkSheet(id) {
  const find = () => get().plans.find((p) => p.id === id);
  if (!find()) return;
  const tr = get().trades.find((t) => t.id === find().tradeId);
  const unitOf = () => find().unit;
  const summary = h('div');
  const qtyInput = numInput({ value: toFa(find().qty || ''), placeholder: 'کل متراژ', 'aria-label': 'کل متراژ' });
  qtyInput.addEventListener('change', () => {
    const q = parseNum(qtyInput.value);
    if (!Number.isFinite(q) || q < 0) { toast('متراژ را درست وارد کنید'); qtyInput.value = toFa(find().qty || ''); return; }
    update((s) => { s.plans.find((p) => p.id === id).qty = q; });
    paint();
  });
  const logRows = () => [...find().log].sort((a, b) => b.date.localeCompare(a.date)).map((l) => ({ id: l.date, ...l }));
  const patch = (fn) => { update((s) => fn(s.plans.find((p) => p.id === id))); paint(); };

  const table = createTable({
    title: 'کارکرد روزانه',
    columns: [
      { key: 'date', label: 'تاریخ', type: 'date' },
      { key: 'done', label: 'انجام‌شده', type: 'num', total: 'sum', unit: unitOf },
      { key: 'absent', label: 'غایب', type: 'num', total: 'sum' },
    ],
    rows: logRows(),
    onCellChange: (row, key, value) => {
      if (key === 'date' && value !== row.date && find().log.some((l) => l.date === value)) { toast('برای این روز قبلاً کارکرد ثبت شده'); table.setRows(logRows()); return; }
      patch((w) => { const l = w.log.find((x) => x.date === row.date); l[key] = value; });
    },
    onDelete: (row) => patch((w) => { w.log = w.log.filter((l) => l.date !== row.date); }),
    onAdd: () => {
      const d = nextLogDate(find().log, todayJ(), find().start);
      if (!d) { toast('برای همه‌ی روزها کارکرد ثبت شده'); return; }
      patch((w) => { w.log.push({ date: d, done: 0, absent: 0 }); });
      toast('ردیف ' + fmtShortJ(d) + ' اضافه شد؛ دوبار روی عدد بزنید');
    },
    addLabel: 'روز', emptyText: 'هنوز کارکردی ثبت نشده',
  });

  function paint() {
    const w = find(); if (!w) return;
    const names = (w.people || []).map((pid) => get().people.find((p) => p.id === pid)?.name).filter(Boolean);
    mount(summary,
      h('div', { class: 'k-row', style: { flexWrap: 'wrap' } }, chip(tr.name, 'blue', tr.icon),
        chip(`${fmtShortJ(w.start)} تا ${fmtShortJ(w.end)}`, '', 'calendar'), chip(toFa(diffDaysJ(w.end, w.start) + 1) + ' روز', '', 'clock')),
      h('div', { class: 'k-row', style: { margin: '14px 0 6px' } }, h('b', { style: { fontSize: '1.2rem' } }, fmtPct(workProgress(w))),
        h('span', { class: 'k-xs k-muted k-grow' }, w.qty > 0 ? `${fmtNum(workDone(w))} از ${fmtNum(w.qty)} ${w.unit}` : 'کل متراژ را وارد کنید تا درصد حساب شود')),
      progress(workProgress(w), 'green'),
      names.length > 0 && h('div', { class: 'k-row', style: { flexWrap: 'wrap', margin: '12px 0 0' } }, names.map((n) => h('span', { class: 'k-crew' }, avatar(n), n))));
    table.setRows(logRows());
  }
  paint();

  let close;
  close = openSheet({
    title: find().title,
    content: h('div', {}, summary, h('div', { style: { margin: '12px 0' } }, field('کل متراژ', qtyInput)), table.el,
      h('div', { style: { marginTop: '14px' } }, h('button', { class: 'k-btn k-btn--danger k-btn--block', type: 'button', onclick: async () => {
        if (await confirmDialog({ message: 'این کار و همه‌ی کارکردهایش حذف شود؟' })) { update((s) => { s.plans = s.plans.filter((p) => p.id !== id); }); close(); toast('کار حذف شد'); }
      } }, icon('trash'), 'حذف این کار'))),
  });
}

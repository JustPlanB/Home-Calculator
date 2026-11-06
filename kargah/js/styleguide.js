/* راهنمای زنده‌ی اجزا — هر کامپوننت اپ یک‌بار اینجا دیده می‌شود. هر جزء جدید باید به این صفحه اضافه شود. */
import { h } from './core/dom.js';
import { icon, iconNames, ICONS } from './ui/icons.js';
import * as C from './ui/controls.js';
import { createTable } from './ui/table.js';
import { confirmDialog, openSheet, selectSheet, toast } from './ui/overlay.js';
import { toFa } from './core/fa.js';

const forced = new URLSearchParams(location.search).get('theme');
if (forced === 'light') document.documentElement.dataset.theme = 'light';

const sec = (title, desc, ...kids) => h('section', { class: 'sg-sec' }, h('h2', {}, title), desc && h('p', {}, desc), ...kids);
const demo = (...kids) => h('div', { class: 'sg-demo' }, ...kids);
const root = document.getElementById('sg');

/* رنگ‌ها */
const swatch = (name) => h('div', { class: 'sg-sw' }, h('i', { style: { background: `var(${name})` } }), h('span', {}, name));
const tokens = ['--bg', '--card', '--bg3', '--border', '--text', '--muted', '--accent', '--green-tx', '--red-tx', '--warn-tx', '--tbl-head', '--row-alt',
  '--trade-1', '--trade-2', '--trade-3', '--trade-4', '--trade-5', '--trade-6', '--disc-bg', '--disc-fg'];

/* جدول نمونه با همه‌ی نوع ستون‌ها */
const STATUS = [
  { value: 'pending', label: 'در انتظار', tone: 'warn' },
  { value: 'done', label: 'تمام شد', tone: 'green' },
  { value: 'late', label: 'تأخیر', tone: 'red' },
];
let rows = [
  { id: 'a', title: 'آجرکاری طبقه‌ی سوم', qty: 120, amount: 4500000, date: '1405-07-28', pct: 70, trade: 'brick', status: 'pending', ok: true, who: 'رضا کریمی' },
  { id: 'b', title: 'لوله‌کشی حیاط', qty: 40, amount: -1800000, date: '1405-08-02', pct: 35, trade: 'pipe', status: 'late', ok: false, who: 'مهدی صادقی' },
  { id: 'c', title: 'قیرگونی تراس', qty: 60, amount: 2600000, date: '1405-08-10', pct: 100, trade: 'bitumen', status: 'done', ok: true, who: 'سعید امینی' },
];
const table = createTable({
  title: 'جدول نمونه — همه‌ی انواع ستون',
  columns: [
    { key: 'title', label: 'شرح', type: 'text' },
    { key: 'qty', label: 'تعداد', type: 'num', total: 'sum', unit: 'متر' },
    { key: 'amount', label: 'مبلغ', type: 'money', total: 'sum' },
    { key: 'date', label: 'تاریخ', type: 'date' },
    { key: 'pct', label: 'درصد', type: 'percent' },
    { key: 'trade', label: 'عملیات', type: 'select', options: [{ value: 'brick', label: 'آجرکاری' }, { value: 'pipe', label: 'لوله' }, { value: 'bitumen', label: 'قیرگونی' }] },
    { key: 'status', label: 'وضعیت', type: 'status', options: STATUS },
    { key: 'ok', label: 'تأیید', type: 'check' },
    { key: 'who', label: 'مسئول', type: 'person' },
    { key: 'pct', label: 'پیشرفت', type: 'progress' },
  ],
  rows,
  onCellChange: (row, key, value) => { rows = rows.map((r) => (r.id === row.id ? { ...r, [key]: value } : r)); table.setRows(rows); },
  onDelete: (row) => { rows = rows.filter((r) => r.id !== row.id); table.setRows(rows); },
  onAdd: () => { rows = [...rows, { id: 'n' + rows.length + Date.now(), title: 'ردیف جدید', qty: 1, amount: 0, date: '1405-07-25', pct: 0, trade: 'brick', status: 'pending', ok: false, who: 'ناظر' }]; table.setRows(rows); },
  addLabel: 'ردیف',
});

root.append(
  h('h1', { class: 'sg-h' }, 'راهنمای اجزای کارگاه'),
  h('p', { class: 'k-muted k-xs' }, 'هر چیزی که در اپ می‌بینید از همین اجزا ساخته می‌شود. اسم فارسی هر جزء در CLAUDE.md تعریف شده است.'),

  sec('رنگ‌ها (توکن‌ها)', 'فقط از tokens.css؛ تم شب و روز خودکار عوض می‌شود.', h('div', { class: 'sg-swatches' }, tokens.map(swatch))),

  sec('آیکن‌ها', `${toFa(iconNames().length)} آیکن — یک سبک: خطی، ضخامت ۲، سرخط گرد. فقط از icons.js.`,
    h('div', { class: 'sg-icons' }, iconNames().map((n) => h('div', { class: 'sg-ic' }, icon(n), h('small', {}, n))))),

  sec('عملگرها (Operators)', 'دکمه‌های گرد و قرصی. هر کار یک عملگر ثابت دارد: افزودن +، حذف ✕، ویرایش ✎، جستجو، منو، بازگشت.',
    demo(C.addOp(() => toast('افزودن')), C.addOp(() => {}, 'افزودن', true), C.searchOp(() => {}), C.menuOp(() => {}), C.editOp(() => {}), C.deleteOp(() => {}), C.backOp(() => {})),
    h('div', { style: { marginTop: '12px' } }, C.addPill('ردیف', () => toast('افزودن ردیف')))),

  sec('دکمه‌ها', 'اصلی (آبی)، خطرناک (قرمز)، خنثی.',
    demo(C.button('ثبت', () => {}, { kind: 'primary' }), C.button('حذف', () => {}, { kind: 'danger', iconName: 'trash' }), C.button('انصراف', () => {}), C.button('دانلود', () => {}, { iconName: 'download' }))),

  sec('کاشی ابزار (Tile)', 'دیسک آیکن + برچسب؛ سه‌تایی در یک جعبه.',
    C.tileBox(C.tile({ label: 'کارهای امروز', iconName: 'list-checks', onclick: () => {} }), C.tile({ label: 'انبار', iconName: 'box', badge: 'به‌زودی', onclick: () => {} }), C.tile({ label: 'حذف', iconName: 'trash', danger: true, onclick: () => {} }))),

  sec('چیپ، چک‌باکس، آواتار، پیشرفت', null,
    demo(C.chip('تمام شد', 'green', 'check'), C.chip('در انتظار', 'warn', 'clock'), C.chip('تأخیر', 'red', 'alert-triangle'), C.chip('پیشرفت', 'blue', 'tag'), C.chip('خنثی')),
    h('div', { style: { marginTop: '12px' } }, demo(C.checkbox(true, () => {}), C.checkbox(false, () => {}), C.checkbox(false, () => {}, { disabled: true }), C.avatars(['رضا کریمی', 'حسن نوری', 'علی رضایی']), C.ring(64))),
    h('div', { style: { marginTop: '12px', display: 'grid', gap: '8px' } }, C.progress(70), C.progress(40, 'green'), C.progress(15, 'red'))),

  sec('تب قطعه‌ای و فیلدها', null,
    C.segmented([{ value: 'd', label: 'روزانه' }, { value: 'w', label: 'هفتگی' }, { value: 'm', label: 'ماهانه' }], 'd', () => {}),
    h('div', { style: { marginTop: '12px' } }, C.field('عنوان', C.textInput({ placeholder: 'مثلاً: دیوارچینی' })), C.field('مبلغ', C.numInput({ value: toFa('1,500,000') })), C.field('شرح', C.textArea({ placeholder: 'توضیح…' })))),

  sec('کارت و باکس آمار', null,
    C.card({ title: 'عنوان کارت', sub: 'زیرعنوان', iconName: 'building' }, h('p', {}, 'محتوای کارت اینجا می‌آید.')),
    h('div', { style: { marginTop: '12px', display: 'grid', gap: '10px', gridTemplateColumns: '1fr 1fr' } },
      C.statBox('درآمد:', [{ label: 'دریافت‌شده', value: toFa('38,000,000'), tone: 'green' }, { label: 'نشده', value: toFa('12,000,000'), tone: 'red' }]),
      C.statBox('کارها:', [{ label: 'کل', value: toFa(9) }, { label: 'مانده', value: toFa(5), tone: 'red' }]))),

  sec('مودال، شیت، توست', 'مودال تأیید: «بله» قرمز و «خیر» خاکستری.',
    demo(C.button('مودال تأیید', () => confirmDialog({ message: 'این ردیف حذف شود؟' })),
      C.button('شیت فرم', () => openSheet({ title: 'نمونه', content: C.field('عنوان', C.textInput()), actions: [{ label: 'ثبت', kind: 'primary', onClick: (c) => c() }, { label: 'انصراف', onClick: (c) => c() }] })),
      C.button('انتخاب از فهرست', () => selectSheet({ title: 'وضعیت', options: STATUS, value: 'pending' })),
      C.button('توست', () => toast('انجام شد')))),

  sec('بنر و حالت خالی', null,
    h('div', { class: 'k-banner k-banner--green' }, icon('check'), 'همه‌ی کارهای محول‌شده‌ی امروز انجام شد'),
    h('div', { style: { marginTop: '12px' } }, C.emptyState({ iconName: 'box', title: 'موردی نیست', text: 'متن راهنمای حالت خالی.' }))),

  sec('جدول (Table)', 'کامل‌ترین جزء: شماره‌ی ردیف، انواع ستون، دو ضربه برای ویرایش، جمع پایین، حذف با تأیید، افزودن ردیف.', table.el),
);

/* ═══════════════════════════════════════════════════════════════════
   جدول (Table) — تنها جدول استاندارد اپ. «جدول بساز» یعنی همین کامپوننت.
   مشخصات کامل (ستون‌ها، رفتار، حالت‌ها) در CLAUDE.md بخش «جدول» آمده است.

   createTable({
     title, columns, rows,
     onCellChange(row, key, value)   ← بعد از ویرایش درون‌خطی/انتخاب/تیک
     onDelete(row)                    ← بعد از تأیید حذف (اگر ندهید ستون حذف نمی‌آید)
     onAdd(), addLabel                ← دکمه‌ی قرصی افزودن در پایین
     emptyText, hint
   }) → { el, setRows(rows) }

   ستون: { key, label, type, options?, total?, tone?, unit?, editable?, render?, width? }
   type: text | num | money | date | percent | select | status | check | person | progress | custom
   ═══════════════════════════════════════════════════════════════════ */
import { h, mount } from '../core/dom.js';
import { chip, checkbox, avatar, progress, deleteOp, addPill } from './controls.js';
import { confirmDialog, selectSheet, toast } from './overlay.js';
import { fmtNum, fmtPct, parseNum, toFa, toEn } from '../core/fa.js';
import { fmtJ, parseJ, makeJ } from '../core/jalali.js';

const EDITABLE_BY_DEFAULT = new Set(['text', 'num', 'money', 'date', 'percent']);
const isEditable = (c) => (c.editable ?? EDITABLE_BY_DEFAULT.has(c.type)) && c.type !== 'custom';

export function createTable(opts) {
  const { title, columns, onCellChange, onDelete, onAdd, addLabel = 'ردیف', emptyText = 'ردیفی ثبت نشده است', deleteMessage = 'این ردیف حذف شود؟' } = opts;
  let rows = opts.rows || [];
  const anyEditable = columns.some(isEditable);
  const hint = opts.hint ?? (anyEditable ? 'برای ویرایش، دوبار روی فیلد ضربه بزنید' : null);

  const thead = h('thead', {}, h('tr', {},
    h('th', { class: 'c-idx' }, 'ردیف'),
    columns.map((c) => h('th', { class: 'c-' + c.type, style: c.width ? { width: c.width } : null }, c.label)),
    onDelete && h('th', { class: 'c-act', 'aria-label': 'حذف' })));
  const tbody = h('tbody');
  const tfoot = columns.some((c) => c.total) ? h('tfoot') : null;
  const scroll = h('div', { class: 'k-tbl-scroll' }, h('table', { class: 'k-tbl' }, thead, tbody, tfoot));
  const el = h('section', { class: 'k-tbl-wrap' },
    title && h('h2', { class: 'k-tbl-title' }, title),
    scroll,
    hint && rows !== null && h('p', { class: 'k-tbl-hint' }, hint),
    onAdd && h('div', { class: 'k-tbl-foot' }, addPill(addLabel, onAdd)));

  /* ── نمایش مقدار هر سلول ── */
  function display(c, row) {
    const v = row[c.key];
    switch (c.type) {
      case 'text': return v == null || v === '' ? '' : String(v);
      case 'num': return v == null || v === '' ? '' : fmtNum(v) + (c.unit ? ' ' + (typeof c.unit === 'function' ? c.unit(row) : c.unit) : '');
      case 'money': return v == null || v === '' ? '' : fmtNum(v);
      case 'date': return v ? fmtJ(v) : '';
      case 'percent': return v == null ? '' : fmtPct(v);
      default: return '';
    }
  }
  const raw = (c, row) => {
    const v = row[c.key];
    if (v == null) return '';
    if (c.type === 'date') return fmtJ(v);
    if (c.type === 'num' || c.type === 'money' || c.type === 'percent') return toFa(v);
    return String(v);
  };

  function buildCell(c, row) {
    const td = h('td', { class: 'c-' + c.type });
    const optOf = (v) => (c.options || []).find((o) => o.value === v);
    switch (c.type) {
      case 'select':
        td.append(h('button', { class: 'k-cellbtn', type: 'button', onclick: async () => {
          const v = await selectSheet({ title: c.label, options: c.options, value: row[c.key] });
          if (v !== undefined && v !== row[c.key]) onCellChange && onCellChange(row, c.key, v);
        } }, optOf(row[c.key])?.label || 'انتخاب'));
        break;
      case 'status': {
        const o = optOf(row[c.key]);
        const btn = h('button', { type: 'button', style: { display: 'inline-flex' }, onclick: async () => {
          const v = await selectSheet({ title: c.label, options: c.options, value: row[c.key] });
          if (v !== undefined && v !== row[c.key]) onCellChange && onCellChange(row, c.key, v);
        } }, chip(o?.label || 'نامشخص', o?.tone || '', o?.icon));
        td.append(btn);
        break;
      }
      case 'check':
        td.append(checkbox(!!row[c.key], (val) => onCellChange && onCellChange(row, c.key, val)));
        break;
      case 'person':
        td.append(h('span', { class: 'k-row', style: { justifyContent: 'flex-start' } }, avatar(row[c.key] || ''), h('span', {}, row[c.key] || '')));
        td.classList.replace('c-person', 'c-text');
        break;
      case 'progress':
        td.append(h('div', { style: { minWidth: '84px' } }, h('div', { class: 'k-xs', style: { textAlign: 'center', marginBottom: '2px' } }, fmtPct(row[c.key] || 0)), progress(row[c.key] || 0, c.tone?.(row) || '')));
        break;
      case 'custom':
        td.append(c.render(row));
        break;
      default: {
        td.textContent = display(c, row);
        if (c.sub && c.type === 'text') td.append(h('span', { class: 'k-sub' }, c.sub(row)));
        if (c.type === 'money') {
          const t = c.tone ? c.tone(row) : (row[c.key] > 0 ? 'pos' : row[c.key] < 0 ? 'neg' : '');
          if (t) td.classList.add(t);
        }
        if (isEditable(c)) { td.classList.add('editable'); td.dataset.key = c.key; }
      }
    }
    return td;
  }

  function buildRow(row, i) {
    const tr = h('tr', { data: { id: row.id } }, h('td', { class: 'c-idx' }, toFa(i + 1)), columns.map((c) => buildCell(c, row)));
    if (onDelete) {
      tr.append(h('td', { class: 'c-act' }, deleteOp(async () => {
        if (await confirmDialog({ message: deleteMessage })) onDelete(row);
      })));
    }
    return tr;
  }

  function renderFoot() {
    if (!tfoot) return;
    mount(tfoot, h('tr', {}, h('td', { class: 'c-idx' }, 'جمع'), columns.map((c) => {
      if (!c.total) return h('td', {});
      const sum = rows.reduce((s, r) => s + (Number(r[c.key]) || 0), 0);
      return h('td', { class: c.type === 'money' ? 'c-money' : '' }, fmtNum(sum));
    }), onDelete && h('td', {})));
  }

  function setRows(next) {
    rows = next;
    if (!rows.length) mount(tbody, h('tr', {}, h('td', { class: 'k-tbl-empty', colspan: columns.length + 1 + (onDelete ? 1 : 0) }, emptyText)));
    else mount(tbody, rows.map(buildRow));
    renderFoot();
  }

  /* ── ویرایش درون‌خطی با دو ضربه (روی لمس و ماوس یکسان) ── */
  let last = { td: null, t: 0 };
  tbody.addEventListener('click', (e) => {
    const td = e.target.closest('td.editable');
    if (!td || td.classList.contains('editing')) return;
    const now = Date.now();
    if (last.td === td && now - last.t < 380) { last = { td: null, t: 0 }; startEdit(td); } else last = { td, t: now };
  });

  function startEdit(td) {
    const tr = td.closest('tr');
    const row = rows.find((r) => r.id === tr.dataset.id);
    const c = columns.find((x) => x.key === td.dataset.key);
    if (!row || !c) return;
    const input = h('input', { class: 'k-input' + (c.type === 'text' ? '' : ' k-input--num'), type: 'text',
      inputmode: c.type === 'text' ? 'text' : 'numeric', value: raw(c, row), 'aria-label': c.label });
    td.classList.add('editing'); td.textContent = ''; td.append(input);
    input.focus(); input.select();
    let done = false;
    const finish = (commit) => {
      if (done) return; done = true;
      td.classList.remove('editing');
      if (commit) {
        const res = parse(c, input.value);
        if (res.ok) { if (res.value !== row[c.key]) { onCellChange && onCellChange(row, c.key, res.value); return; } }
        else toast(res.error);
      }
      td.textContent = display(c, row);
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') finish(true); else if (e.key === 'Escape') finish(false); });
    input.addEventListener('blur', () => finish(true));
  }

  setRows(rows);
  return { el, setRows };
}

/* تبدیل متن واردشده به مقدار ذخیره‌شونده */
function parse(c, text) {
  const t = String(text).trim();
  switch (c.type) {
    case 'text': return t ? { ok: true, value: t } : { ok: false, error: 'متن نباید خالی باشد' };
    case 'num': case 'money': {
      const n = parseNum(t);
      return Number.isFinite(n) ? { ok: true, value: n } : { ok: false, error: 'یک عدد معتبر وارد کنید' };
    }
    case 'percent': {
      const n = parseNum(t);
      return Number.isFinite(n) && n >= 0 && n <= 100 ? { ok: true, value: Math.round(n) } : { ok: false, error: 'عددی بین ۰ تا ۱۰۰ وارد کنید' };
    }
    case 'date': {
      const p = parseJ(toEn(t).replace(/\//g, '-').replace(/-(\d)(?=-|$)/g, '-0$1'));
      return p ? { ok: true, value: makeJ(p.y, p.m, p.d) } : { ok: false, error: 'تاریخ را به شکل ۱۴۰۵/۰۲/۰۵ وارد کنید' };
    }
    default: return { ok: false, error: 'قابل ویرایش نیست' };
  }
}

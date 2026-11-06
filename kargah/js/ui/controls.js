/* عملگرها (Operators) و اجزای کوچک. هر عملگر یک تابع است تا همه‌جا شکل و رفتار یکسان داشته باشد. */
import { h } from '../core/dom.js';
import { icon, disc } from './icons.js';
import { toFa, fmtPct, initials } from '../core/fa.js';

const op = (name, mod, label, onclick, extra = {}) =>
  h('button', { class: 'k-op ' + mod, 'aria-label': label, title: label, type: 'button', onclick, ...extra }, icon(name));

/* ── عملگرهای گرد ── */
export const addOp = (onclick, label = 'افزودن', big = false) => op('plus', 'k-op--add' + (big ? ' k-op--lg' : ''), label, onclick);
export const searchOp = (onclick) => op('search', 'k-op--search', 'جستجو', onclick);
export const menuOp = (onclick) => op('menu', 'k-op--square', 'منو', onclick);
export const deleteOp = (onclick, label = 'حذف') => op('x', 'k-op--del k-op--sm', label, onclick);
export const editOp = (onclick, label = 'ویرایش') => op('edit', 'k-op--edit k-op--sm', label, onclick);
export const backOp = (onclick) => h('button', { class: 'k-op k-op--back', type: 'button', onclick, 'aria-label': 'بازگشت' }, icon('arrow-right'), 'بازگشت');

/** دکمه‌ی قرصی افزودن ردیف: «+ برچسب» */
export const addPill = (label, onclick) =>
  h('button', { class: 'k-pill', type: 'button', onclick }, icon('plus'), label);

/** دکمه‌ی متنی: kind = primary | danger | (خنثی) */
export const button = (label, onclick, { kind = '', iconName, block = false } = {}) =>
  h('button', { class: 'k-btn' + (kind ? ' k-btn--' + kind : '') + (block ? ' k-btn--block' : ''), type: 'button', onclick }, iconName && icon(iconName), label);

/** انتخاب‌گر هدر (ماه/سال/پروژه) */
export const selectBtn = (label, onclick) =>
  h('button', { class: 'k-select-btn', type: 'button', onclick }, label, icon('chevron-down'));

/** کاشی ابزار با دیسک آیکن */
export function tile({ label, iconName, onclick, danger = false, badge }) {
  return h('button', { class: 'k-tile', type: 'button', onclick }, disc(iconName, { danger }), label,
    badge && h('span', { class: 'k-tile__badge' }, badge));
}
export const tileBox = (...tiles) => h('div', { class: 'k-tilebox' }, tiles);

/* ── اجزای نمایشی ── */
export const chip = (text, tone = '', iconName) =>
  h('span', { class: 'k-chip' + (tone ? ' k-chip--' + tone : '') }, iconName && icon(iconName), text);

export function checkbox(checked, onToggle, { disabled = false, label = 'انجام شد' } = {}) {
  return h('button', {
    class: 'k-check', type: 'button', role: 'checkbox', 'aria-checked': String(!!checked), 'aria-label': label,
    'aria-disabled': disabled ? 'true' : null, onclick: () => { if (!disabled) onToggle(!checked); },
  }, icon('check'));
}

export const avatar = (name) => h('span', { class: 'k-avatar', title: name }, initials(name));
export const avatars = (names) => h('span', { class: 'k-avatars' }, names.map(avatar));

export function progress(pct, tone = '') {
  const i = h('i'); i.style.width = Math.max(0, Math.min(100, pct)) + '%';
  return h('div', { class: 'k-progress' + (tone ? ' k-progress--' + tone : ''), role: 'progressbar', 'aria-valuenow': String(pct) }, i);
}
export function ring(pct) {
  const el = h('span', { class: 'k-ring', role: 'img', 'aria-label': fmtPct(pct) }, h('span', {}, toFa(Math.round(pct)) + '٪'));
  el.style.setProperty('--p', String(Math.max(0, Math.min(100, pct))));
  return el;
}

/** تب قطعه‌ای: items=[{value,label}] */
export function segmented(items, value, onChange) {
  const el = h('div', { class: 'k-seg', role: 'tablist' });
  const paint = (v) => [...el.children].forEach((b) => b.setAttribute('aria-selected', String(b.dataset.v === v)));
  items.forEach((it) => el.append(h('button', { type: 'button', role: 'tab', data: { v: it.value }, onclick: () => { paint(it.value); onChange(it.value); } }, it.label)));
  paint(value);
  return el;
}

/** فیلد فرم: field('عنوان', input) */
export const field = (label, control) => h('label', { class: 'k-field' }, h('span', { class: 'k-field__label' }, label), control);
export const textInput = (props = {}) => h('input', { class: 'k-input', type: 'text', ...props });
export const numInput = (props = {}) => h('input', { class: 'k-input k-input--num', type: 'text', inputmode: 'numeric', ...props });
export const textArea = (props = {}) => h('textarea', { class: 'k-input', ...props });

/** کارت: card({title, sub, iconName, tone}, ...children) */
export function card({ title, sub, iconName, raised = false, actions } = {}, ...kids) {
  return h('section', { class: 'k-card' + (raised ? ' k-card--raised' : '') },
    (title || iconName) && h('header', { class: 'k-card__head' },
      iconName && disc(iconName, { small: true }),
      h('div', { class: 'k-grow' }, title && h('div', { class: 'k-card__title' }, title), sub && h('div', { class: 'k-card__sub' }, sub)),
      actions),
    kids);
}

/** باکس آمار: عنوان + چند خط «برچسب: مقدار» با رنگ */
export function statBox(label, lines) {
  return h('div', { class: 'k-stat' }, h('div', { class: 'k-stat__label' }, label),
    lines.map((l) => h('div', { class: 'k-stat__line ' + (l.tone ? 'k-' + l.tone : '') }, h('small', {}, l.label), h('span', {}, l.value))));
}

export function emptyState({ iconName = 'info', title, text, action }) {
  return h('div', { class: 'k-empty' }, disc(iconName), h('h3', {}, title), text && h('p', {}, text), action && h('div', { style: { marginTop: '16px' } }, action));
}

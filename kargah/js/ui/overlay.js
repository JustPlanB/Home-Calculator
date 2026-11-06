/* محیط‌های روی صفحه: confirmDialog (مودال تأیید)، openSheet (شیت پایین)، selectSheet (انتخاب از فهرست)، toast. */
import { h } from '../core/dom.js';
import { icon } from './icons.js';

function overlay(kind, box, onClose) {
  const ov = h('div', { class: 'k-overlay' + (kind === 'sheet' ? ' k-overlay--sheet' : ''), role: 'dialog', 'aria-modal': 'true' }, box);
  const close = (v) => { ov.remove(); document.removeEventListener('keydown', onKey); onClose && onClose(v); };
  const onKey = (e) => { if (e.key === 'Escape') close(undefined); };
  ov.addEventListener('click', (e) => { if (e.target === ov) close(undefined); });
  document.addEventListener('keydown', onKey);
  document.body.append(ov);
  return close;
}

/** مودال تأیید — دکمه‌ی «بله» قرمز، «خیر» خاکستری (مثل حساب‌کتاب). Promise<boolean> */
export function confirmDialog({ message, yes = 'حذف', no = 'انصراف', danger = true }) {
  return new Promise((resolve) => {
    let close;
    const box = h('div', { class: 'k-modal' },
      h('p', { class: 'k-modal__msg' }, message),
      h('div', { class: 'k-modal__actions' },
        h('button', { class: 'k-btn ' + (danger ? 'k-btn--danger' : 'k-btn--primary'), onclick: () => close(true) }, yes),
        h('button', { class: 'k-btn', onclick: () => close(false) }, no)));
    close = overlay('modal', box, (v) => resolve(v === true));
  });
}

/** شیت پایین با محتوای دلخواه. actions: [{label, kind, onClick(close)}] */
export function openSheet({ title, content, actions = [] }) {
  let close;
  const box = h('div', { class: 'k-sheet' },
    h('div', { class: 'k-sheet__grip' }),
    title && h('h2', { class: 'k-sheet__title' }, title),
    h('div', { class: 'k-sheet__body' }, content),
    actions.length > 0 && h('div', { class: 'k-sheet__actions' },
      actions.map((a) => h('button', { class: 'k-btn' + (a.kind ? ' k-btn--' + a.kind : ''), onclick: () => a.onClick(() => close()) }, a.label))));
  close = overlay('sheet', box);
  return () => close();
}

/** انتخاب از فهرست؛ Promise<value|undefined> */
export function selectSheet({ title, options, value }) {
  return new Promise((resolve) => {
    let close;
    const list = options.map((o) => h('button', {
      class: 'k-menuitem', 'aria-selected': String(o.value === value),
      onclick: () => close(o.value),
    }, o.icon && icon(o.icon), o.label));
    close = overlay('sheet', h('div', { class: 'k-sheet' }, h('div', { class: 'k-sheet__grip' }),
      title && h('h2', { class: 'k-sheet__title' }, title), h('div', { class: 'k-sheet__body' }, list)), resolve);
  });
}

let toastTimer;
export function toast(message) {
  document.querySelectorAll('.k-toast').forEach((n) => n.remove());
  const el = h('div', { class: 'k-toast', role: 'status' }, message);
  document.body.append(el);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), 2200);
}

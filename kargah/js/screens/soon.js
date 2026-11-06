/* بخش‌هایی که در یادداشت آمده ولی هنوز ساخته نشده‌اند؛ محتوا از یادداشت می‌آید تا گم نشود. */
import { h } from '../core/dom.js';
import { emptyState, chip } from '../ui/controls.js';
import { screenHead } from './common.js';

const PAGES = {
  warehouse: { title: 'انبار', icon: 'box', text: 'موجودی انبار و خریدها، ورود و خروج مصالح، و هشدار کمبود.', items: ['موجودی مصالح', 'ثبت خرید', 'هشدار کمبود'] },
  finance: { title: 'مالی', icon: 'wallet', text: 'محاسبات قیمتی و پیمانکاران، پرداختی‌ها و باقی‌مانده، حقوق، بدهی‌ها و اثر تورم/نرخ ارز.', items: ['پیمانکاران', 'پرداختی‌ها', 'حقوق', 'بدهی‌ها', 'تورم و نرخ ارز'] },
  docs: { title: 'مدارک', icon: 'folder', text: 'قراردادها با فایل پی‌دی‌اف، فاکتورها، فایل‌های صوتی، عکس‌ها و مراحل شهرداری و پروانه.', items: ['قراردادها', 'فاکتورها', 'عکس‌ها', 'شهرداری و پروانه'] },
};

export const soonScreen = (key) => (st) => {
  const p = PAGES[key];
  return h('div', { class: 'k-stack' }, screenHead(p.title),
    emptyState({ iconName: p.icon, title: 'این بخش به‌زودی ساخته می‌شود', text: p.text,
      action: h('div', { class: 'k-row', style: { flexWrap: 'wrap', justifyContent: 'center' } }, p.items.map((i) => chip(i))) }));
};

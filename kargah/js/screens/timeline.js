/* ═══════════════════════════════════════════════════════════════════
   نقشه‌ی کارها برای کل زمان — یک محور افقی («مدت پروژه») که کارها به‌صورت جعبه روی آن می‌نشینند.
   زوم معنایی: هرچه نزدیک‌تر شوید، هر جعبه جزئیات بیشتری نشان می‌دهد.
     سطح ۰ (ماه)      فقط جعبه‌های رنگی و نام کار
     سطح ۱ (هفته)     + آیکن عملیات و عنوان
     سطح ۲ (روز)     + متراژ انجام‌شده، درصد و آواتار کارگرها
     سطح ۳ (جزئیات)  + نمودار متراژ هر روز، علامت غیبت و نام کارگرها
   زوم: دو انگشت، Ctrl+چرخ ماوس، دکمه‌های + و −، یا دوضربه روی یک کار. یک ضربه جزئیات کامل را باز می‌کند.
   ═══════════════════════════════════════════════════════════════════ */
import { h, mount } from '../core/dom.js';
import { icon } from '../ui/icons.js';
import { avatars, avatar, addOp, chip } from '../ui/controls.js';
import { createTable } from '../ui/table.js';
import { todayJ, addDaysJ, diffDaysJ, parseJ, daysInMonthJ, weekdayJ, MONTHS } from '../core/jalali.js';
import { toFa, fmtPct, fmtNum } from '../core/fa.js';
import { workDone, workProgress } from '../core/tasks.js';
import { lodOf, LOD_NAMES, clampPpd, dayStep, packLanes, timeRange } from '../core/timeline.js';
import { openAddWork, openWorkSheet } from '../ui/forms.js';
import { screenHead, tradeOf, colorVar, personName } from './common.js';

const HEAD_H = 58;                       // ارتفاع سربرگ محور
const BOX_H = [28, 44, 66, 178];         // ارتفاع جعبه در هر سطح
const GAP = [5, 7, 9, 12];
const WEEK_SHORT = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
const DEFAULT_PPD = 12;

/* حالت دید بین رندرهای دوباره می‌ماند (با هر ثبت داده صفحه دوباره ساخته می‌شود) */
const view = { ppd: null, offset: null, filter: null };

export function timelineScreen(st) {
  const today = todayJ();
  const works = st.plans;
  const range = timeRange(works, today);
  const todayIdx = diffDaysJ(today, range.first);
  if (!view.filter) view.filter = new Set(st.trades.map((t) => t.id));
  if (view.ppd == null) view.ppd = DEFAULT_PPD;

  const scroller = h('div', { class: 'k-tl__scroll', tabindex: '0', 'aria-label': 'محور زمان پروژه' });
  const canvas = h('div', { class: 'k-tl__canvas' });
  scroller.append(canvas);
  const lodLabel = h('span', { class: 'k-chip k-chip--blue' });

  const minPpd = () => Math.max(1.5, (scroller.clientWidth || 360) / range.days);
  const getOffset = () => -scroller.scrollLeft;                     // فاصله از لبه‌ی شروع (راست) در RTL
  const setOffset = (v) => {
    const max = Math.max(0, canvas.offsetWidth - scroller.clientWidth);
    scroller.scrollLeft = -Math.max(0, Math.min(max, v));
  };
  scroller.addEventListener('scroll', () => { view.offset = getOffset(); }, { passive: true });

  /* ── سربرگ محور: ماه‌ها و روزها ── */
  function header(ppd, lod) {
    const head = h('div', { class: 'k-tl__head', style: { height: HEAD_H + 'px' } });
    const step = dayStep(ppd);
    for (let i = 0; i < range.days; i++) {
      const day = addDaysJ(range.first, i), p = parseJ(day);
      const x = i * ppd;
      if (p.d === 1 || i === 0) {
        head.append(h('div', { class: 'k-tl__month', style: { insetInlineStart: x + 'px' } },
          MONTHS[p.m - 1] + (p.m === 1 || i === 0 ? ' ' + toFa(p.y) : '')));
      }
      const dim = daysInMonthJ(p.y, p.m);
      const showDay = ppd >= 7 && (p.d - 1) % step === 0 && (step === 1 || dim - p.d >= step / 2);
      if (showDay) {
        head.append(h('div', { class: 'k-tl__tick' + (day === today ? ' is-today' : ''), style: { insetInlineStart: x + 'px', width: ppd + 'px' } },
          h('b', {}, toFa(p.d)), lod === 3 && h('small', {}, WEEK_SHORT[weekdayJ(day)])));
      } else if (day === today) {
        head.append(h('div', { class: 'k-tl__tick is-today', style: { insetInlineStart: x + 'px', width: ppd + 'px' } }));
      }
    }
    return head;
  }

  /* ── شبکه‌ی پس‌زمینه: مرز ماه‌ها و جمعه‌های تعطیل ── */
  function grid(ppd, height) {
    const g = h('div', { class: 'k-tl__grid' });
    const step = dayStep(ppd);
    for (let i = 0; i < range.days; i++) {
      const day = addDaysJ(range.first, i), p = parseJ(day), x = i * ppd;
      if (ppd >= 9 && weekdayJ(day) === 6) g.append(h('i', { class: 'k-tl__fri', style: { insetInlineStart: x + 'px', width: ppd + 'px', top: HEAD_H + 'px', height: (height - HEAD_H) + 'px' } }));
      if (p.d === 1) g.append(h('i', { class: 'k-tl__vline is-month', style: { insetInlineStart: x + 'px', top: '0', height: height + 'px' } }));
      else if (ppd >= 14 && (p.d - 1) % step === 0) g.append(h('i', { class: 'k-tl__vline', style: { insetInlineStart: x + 'px', top: HEAD_H + 'px', height: (height - HEAD_H) + 'px' } }));
    }
    return g;
  }

  /* ── یک جعبه‌ی کار ── */
  function box(w, lane, ppd, lod) {
    const tr = tradeOf(st, w.tradeId);
    const x = diffDaysJ(w.start, range.first) * ppd;
    const len = diffDaysJ(w.end, w.start) + 1;
    const bw = Math.max(6, len * ppd - 2);
    const bh = BOX_H[lod];
    const pct = workProgress(w), done = workDone(w);
    const names = (w.people || []).map((id) => personName(st, id)).filter(Boolean);

    const el = h('div', {
      class: 'k-tl-box', role: 'button', tabindex: '0', data: { id: w.id },
      'aria-label': `${w.title}، ${tr.name}، ${fmtPct(pct)}`,
      style: { insetInlineStart: x + 'px', width: bw + 'px', top: (HEAD_H + 14 + lane * (bh + GAP[lod])) + 'px', height: bh + 'px', '--c': colorVar(tr) },
    });
    const fill = h('i', { class: 'k-tl-box__fill' }); fill.style.width = pct + '%';
    el.append(fill);

    // متن‌ها در یک لایه‌ی چسبان تا با اسکرول، عنوان کار دیده شود
    const inner = h('div', { class: 'k-tl-box__in', style: { maxWidth: Math.max(10, bw - 8) + 'px' } },
      h('div', { class: 'k-tl-box__title' }, lod >= 1 && icon(tr.icon), h('span', {}, w.title)));
    if (lod >= 2) {
      inner.append(h('div', { class: 'k-tl-box__meta' },
        h('span', {}, w.qty > 0 ? `${fmtNum(done)} از ${fmtNum(w.qty)} ${w.unit}` : 'متراژ ثبت نشده', ' · ', h('b', {}, fmtPct(pct))),
        lod === 2 && names.length > 0 && avatars(names)));
    }
    if (lod === 3) {
      inner.append(h('div', { class: 'k-tl-box__crew' }, names.map((n) => h('span', { class: 'k-crew' }, avatar(n), n))));
      el.append(chart(w, ppd));
    }
    el.append(inner);
    return el;
  }

  /* نمودار متراژ هر روز داخل جعبه + علامت غیبت (سطح ۳) */
  function chart(w, ppd) {
    const max = Math.max(1, ...(w.log || []).map((l) => l.done));
    const CH = 62;
    const box = h('div', { class: 'k-tl-chart' });
    const cols = new Map((w.log || []).map((l) => [l.date, l]));
    const len = diffDaysJ(w.end, w.start) + 1;
    for (let i = 0; i < len; i++) {
      const day = addDaysJ(w.start, i), l = cols.get(day), x = i * ppd + 2;
      if (day === today && !l) {
        box.append(h('div', { class: 'k-tl-col k-tl-col--empty', style: { insetInlineStart: x + 'px', width: (ppd - 5) + 'px', height: CH + 'px' } }, '؟'));
      } else if (l) {
        const col = h('div', { class: 'k-tl-col' + (day === today ? ' is-today' : ''), style: { insetInlineStart: x + 'px', width: (ppd - 5) + 'px' } });
        col.append(h('em', {}, fmtNum(l.done)));
        const bar = h('i'); bar.style.height = Math.max(3, (l.done / max) * (CH - 16)) + 'px';
        col.append(bar);
        if (l.absent > 0) col.append(h('span', { class: 'k-tl-col__abs', title: 'غیبت' }, 'غ' + (l.absent > 1 ? toFa(l.absent) : '')));
        box.append(col);
      }
    }
    return box;
  }

  /* ── رسم کل بوم ── */
  function draw() {
    const ppd = view.ppd, lod = lodOf(ppd);
    const shown = works.filter((w) => view.filter.has(w.tradeId));
    const { lane, count } = packLanes(shown);
    const height = HEAD_H + 14 + Math.max(1, count) * (BOX_H[lod] + GAP[lod]) + 10;
    canvas.dataset.lod = String(lod);
    canvas.dataset.ppd = String(Math.round(ppd * 10) / 10);
    canvas.style.width = (range.days * ppd) + 'px';
    canvas.style.height = height + 'px';
    lodLabel.textContent = 'نمای ' + LOD_NAMES[lod];
    const marker = h('div', { class: 'k-tl__today', style: { insetInlineStart: ((todayIdx + 0.5) * ppd) + 'px' }, 'aria-hidden': 'true' },
      h('span', {}, 'امروز'));
    mount(canvas, grid(ppd, height), header(ppd, lod), shown.map((w) => box(w, lane[w.id], ppd, lod)), marker,
      shown.length === 0 && h('div', { class: 'k-tl__none' }, 'هیچ عملیاتی انتخاب نشده'));
  }

  /* ── زوم با نگه‌داشتن نقطه‌ی زیر انگشت ── */
  let raf = 0, pending = null;
  function zoomTo(next, clientX) {
    pending = { next, clientX };
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const { next: n, clientX: cx } = pending;
      const r = scroller.getBoundingClientRect();
      const a = cx == null ? r.width / 2 : r.right - cx;           // فاصله‌ی نقطه‌ی لنگر از لبه‌ی شروع (راست)
      const anchorDay = (getOffset() + a) / view.ppd;
      view.ppd = clampPpd(n, minPpd());
      draw();
      setOffset(anchorDay * view.ppd - a);
    });
  }
  const zoomBy = (f) => zoomTo(view.ppd * f);
  function focusWork(w) {
    const len = diffDaysJ(w.end, w.start) + 1;
    view.ppd = clampPpd(scroller.clientWidth / (len + 1.5), minPpd());
    draw();
    setOffset((diffDaysJ(w.start, range.first) - 0.75) * view.ppd);
  }
  const fitAll = () => { view.ppd = minPpd(); draw(); setOffset(0); };

  /* چرخ ماوس با Ctrl (و پینچ تاچ‌پد) */
  scroller.addEventListener('wheel', (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    zoomTo(view.ppd * Math.exp(-e.deltaY * 0.01), e.clientX);
  }, { passive: false });

  /* پینچ دو انگشتی */
  let pinch = null;
  const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  scroller.addEventListener('touchstart', (e) => { if (e.touches.length === 2) pinch = { d: dist(e.touches), ppd: view.ppd }; }, { passive: true });
  scroller.addEventListener('touchmove', (e) => {
    if (!pinch || e.touches.length !== 2) return;
    e.preventDefault();
    zoomTo(pinch.ppd * (dist(e.touches) / pinch.d), (e.touches[0].clientX + e.touches[1].clientX) / 2);
  }, { passive: false });
  scroller.addEventListener('touchend', (e) => { if (e.touches.length < 2) pinch = null; }, { passive: true });
  scroller.addEventListener('touchcancel', () => { pinch = null; }, { passive: true });

  /* یک ضربه = جزئیات؛ دوضربه = زوم روی همان کار */
  let tap = { id: null, t: 0, timer: 0 };
  canvas.addEventListener('click', (e) => {
    const b = e.target.closest('.k-tl-box');
    if (!b) return;
    const w = works.find((x) => x.id === b.dataset.id);
    const now = Date.now();
    if (tap.id === w.id && now - tap.t < 320) { clearTimeout(tap.timer); tap = { id: null, t: 0, timer: 0 }; focusWork(w); return; }
    clearTimeout(tap.timer);
    tap = { id: w.id, t: now, timer: setTimeout(() => { tap = { id: null, t: 0, timer: 0 }; openWorkSheet(w.id); }, 330) };
  });
  canvas.addEventListener('keydown', (e) => {
    const b = e.target.closest('.k-tl-box');
    if (b && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openWorkSheet(b.dataset.id); }
  });

  /* ── نوار زوم بالا و دکمه‌های عملیات پایین (مثل یادداشت) ── */
  const bar = h('div', { class: 'k-tl__bar' },
    h('button', { class: 'k-op k-op--sm', type: 'button', 'aria-label': 'دور کردن', onclick: () => zoomBy(1 / 1.6) }, icon('minus')),
    lodLabel,
    h('button', { class: 'k-op k-op--sm', type: 'button', 'aria-label': 'نزدیک کردن', onclick: () => zoomBy(1.6) }, icon('plus')),
    h('span', { class: 'k-grow' }),
    h('button', { class: 'k-btn k-tl__fit', type: 'button', onclick: fitAll }, icon('gantt'), 'همه‌ی پروژه'));

  const tradeBtns = st.trades.map((tr) => {
    const b = h('button', { class: 'k-tl-trade', type: 'button', 'aria-pressed': String(view.filter.has(tr.id)), style: { '--c': colorVar(tr) },
      onclick: () => {
        view.filter.has(tr.id) ? view.filter.delete(tr.id) : view.filter.add(tr.id);
        b.setAttribute('aria-pressed', String(view.filter.has(tr.id)));
        draw();
      } }, icon(tr.icon), tr.name);
    return b;
  });
  const trades = h('div', { class: 'k-tl__trades', role: 'group', 'aria-label': 'فیلتر عملیات' }, tradeBtns);

  /* ── جدول خلاصه ── */
  const rows = works.map((w) => ({
    id: w.id, title: w.title, trade: tradeOf(st, w.tradeId).name,
    crew: (w.people || []).length, absent: (w.log || []).find((l) => l.date === today)?.absent || 0, pct: workProgress(w),
  }));
  const table = createTable({
    title: 'کارهای پروژه',
    columns: [
      { key: 'title', label: 'کار', type: 'text', editable: false, sub: (r) => r.trade },
      { key: 'crew', label: 'نفرات', type: 'num' , editable: false },
      { key: 'absent', label: 'غایب امروز', type: 'num', editable: false },
      { key: 'pct', label: 'پیشرفت', type: 'progress' },
    ],
    rows, hint: 'برای دیدن و ثبت کارکرد روزانه، روی جعبه‌ی کار در محور بالا بزنید',
    emptyText: 'کاری ثبت نشده است',
  });

  const root = h('div', { class: 'k-stack' },
    screenHead('نقشه‌ی کارها برای کل زمان', { add: openAddWork, addLabel: 'کار جدید' }),
    bar, scroller, trades,
    h('p', { class: 'k-tbl-hint k-tl__hint' }, 'دو انگشت را باز کنید تا جزئیات بیشتری ببینید. روی یک کار دوبار بزنید تا نزدیک شود. یک ضربه، جزئیات کامل را باز می‌کند.'),
    table.el);

  draw();
  requestAnimationFrame(() => {
    view.ppd = clampPpd(view.ppd, minPpd());
    draw();
    setOffset(view.offset != null ? view.offset : (todayIdx + 0.5) * view.ppd - scroller.clientWidth / 2);
  });
  return root;
}

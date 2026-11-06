/* نقطه‌ی ورود: بارگذاری state، تم، مسیرها، هدر ثابت و رندر دوباره با هر تغییر داده. */
import { mount } from './core/dom.js';
import { h } from './core/dom.js';
import { load, get, update, subscribe } from './core/store.js';
import { start, current } from './core/router.js';
import { setToday, isValidJ, todayJ, fmtLongJ, fmtShortJ, weekdayNameJ } from './core/jalali.js';
import { menuOp } from './ui/controls.js';
import { openMenu } from './ui/forms.js';
import { home, homeBottom } from './screens/home.js';
import { dayScreen } from './screens/daily.js';
import { timelineScreen } from './screens/timeline.js';
import { reportsScreen } from './screens/reports.js';
import { ordersScreen } from './screens/orders.js';
import { peopleScreen } from './screens/people.js';
import { soonScreen } from './screens/soon.js';

const ROUTES = {
  '/home': { render: home, bottom: homeBottom },
  '/daily': { render: (s) => dayScreen(s, { offset: 0 }) },
  '/tomorrow': { render: (s) => dayScreen(s, { offset: 1 }) },
  '/timeline': { render: timelineScreen },
  '/reports': { render: reportsScreen },
  '/orders': { render: ordersScreen },
  '/people': { render: peopleScreen },
  '/warehouse': { render: soonScreen('warehouse') },
  '/finance': { render: soonScreen('finance') },
  '/docs': { render: soonScreen('docs') },
};

// برای تست و عکس ثابت: ?today=1405-07-25
const forced = new URLSearchParams(location.search).get('today');
if (forced && isValidJ(forced)) setToday(forced);

const page = document.getElementById('page');
const bottom = document.getElementById('bottom');
const topbar = document.getElementById('topbar');

function applyTheme(t) { document.documentElement.dataset.theme = t; }
function toggleTheme() { update((s) => { s.theme = s.theme === 'dark' ? 'light' : 'dark'; }); }

let lastPath = null;
function render() {
  const st = get();
  applyTheme(st.theme);
  const path = current();
  const r = ROUTES[path] || ROUTES['/home'];
  const y = path === lastPath ? window.scrollY : 0;
  mount(topbar,
    menuOp(() => openMenu({ onTheme: toggleTheme })),
    h('div', { class: 'k-select-btn' }, st.project.name.split('—')[0].trim()),
    h('div', { class: 'k-select-btn' }, weekdayNameJ(todayJ()) + ' ' + fmtShortJ(todayJ())));
  mount(page, r.render(st));
  mount(bottom, r.bottom ? r.bottom(st) : null);
  lastPath = path;
  window.scrollTo(0, y);
}

load();
subscribe(render);
start(render);

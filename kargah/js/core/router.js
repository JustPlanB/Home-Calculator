/* مسیریاب هش‌محور ساده: #/daily  — صفحه‌ی قبلی با back() */
const routes = new Map();
let onChange = () => {};
const stack = [];

export const defineRoute = (path, fn) => routes.set(path, fn);
export const current = () => (location.hash.replace(/^#/, '') || '/home');
export function go(path) { location.hash = '#' + path; }
export function back() { if (stack.length > 1) history.back(); else go('/home'); }
export function start(cb) {
  onChange = cb;
  const run = () => {
    const path = current();
    if (stack[stack.length - 2] === path) stack.pop(); else stack.push(path);
    onChange(path, routes.get(path) || routes.get('/home'));
  };
  addEventListener('hashchange', run);
  run();
}

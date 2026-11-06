/* ذخیره‌ساز: یک شیء state در localStorage (همان معماری حساب‌کتاب). همه‌ی دسترسی‌ها try/catch دارند. */
import { seedState } from '../data/seed.js';
import { todayJ } from './jalali.js';
import { migrate } from './migrate.js';

const KEY = 'kargah:v1';
const subs = new Set();
let state = null;

function read() { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } }
function write() { try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch { return false; } }

export function load() {
  const s = read();
  const known = s && (s.v === 1 || s.v === 2);
  state = known ? migrate(s) : seedState(todayJ());
  if (!known || s.v !== state.v || s.v === 2) write();
  return state;
}
export const get = () => state;
export function update(mutator) { mutator(state); write(); subs.forEach((f) => f(state)); }
export function subscribe(f) { subs.add(f); return () => subs.delete(f); }
export function resetDemo() { state = seedState(todayJ()); write(); subs.forEach((f) => f(state)); }

export const exportBackup = () => JSON.stringify(state, null, 2);
export function importBackup(text) {
  const s = JSON.parse(text);
  if (!s || (s.v !== 1 && s.v !== 2) || !Array.isArray(s.tasks) || !Array.isArray(s.trades) || !Array.isArray(s.plans)) throw new Error('فایل پشتیبان معتبر نیست');
  state = migrate(s); write(); subs.forEach((f) => f(state));
}

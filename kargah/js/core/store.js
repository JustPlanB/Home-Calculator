/* ذخیره‌ساز: یک شیء state در localStorage (همان معماری حساب‌کتاب). همه‌ی دسترسی‌ها try/catch دارند. */
import { seedState } from '../data/seed.js';
import { todayJ } from './jalali.js';

const KEY = 'kargah:v1';
const subs = new Set();
let state = null;

function read() { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } }
function write() { try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch { return false; } }

export function load() {
  const s = read();
  state = s && s.v === 1 ? s : seedState(todayJ());
  if (!s) write();
  return state;
}
export const get = () => state;
export function update(mutator) { mutator(state); write(); subs.forEach((f) => f(state)); }
export function subscribe(f) { subs.add(f); return () => subs.delete(f); }
export function resetDemo() { state = seedState(todayJ()); write(); subs.forEach((f) => f(state)); }

export const exportBackup = () => JSON.stringify(state, null, 2);
export function importBackup(text) {
  const s = JSON.parse(text);
  if (!s || s.v !== 1 || !Array.isArray(s.tasks) || !Array.isArray(s.trades)) throw new Error('فایل پشتیبان معتبر نیست');
  state = s; write(); subs.forEach((f) => f(state));
}

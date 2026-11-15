// The app's one British date format (Phase 1.46, SOT-14 W5; design.md §3.0): "14 Nov 2026", "Fri 20 Nov, 17:00",
// and "Today" or "Yesterday". Quiz pages use it first; the rest of the app moves to it later (TODO #243).
// Area: platform

// Fixed English names, so every browser writes the same words ("Sep", never "Sept").
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_MS = 86400000;

// A Date from a Date, an ISO string or a timestamp, or null when there's none or it isn't a date.
export function toDate(value) {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// "14 Nov 2026", in the device's time zone. With year: 'auto', a date in this year leaves the year off ("14 Nov"),
// as quiz pages show dates (design.md §3.0); weekday: true adds "Fri ". Missing or not a date: "".
export function formatDate(value, { year = 'always', weekday = false, now = new Date() } = {}) {
  const date = toDate(value);
  if (!date) return '';
  const sameYear = year === 'auto' && date.getFullYear() === (toDate(now) ?? new Date()).getFullYear();
  const day = `${weekday ? `${WEEKDAYS[date.getDay()]} ` : ''}${date.getDate()} ${MONTHS[date.getMonth()]}`;
  return sameYear ? day : `${day} ${date.getFullYear()}`;
}

// "17:00", on the 24-hour clock.
export function formatTime(value) {
  const date = toDate(value);
  if (!date) return '';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// "Fri 20 Nov, 17:00": a due date or a hand-in time, with the year only outside this year.
export function formatDateTime(value, { weekday = true, now = new Date() } = {}) {
  const date = toDate(value);
  if (!date) return '';
  return `${formatDate(date, { year: 'auto', weekday, now })}, ${formatTime(date)}`;
}

// "Today", "Yesterday", or the date with the year only outside this year ("3 Oct", "3 Oct 2025"), counted in
// calendar days: the quiz list's Last used (design.md §3.1).
export function formatDay(value, { now = new Date() } = {}) {
  const date = toDate(value);
  if (!date) return '';
  const today = toDate(now) ?? new Date();
  const days = Math.round((startOfDay(today) - startOfDay(date)) / DAY_MS);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return formatDate(date, { year: 'auto', now: today });
}

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

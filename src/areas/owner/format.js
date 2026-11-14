// The admin panel's number, cost, duration and time formats, as design §5 writes them. Times are in UTC.
// Area: owner

const UTC = 'UTC';
const counts = new Intl.NumberFormat('en-GB');
const dayFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: UTC });
const yearFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: UTC });
const timeFormat = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: UTC,
});
const clockFormat = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
  timeZone: UTC,
});

export const count = (value) => (value === null || value === undefined ? '—' : counts.format(value));

// Tokens: exact in tables ("12,345"), short in tiles and on axes ("12.3K", "1.24M").
export function tokens(value, { short = false } = {}) {
  if (value === null || value === undefined) return '—';
  if (!short || value < 1000) return counts.format(value);
  const [size, unit] = value >= 1e6 ? [value / 1e6, 'M'] : [value / 1e3, 'K'];
  return `${size >= 100 ? Math.round(size) : Number(size.toPrecision(3))}${unit}`;
}

// Estimated cost: "$1,234" from $1,000, "$12.34" from $1, 3 significant digits under $1, "< $0.0001" below that.
export function cost(value) {
  if (value === null || value === undefined) return '—';
  const amount = Number(value);
  if (amount === 0) return '$0';
  if (amount >= 1000) return `$${Math.round(amount).toLocaleString('en-GB')}`;
  if (amount >= 1) return `$${amount.toFixed(2)}`;
  if (amount < 0.0001) return '< $0.0001';
  return `$${Number(amount.toPrecision(3))}`;
}

// A duration in seconds: "< 1 s", "12 s", "1 min 45 s", "58 min", "2 h 14 min". From 10 minutes on it's whole
// minutes, rounded, as the backend's reasons.duration: a 954 s limit reads "16 min" (QA's Section 3 P3-2).
export function duration(seconds) {
  if (seconds === null || seconds === undefined) return '—';
  const whole = Math.floor(seconds);
  if (whole < 1) return '< 1 s';
  if (whole < 60) return `${whole} s`;
  if (whole < 600) {
    const rest = whole % 60;
    return rest ? `${Math.floor(whole / 60)} min ${rest} s` : `${whole / 60} min`;
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return minutes % 60 ? `${hours} h ${minutes % 60} min` : `${hours} h`;
}

const asDate = (value) => (value instanceof Date ? value : new Date(value));
const asDay = (value) => asDate(value.length === 10 ? `${value}T00:00:00Z` : value);

// "13 Nov" for a day this year, "26 Nov 2025" for another year (a "2026-11-13" date or a time), in UTC.
export function day(value) {
  if (!value) return '—';
  const date = asDay(value);
  return (date.getUTCFullYear() === new Date().getUTCFullYear() ? dayFormat : yearFormat).format(date);
}

// Always with its year, as the price periods are: "1 Jan 2026".
export const fullDay = (value) => (value ? yearFormat.format(asDay(value)) : '—');

// "13 Nov, 07:21" for a time, in UTC, with the year when it isn't this year.
export const time = (value) => (value ? `${day(value)}, ${timeFormat.format(asDate(value))}` : '—');

// "09:34:52": the time of day to the second, in UTC, for a task's calls (design §3.8).
export const clock = (value) => (value ? clockFormat.format(asDate(value)) : '—');

// "2 h ago", "Yesterday" or "28 Oct": how long since; the exact time goes in its tooltip.
export function relative(value, now = Date.now()) {
  if (!value) return 'Not yet';
  const seconds = (now - asDate(value).getTime()) / 1000;
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  if (seconds < 2 * 86400) return 'Yesterday';
  return day(value);
}

// A word inside a sentence: "Last active yesterday", "just now"; a date keeps its capital: "29 Oct" (QA P3-5).
export const sentenceCase = (text) => (/^[A-Z][a-z]/.test(text) ? text.charAt(0).toLowerCase() + text.slice(1) : text);

export const percent = (share) => (share === null || share === undefined ? '' : `${Math.round(share * 100)}%`);

// "gemini-3.7-flash" → "Gemini 3.7 Flash", everywhere, with no endpoint (design §10, A11).
export const model = (name) =>
  name
    ? name
        .split('-')
        .map((part) => (/^\d/.test(part) ? part : part[0].toUpperCase() + part.slice(1)))
        .join(' ')
    : '—';

// A stored payload's size, for a text viewer's title: "3.2 KB".
export function size(text) {
  const bytes = new Blob([text]).size;
  if (bytes < 1024) return `${bytes} B`;
  return bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
}

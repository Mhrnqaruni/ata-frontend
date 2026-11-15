// The quiz list's search, filters and sort as plain data (Phase 1.46, SOT-2; design.md §3.1): read from and written to
// the address, turned into GET /api/quiz-library's query, and named on their chips. No React, so tests read it.
// Area: quizzes

import { formatDate } from '../../../utils/dates';
import { libraryParams } from '../queries';
import { STATE_ORDER } from '../words';
import { LIBRARY } from './words';

// Each sort's own direction, as the API's: newest first, except names (A–Z) and the oldest first. The list no longer
// shows question counts (Phase 1.47 R12), so it doesn't sort by them either.
export const SORTS = { last_used: 'desc', name: 'asc', newest: 'desc', oldest: 'asc' };
export const DATES = ['week', 'month', 'term', 'custom'];
const TYPES = { live: 'live', homework: 'self_paced' }; // the address's word, then the API's mode
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export const NO_FILTERS = {
  q: '',
  status: [],
  classIds: [],
  tagIds: [],
  type: '',
  date: '',
  from: '',
  to: '',
  sort: 'last_used',
  order: '',
};

const unique = (values) => [...new Set(values)];

// The filters in an address's query ("?q=photo&status=draft&class=…&sort=name"). Anything unknown is left out.
export function readFilters(search) {
  const params = new URLSearchParams(search);
  const one = (name, allowed) => (allowed.includes(params.get(name)) ? params.get(name) : '');
  const day = (name) => (DAY.test(params.get(name) || '') ? params.get(name) : '');
  return {
    q: (params.get('q') || '').slice(0, 100),
    status: unique(params.getAll('status').filter((state) => STATE_ORDER.includes(state))),
    classIds: unique(params.getAll('class').filter(Boolean)),
    tagIds: unique(params.getAll('tag').filter(Boolean)),
    type: one('type', Object.keys(TYPES)),
    date: one('date', DATES),
    from: day('from'),
    to: day('to'),
    sort: one('sort', Object.keys(SORTS)) || 'last_used',
    order: one('order', ['asc', 'desc']),
  };
}

// The address's query for these filters, with the defaults left out, so the plain list has a bare address.
export function writeFilters(filters) {
  const f = { ...NO_FILTERS, ...filters };
  const params = new URLSearchParams();
  if (f.q.trim()) params.set('q', f.q);
  f.status.forEach((state) => params.append('status', state));
  f.classIds.forEach((id) => params.append('class', id));
  f.tagIds.forEach((id) => params.append('tag', id));
  if (f.type) params.set('type', f.type);
  if (f.date) params.set('date', f.date);
  if (f.date === 'custom' && f.from) params.set('from', f.from);
  if (f.date === 'custom' && f.to) params.set('to', f.to);
  if (f.sort !== 'last_used') params.set('sort', f.sort);
  if (f.order && f.order !== SORTS[f.sort]) params.set('order', f.order);
  return params.toString();
}

export const hasFilters = (f) =>
  Boolean(f.q.trim() || f.status.length || f.classIds.length || f.tagIds.length || f.type || f.date);

// The Archived view (R11, design.md §3.10): the Archived chip is on, so the list shows archived quizzes only.
export const archivedView = (f) => f.status.includes('archived');

// The direction the list is sorted in: the one chosen, or the sort's own.
export const sortOrder = (f) => f.order || SORTS[f.sort];

// A click on a sortable head: the sorted column flips its direction; another column starts in its own.
export function sortBy(f, sort) {
  if (f.sort !== sort) return { sort, order: '' };
  const flipped = sortOrder(f) === 'asc' ? 'desc' : 'asc';
  return { sort, order: flipped === SORTS[sort] ? '' : flipped };
}

// GET /api/quiz-library's query for these filters (SOT-2), in the shared key's form; the reader adds the paging. The
// Archived view asks for archived quizzes alone, whatever an older address also held.
export function apiParams(f, now = new Date()) {
  const range = dateRange(f, now);
  return libraryParams({
    q: f.q.trim(),
    state: archivedView(f) ? ['archived'] : f.status,
    class_id: f.classIds,
    tag_id: f.tagIds,
    mode: TYPES[f.type],
    used_from: range.from,
    used_to: range.to,
    sort: f.sort === 'last_used' ? undefined : f.sort,
    order: f.order && f.order !== SORTS[f.sort] ? f.order : undefined,
  });
}

const pad = (n) => String(n).padStart(2, '0');
// "2026-11-14", in the device's own calendar.
export const isoDay = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
// A "2026-11-14" day as that day's local midnight (new Date("2026-11-14") would be UTC's).
export function localDay(day) {
  if (!DAY.test(day || '')) return null;
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, month - 1, date);
}

// The first day of the school term `now` is in, as UK schools roughly count them: autumn from 1 September, spring
// from 1 January and summer from 1 April.
export function termStart(now) {
  const month = now.getMonth();
  if (month >= 8) return new Date(now.getFullYear(), 8, 1);
  if (month <= 2) return new Date(now.getFullYear(), 0, 1);
  return new Date(now.getFullYear(), 3, 1);
}

// The Date filter's days, both included: this week from Monday, this month from the 1st, this term from its start,
// or the teacher's own days. Last used is never in the future, so only "Pick dates" sets an end.
export function dateRange({ date, from, to }, now = new Date()) {
  const [year, month, day] = [now.getFullYear(), now.getMonth(), now.getDate()];
  if (date === 'week') return { from: isoDay(new Date(year, month, day - ((now.getDay() + 6) % 7))) };
  if (date === 'month') return { from: isoDay(new Date(year, month, 1)) };
  if (date === 'term') return { from: isoDay(termStart(now)) };
  if (date === 'custom') return { from: from || undefined, to: to || undefined };
  return {};
}

// A chip's words: "Class" with nothing chosen, "Class: 8B", or "Class: 8B +2".
export function chipLabel(label, names) {
  if (!names.length) return label;
  return `${label}: ${names[0]}${names.length > 1 ? ` +${names.length - 1}` : ''}`;
}

// The Date chip's choice in words: "This week", or "3 Oct – 14 Nov" for days the teacher picked.
export function dateLabel({ date, from, to }, now = new Date()) {
  const named = { week: LIBRARY.thisWeek, month: LIBRARY.thisMonth, term: LIBRARY.thisTerm };
  if (named[date]) return named[date];
  if (date !== 'custom') return '';
  const [start, end] = [from, to].map((day) => formatDate(localDay(day), { year: 'auto', now }));
  if (start && end) return `${start} – ${end}`;
  if (start) return `${LIBRARY.from} ${start}`;
  return end ? `${LIBRARY.to} ${end}` : LIBRARY.pickDates;
}

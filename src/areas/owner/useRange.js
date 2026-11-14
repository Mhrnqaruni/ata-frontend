// The days a page shows, kept in the address (?range=7d, or ?from=…&to=…), so Back and links keep it (§3.13).
// The default is the last 30 days; days are UTC, and "Last 7 days" and "Last 30 days" include today.
// Area: owner

import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { day } from './format.js';

export const PRESETS = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: 'month', label: 'This month' },
  { key: 'all', label: 'All time' },
];
// Each preset inside a sentence: "No AI use in the last 30 days.", "30 so far" (QA's Section 4 P3-9).
const DURING = {
  today: 'today',
  '7d': 'in the last 7 days',
  '30d': 'in the last 30 days',
  month: 'this month',
  all: 'so far',
};
const RANGE_KEYS = ['range', 'from', 'to'];
const DAY = /^\d{4}-\d\d-\d\d$/;
const iso = (date) => date.toISOString().slice(0, 10);
const before = (isoDay, days) => iso(new Date(Date.parse(`${isoDay}T00:00:00Z`) - days * 86400000));

// The range in an address: its key, label, words for inside a sentence (`during`), first and last day (first is
// null for all time) and the API's query.
export function rangeOf(params, today = iso(new Date())) {
  const from = params.get('from');
  const to = params.get('to');
  if (DAY.test(from || '') && DAY.test(to || '') && from <= to) {
    const label = from === to ? day(from) : `${day(from)} – ${day(to)}`;
    const during = from === to ? `on ${day(from)}` : `from ${day(from)} to ${day(to)}`;
    return { key: 'custom', label, during, start: from, end: to, query: { from, to } };
  }
  const key = PRESETS.some((preset) => preset.key === params.get('range')) ? params.get('range') : '30d';
  const start = { today, '7d': before(today, 6), '30d': before(today, 29), month: `${today.slice(0, 8)}01` }[key];
  const label = PRESETS.find((preset) => preset.key === key).label;
  const during = DURING[key];
  if (key === 'all') return { key, label, during, start: null, end: today, query: { all: true } };
  return { key, label, during, start, end: today, query: { from: start, to: today } };
}

// A sentence's first word in capitals: "In the last 30 days", "So far".
export const capital = (text) => text.charAt(0).toUpperCase() + text.slice(1);

// Whether the range is one day, which has no chart (§3.13).
export const oneDay = (range) => range.start !== null && range.start === range.end;

export default function useRange() {
  const [params, setParams] = useSearchParams();
  const range = useMemo(() => rangeOf(params), [params]);
  const kept = useMemo(() => {
    const only = new URLSearchParams();
    RANGE_KEYS.forEach((key) => params.get(key) && only.set(key, params.get(key)));
    return only;
  }, [params]);

  // Chooses a preset ({ key }) or custom days ({ key: 'custom', from, to }), keeping the address's other parts.
  const choose = (next) => {
    const updated = new URLSearchParams(params);
    RANGE_KEYS.forEach((key) => updated.delete(key));
    updated.delete('page');
    if (next.key === 'custom') {
      updated.set('from', next.from);
      updated.set('to', next.to);
    } else if (next.key !== '30d') {
      updated.set('range', next.key);
    }
    setParams(updated);
  };

  // A link to another panel page that keeps this range, with its own query too.
  const linkTo = (path, extra = {}) => {
    const query = new URLSearchParams(kept);
    Object.entries(extra).forEach(([key, value]) => value !== undefined && value !== '' && query.set(key, value));
    const text = query.toString();
    return text ? `${path}?${text}` : path;
  };

  return { ...range, choose, linkTo };
}

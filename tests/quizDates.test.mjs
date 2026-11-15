// The app's one British date format (Phase 1.46 S3.2, SOT-14 W5; design.md §3.0, §3.1, §3.9): "14 Nov 2026", the
// year left off within this year where asked, "Fri 20 Nov, 17:00", and "Today" and "Yesterday" by calendar day.
// Area: platform
import test from 'node:test';
import assert from 'node:assert/strict';
import { formatDate, formatDateTime, formatDay, formatTime, toDate } from '../src/utils/dates.js';

// Local times, so the results don't depend on the machine's time zone.
const NOW = new Date(2026, 10, 14, 16, 30); // Sat 14 Nov 2026, 16:30
const at = (...parts) => new Date(...parts);

test('dates read "14 Nov 2026"', () => {
  assert.equal(formatDate(at(2026, 10, 14, 9, 5)), '14 Nov 2026');
  assert.equal(formatDate(at(2026, 8, 3)), '3 Sep 2026'); // never "Sept"
  assert.equal(formatDate(at(2025, 0, 31), { weekday: true }), 'Fri 31 Jan 2025');
  assert.equal(formatDate(at(2026, 10, 14).toISOString()), '14 Nov 2026');
  assert.equal(formatDate(at(2026, 10, 14).getTime()), '14 Nov 2026');
});

test("quiz pages leave this year's year off", () => {
  assert.equal(formatDate(at(2026, 9, 3), { year: 'auto', now: NOW }), '3 Oct');
  assert.equal(formatDate(at(2025, 9, 3), { year: 'auto', now: NOW }), '3 Oct 2025');
  assert.equal(formatDate(at(2027, 0, 4), { year: 'auto', now: NOW }), '4 Jan 2027');
});

test('a due date or a hand-in time: "Fri 20 Nov, 17:00", on the 24-hour clock', () => {
  assert.equal(formatDateTime(at(2026, 10, 20, 17, 0), { now: NOW }), 'Fri 20 Nov, 17:00');
  assert.equal(formatDateTime(at(2026, 10, 14, 11, 52), { now: NOW }), 'Sat 14 Nov, 11:52');
  assert.equal(formatDateTime(at(2026, 10, 20, 17, 0), { weekday: false, now: NOW }), '20 Nov, 17:00');
  assert.equal(formatDateTime(at(2025, 11, 1, 9, 7), { now: NOW }), 'Mon 1 Dec 2025, 09:07');
  assert.equal(formatTime(at(2026, 10, 14, 0, 0)), '00:00');
});

test('Last used: Today, Yesterday, then the date, by calendar day and not by 24 hours', () => {
  assert.equal(formatDay(at(2026, 10, 14, 0, 1), { now: NOW }), 'Today');
  assert.equal(formatDay(at(2026, 10, 13, 23, 59), { now: NOW }), 'Yesterday');
  assert.equal(formatDay(at(2026, 10, 12, 18, 0), { now: NOW }), '12 Nov');
  assert.equal(formatDay(at(2025, 9, 3), { now: NOW }), '3 Oct 2025');
});

test('missing or broken dates give "", never a made-up date', () => {
  for (const value of [null, undefined, '', 'not a date', NaN]) {
    assert.equal(formatDate(value), '');
    assert.equal(formatDateTime(value), '');
    assert.equal(formatDay(value), '');
    assert.equal(formatTime(value), '');
  }
  assert.equal(toDate('2026-11-14T09:00:00Z').toISOString(), '2026-11-14T09:00:00.000Z');
});

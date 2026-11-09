// The time on a parent-mode row (Phase 1.37; design §5.2): today and yesterday with the clock, a date this year, a
// date with its year, and no label for a missing time.
// Area: family
import test from 'node:test';
import assert from 'node:assert/strict';
import { whenLabel } from '../src/areas/family/whenLabel.js';

// Built from local times, so the labels hold in any time zone.
const now = new Date(2026, 10, 8, 18, 30);
const at = (...parts) => new Date(...parts).toISOString();

test('today and yesterday carry the clock; other days are a date, with the year when it is another year', () => {
  assert.equal(whenLabel(at(2026, 10, 8, 10, 15), now), 'Today at 10:15');
  assert.equal(whenLabel(at(2026, 10, 8, 0, 5), now), 'Today at 00:05');
  assert.equal(whenLabel(at(2026, 10, 7, 18, 40), now), 'Yesterday at 18:40');
  assert.equal(whenLabel(at(2026, 10, 6, 23, 59), now), '6 Nov');
  assert.equal(whenLabel(at(2026, 0, 2, 9, 0), now), '2 Jan');
  assert.equal(whenLabel(at(2025, 10, 7, 9, 0), now), '7 Nov 2025');
});

test('a missing or unreadable time gives no label', () => {
  for (const value of [undefined, null, '', 'soon']) assert.equal(whenLabel(value, now), '');
});

// The class chooser's rules (Phase 1.46 S3.3, SOT-11; design.md §3.3): years from class names, year groups in natural
// order, the search, Recent from the library's items, and ticks within an audience's 100.
// Area: academics
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  byName,
  groupByYear,
  matches,
  MAX_CHOSEN,
  pupils,
  recentClassIds,
  toggle,
  yearOf,
} from '../src/components/tags/classChoice.js';

// 200 classes, as the 1.45 mock had them: Years 7 to 11 with sets and subjects, and some clubs.
const subjects = ['Science', 'Maths', 'English', 'History', 'Geography'];
const classes = [];
for (const year of [7, 8, 9, 10, 11])
  for (const set of 'ABCDEFGH')
    for (const subject of subjects)
      classes.push({ id: `c${classes.length}`, name: `${year}${set} ${subject}`, studentCount: 30 });
classes.splice(
  195,
  5,
  ...['Eco club', 'Coverage', 'Year 9 Drama', 'Y10 Music', '2024 leavers'].map((name, i) => ({ id: `x${i}`, name }))
);

test("a class's year comes from the start of its name", () => {
  assert.equal(yearOf('7A Science'), 7);
  assert.equal(yearOf('10X Maths'), 10);
  assert.equal(yearOf('Year 9 Drama'), 9);
  assert.equal(yearOf('Y10 Music'), 10);
  assert.equal(yearOf('2024 leavers'), null);
  assert.equal(yearOf('Eco club'), null);
  assert.equal(yearOf(undefined), null);
});

test('200 classes fall into year groups, youngest first, in natural order, with the rest last', () => {
  const groups = groupByYear(classes);
  assert.deepEqual(
    groups.map((group) => group.label),
    ['Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Other classes']
  );
  assert.equal(
    groups.reduce((sum, group) => sum + group.items.length, 0),
    200
  );
  assert.deepEqual(
    groups[0].items.slice(0, 3).map((c) => c.name),
    ['7A English', '7A Geography', '7A History']
  );
  assert.ok(groups[2].items.some((c) => c.name === 'Year 9 Drama'));
  assert.deepEqual(
    groups.at(-1).items.map((c) => c.name),
    ['2024 leavers', 'Coverage', 'Eco club']
  );
  assert.deepEqual(
    [{ name: '10A' }, { name: '9A' }, { name: '9B' }].sort(byName).map((c) => c.name),
    ['9A', '9B', '10A']
  );
});

test('the search finds every word typed, in any case: "8B" among 200', () => {
  const found = matches(classes, '8b');
  assert.equal(found.length, 5);
  assert.ok(found.every((c) => c.name.startsWith('8B ')));
  assert.deepEqual(
    matches(classes, '8b sci').map((c) => c.name),
    ['8B Science']
  );
  assert.equal(matches(classes, '10Z').length, 0);
  assert.equal(matches(classes, '  ').length, 200);
});

test('Recent: the classes of the latest quizzes, newest first, each once, at most 5', () => {
  const items = [
    { classes: [{ id: 'c1' }, { id: 'c2' }] },
    { classes: [] },
    { classes: [{ id: 'c2' }, { id: 'c3' }] },
    { classes: [{ id: 'c4' }, { id: 'c5' }, { id: 'c6' }] },
  ];
  assert.deepEqual(recentClassIds(items), ['c1', 'c2', 'c3', 'c4', 'c5']);
  assert.deepEqual(recentClassIds(items, 2), ['c1', 'c2']);
  assert.deepEqual(recentClassIds(undefined), []);
});

test('ticks: on, off, and never past the 100 an audience holds', () => {
  assert.deepEqual(toggle(['a'], 'b'), ['a', 'b']);
  assert.deepEqual(toggle(['a', 'b'], 'a'), ['b']);
  const hundred = Array.from({ length: MAX_CHOSEN }, (_, i) => `c${i}`);
  assert.equal(toggle(hundred, 'one more'), hundred);
  assert.equal(toggle(hundred, 'c5').length, 99);
  assert.equal(pupils(28), '28 pupils');
  assert.equal(pupils(1), '1 pupil');
  assert.equal(pupils(undefined), '0 pupils');
});

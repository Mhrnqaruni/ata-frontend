// Home's rules (Phase 1.38 design §2.3, §2.6): the greeting by local time, the child's latest items, and the
// remembered Hide on Get started.
// Area: family
import test from 'node:test';
import assert from 'node:assert/strict';
import { LATEST, greeting, latestItems, readHidden, writeHidden } from '../src/areas/family/child/home.js';

const at = (hour, minute = 0) => new Date(2026, 10, 8, hour, minute);

test('the greeting follows the local time and uses the parent’s first name', () => {
  assert.equal(greeting(at(9), 'Jordan'), 'Good morning, Jordan');
  assert.equal(greeting(at(12), 'Jordan'), 'Good afternoon, Jordan');
  assert.equal(greeting(at(17, 59), 'Jordan'), 'Good afternoon, Jordan');
  assert.equal(greeting(at(18), 'Jordan'), 'Good evening, Jordan');
  assert.equal(greeting(at(23), ''), 'Good evening');
});

test('the latest list holds homework checks and the four kinds, newest first, at most six', () => {
  const item = (id, kind, finishedAt, createdAt = finishedAt) => ({ id, kind, finishedAt, createdAt });
  const items = [
    item('a', 'quiz', '2026-11-08T09:00:00Z'),
    item('b', 'learn', '2026-11-08T12:00:00Z'),
    item('c', 'check', '2026-11-08T11:00:00Z'),
    item('d', 'story', null, '2026-11-08T13:00:00Z'),
    item('e', 'flashcards', '2026-11-07T09:00:00Z'),
    item('f', 'mindmap', '2026-11-06T09:00:00Z'),
    item('g', 'quiz', '2026-11-05T09:00:00Z'),
    item('h', 'quiz', '2026-11-04T09:00:00Z'),
  ];
  assert.deepEqual(
    latestItems(items).map((x) => x.id),
    ['d', 'c', 'a', 'e', 'f', 'g']
  );
  assert.equal(LATEST, 6);
  assert.deepEqual(latestItems(undefined), []);
});

test('with storage blocked, Hide is not remembered and nothing throws', () => {
  assert.equal(readHidden('parent-1', 'child-1'), false);
  assert.doesNotThrow(() => writeHidden('parent-1', 'child-1'));
});

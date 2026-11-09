// Homework's "Not marked yet" rows (Phase 1.37 S3.4; design §3.7; SOT C-21, C-24): the notebook home's homework
// uploads that no check there uses, and, when the home's 50 activities are a full window, only the newer ones.
// Area: family
import test from 'node:test';
import assert from 'node:assert/strict';
import { unmarkedUploads } from '../src/areas/family/lists/unmarked.js';

// The notebook home's materials and activities, newest first, cut to the fields the rule reads.
const upload = (id, purpose, createdAt) => ({ id, purpose, title: '', files: [{ name: `${id}.jpg` }], createdAt });
const check = (id, materialIds, createdAt) => ({
  id,
  kind: 'check',
  materialId: materialIds[0],
  materialIds,
  createdAt,
});
const quiz = (id, createdAt, materialId = 'book') => ({
  id,
  kind: 'quiz',
  materialId,
  materialIds: [materialId],
  createdAt,
});
const ids = (rows) => rows.map((row) => row.id);

test('a homework upload that a check uses is left out, and other materials never count', () => {
  const home = {
    materials: [
      upload('w-new', 'work', '2026-11-08T10:00:00Z'),
      upload('w-marked', 'work', '2026-11-07T10:00:00Z'),
      upload('w-old-row', 'work', '2026-11-06T12:00:00Z'),
      upload('book', 'learning', '2026-11-06T10:00:00Z'),
      upload('w-quizzed', 'work', '2026-11-05T10:00:00Z'),
    ],
    activities: [
      check('c-1', ['w-marked'], '2026-11-07T10:01:00Z'),
      // An older check row with only its materialId still counts as using it.
      { id: 'c-0', kind: 'check', materialId: 'w-old-row', createdAt: '2026-11-06T12:01:00Z' },
      // A quiz made from an upload doesn't mark it.
      quiz('q-1', '2026-11-05T11:00:00Z', 'w-quizzed'),
    ],
    attempts: [],
  };
  assert.deepEqual(ids(unmarkedUploads(home)), ['w-new', 'w-quizzed']);
  assert.deepEqual(unmarkedUploads(undefined), []);
});

test('with a full home, only uploads newer than its oldest activity count', () => {
  const window = Array.from({ length: 49 }, (_, i) => quiz(`q-${i}`, `2026-11-0${2 + (i % 7)}T09:00:00Z`));
  const oldest = quiz('q-oldest', '2026-11-01T09:00:00Z');
  const materials = [
    upload('w-after', 'work', '2026-11-01T12:00:00Z'),
    upload('w-before', 'work', '2026-10-31T09:00:00Z'),
  ];
  // A full window of 50: an upload older than its oldest activity may have a check outside it, so it's left out.
  assert.deepEqual(ids(unmarkedUploads({ materials, activities: [...window, oldest], attempts: [] })), ['w-after']);
  // Under 50, the home holds every activity, so every unchecked upload counts.
  assert.deepEqual(ids(unmarkedUploads({ materials, activities: window, attempts: [] })), ['w-after', 'w-before']);
});

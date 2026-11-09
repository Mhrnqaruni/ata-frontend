// "How Sam is doing" (Phase 1.37 S4.2; Phase 1.38 design §3.4): the points' percentages and order, the items left
// out, each dot's tooltip, and the sentence under the chart for many points, one and none.
// Area: family
import test from 'node:test';
import assert from 'node:assert/strict';
import { pointLabel, scorePoints, trendWords } from '../src/areas/family/scoresSeries.js';

// List items as the activity list sends them (SOT B4), newest first by creation.
const item = (id, kind, createdAt, finishedAt, summary, status = 'completed') => ({
  id,
  kind,
  title: `Title ${id}`,
  status,
  createdAt,
  finishedAt,
  settings: {},
  summary,
});
const marks = (right, total) => ({ right, notQuite: total - right, toCheck: 0, total });
// The best score is full marks, so a point taken from the best score rather than the latest would show.
const tried = (score, total, at) => ({ attempts: 2, latest: { score, total, at }, best: { score: total, total } });
const checks = [
  item('c-making', 'check', '2026-11-08T09:00:00+00:00', null, null, 'running'),
  item('c-pages', 'check', '2026-11-07T09:00:00+00:00', '2026-11-07T09:01:00+00:00', null, 'needs_input'),
  item('c-3', 'check', '2026-11-06T09:00:00+00:00', '2026-11-06T09:01:30.500000+00:00', marks(4, 6)),
  item('c-blank', 'check', '2026-11-05T09:00:00+00:00', '2026-11-05T09:01:00+00:00', marks(0, 0)),
  item('c-2', 'check', '2026-11-04T09:00:00+00:00', '2026-11-04T09:01:00+00:00', marks(0, 5)),
  item('c-1', 'check', '2026-11-02T09:00:00+00:00', null, marks(7, 10)),
];
const quizzes = [
  item('q-new', 'quiz', '2026-11-08T08:00:00+00:00', '2026-11-08T08:01:00+00:00', {
    attempts: 0,
    latest: null,
    best: null,
  }),
  item('q-b', 'quiz', '2026-11-07T08:00:00+00:00', '2026-11-07T08:01:00+00:00', tried(3, 5, '2026-11-07T08:10:00Z')),
  item('q-a', 'quiz', '2026-11-01T08:00:00+00:00', '2026-11-01T08:01:00+00:00', tried(5, 5, '2026-11-08T07:00:00Z')),
  item('cards', 'flashcards', '2026-11-03T08:00:00+00:00', '2026-11-03T08:01:00+00:00', null),
];
const ids = (points) => points.map((point) => point.id);
const percents = (list) => list.map((percent) => ({ percent }));
// The sentence as it reads, with the bold part in **…**.
const read = ({ lead, strong, tail }) => `${lead}${strong && `**${strong}**`}${tail}`;

test('each point is its score as a whole percentage, as the row shows it: 4 of 6 is 67%', () => {
  assert.deepEqual(
    scorePoints(checks).map((point) => [point.id, point.right, point.total, point.percent]),
    [
      ['c-1', 7, 10, 70],
      ['c-2', 0, 5, 0],
      ['c-3', 4, 6, 67],
    ]
  );
  assert.deepEqual(
    scorePoints(quizzes).map((point) => [point.id, point.right, point.total, point.percent]),
    [
      ['q-b', 3, 5, 60],
      ['q-a', 5, 5, 100],
    ]
  );
  // A point keeps its item, for opening the result, and its name and time, for the tooltip and the hidden table.
  const [first] = scorePoints(checks);
  assert.equal(first.item, checks[5]);
  assert.deepEqual([first.title, first.at], ['Title c-1', '2026-11-02T09:00:00+00:00']);
});

test('points run oldest first: a check by when it was marked, a quiz by its latest attempt', () => {
  assert.deepEqual(ids(scorePoints(checks)), ['c-1', 'c-2', 'c-3']);
  // q-a was made first but tried last, so its latest score is the latest point.
  assert.deepEqual(ids(scorePoints(quizzes)), ['q-b', 'q-a']);
  assert.equal(scorePoints(quizzes)[1].at, '2026-11-08T07:00:00Z');
});

test('items with no score are left out', () => {
  // Making, needing more pages, nothing marked, never tried, and a kind with no score.
  const points = ids(scorePoints([...checks, ...quizzes]));
  for (const id of ['c-making', 'c-pages', 'c-blank', 'q-new', 'cards']) assert.equal(points.includes(id), false, id);
  assert.deepEqual(scorePoints([]), []);
  assert.deepEqual(scorePoints(undefined), []);
});

test("a dot's tooltip names the item, its score in words and as a percentage, and its day", () => {
  assert.equal(pointLabel(scorePoints(checks)[2]), 'Title c-3 · 4 of 6 right (67%) · 6 Nov');
  assert.equal(pointLabel(scorePoints(quizzes)[0]), 'Title q-b · 3 of 5 right (60%) · 7 Nov');
});

test('the sentence goes from the first to the last of the last five: up, down or steady, with the change in bold', () => {
  // Seven checks: the sentence reads the last five, 60 … 80, as design §3.4's example does.
  assert.equal(
    read(trendWords(percents([10, 20, 60, 70, 70, 80, 80]), 'check', 'Sam')),
    '**Up from 60% to 80%** across the last 5 homework checks.'
  );
  assert.equal(
    read(trendWords(scorePoints(checks), 'check', 'Sam')),
    '**Down from 70% to 67%** across the last 3 homework checks.'
  );
  assert.equal(
    read(trendWords(percents([80, 50, 80]), 'check', 'Sam')),
    '**Steady at 80%** across the last 3 homework checks.'
  );
  assert.equal(
    read(trendWords(scorePoints(quizzes), 'quiz', 'Sam')),
    '**Up from 60% to 100%** across the last 2 quizzes.'
  );
});

test("one point is the child's first; none says when scores will show", () => {
  assert.equal(read(trendWords(percents([80]), 'check', 'Sam')), 'Sam’s first homework check: **80%**.');
  assert.equal(read(trendWords(percents([40]), 'quiz', 'Mia')), 'Mia’s first quiz: **40%**.');
  assert.equal(read(trendWords([], 'check', 'Sam')), 'Sam’s homework scores will show here after the first check.');
  assert.equal(read(trendWords([], 'quiz', 'Sam')), 'Sam’s quiz scores will show here after the first quiz.');
});

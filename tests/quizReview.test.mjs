// The quiz review page's logic and words (Phase 1.47 S4.2; SOT-1 C3, SOT-4; design.md §3.9, §5): answers as stored,
// each answer's state and chip, Needs a look, a card's values, the options and the accepted line, and ‹ ›'s order.
// Area: quizzes
import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({
  stdin: {
    contents: `export * from './src/areas/quizzes/review/answers.js';
export { PUPIL_REVIEW } from './src/areas/quizzes/review/words.js';
export { reviewLink } from './src/areas/quizzes/review/links.js';
export { REVIEW } from './src/components/review/words.js';
export { neverShownIn } from './src/areas/quizzes/words.js';`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  logLevel: 'error',
});
const r = await import(`data:text/javascript,${encodeURIComponent(bundle.outputFiles[0].text)}`);

// A C3 question with its answer.
const question = (type, answer, extra = {}) => ({
  question_id: extra.id ?? 'q1',
  number: extra.number ?? 1,
  type,
  text: 'Which is the capital of Iran?',
  options: extra.options ?? [],
  correct_answer: extra.correct ?? [],
  points: extra.points ?? 10,
  match_level: extra.level,
  answer: { state: 'answered', points: 0, comment: null, marked_by: 'auto', revision: 'r1', ...answer },
});

test('answers as stored: live lists, homework objects, and blanks', () => {
  assert.deepEqual(r.chosen([1]), [1]);
  assert.deepEqual(r.chosen({ selected_index: 1 }), [1]);
  assert.deepEqual(r.chosen({ selected_value: false }), [false]);
  assert.deepEqual(r.chosen({ text: 'persia' }), ['persia']);
  assert.deepEqual(r.chosen(['persia']), ['persia']);
  assert.deepEqual(r.chosen([]), []);
  assert.deepEqual(r.chosen({}), []);
  assert.deepEqual(r.chosen(null), []);
});

test("each answer's state by points, and Needs a look: wrong, part marks, no answer or waiting (design.md §3.9)", () => {
  const right = question('multiple_choice', { points: 10, is_correct: true });
  const wrong = question('multiple_choice', { points: 0, is_correct: false });
  const part = question('short_answer', { points: 7, is_correct: true, marked_by: 'ai' });
  const none = question('short_answer', { state: 'no_answer', points: 0, value: [] });
  const waiting = question('short_answer', { state: 'waiting_for_mark', points: null });
  const poll = question('poll', { points: 0 });
  assert.deepEqual([right, wrong, part, none, waiting, poll].map(r.stateOf), [
    'right',
    'wrong',
    'part',
    'none',
    'waiting',
    'plain',
  ]);
  assert.deepEqual([right, wrong, part, none, waiting, poll].map(r.needsLook), [false, true, true, true, true, false]);
  // A teacher's mark shows "Marked by you", whatever the points; a poll has no chip.
  const marked = question('multiple_choice', { points: 6, marked_by: 'teacher' });
  assert.equal(r.chipOf(marked), 'teacher');
  assert.equal(r.chipOf(poll), null);
  assert.equal(r.stateOf(marked), 'part');
  // A missed answer the teacher gave points to is no longer "no answer".
  assert.equal(r.stateOf(question('short_answer', { state: 'no_answer', points: 4, marked_by: 'teacher' })), 'part');
  assert.deepEqual(r.mapItem({ ...wrong, number: 4 }), {
    id: 'q1',
    label: '4',
    state: 'wrong',
    changed: false,
    needsLook: true,
  });
});

test("a card's values: no made-up 0 while a mark waits; whole marks from 0 to the points (C4, N-1)", () => {
  assert.deepEqual(r.valuesOf(question('short_answer', { state: 'waiting_for_mark', points: null })), {
    mark: '',
    comment: '',
  });
  assert.deepEqual(r.valuesOf(question('short_answer', { points: 0, comment: 'The answer is Tehran.' })), {
    mark: '0',
    comment: 'The answer is Tehran.',
  });
  const q = question('short_answer', {});
  assert.equal(r.isValid({ mark: '' }, q), false);
  assert.equal(r.isValid({ mark: '10' }, q), true);
  assert.equal(r.isValid({ mark: '11' }, q), false);
  assert.equal(r.isValid({ mark: '7.5' }, q), false);
  assert.equal(r.markable(question('poll', {})), false);
});

test("the options show the pupil's choice and the right one; typed answers show what's accepted, at its level", () => {
  const mc = question('multiple_choice', { value: [2] }, { options: ['Tehran', 'Shiraz', 'Tabriz'], correct: [0] });
  assert.deepEqual(
    r.optionRows(mc).map((row) => [row.letter, row.text, row.chosen, row.right]),
    [
      ['A', 'Tehran', false, true],
      ['B', 'Shiraz', false, false],
      ['C', 'Tabriz', true, false],
    ]
  );
  const homework = question('multiple_choice', { value: { selected_index: 0 } }, { options: ['4', '5'], correct: [0] });
  assert.deepEqual(
    r.optionRows(homework).map((row) => [row.chosen, row.right]),
    [
      [true, true],
      [false, false],
    ]
  );
  const truth = question('true_false', { value: { selected_value: false } }, { correct: [true] });
  assert.deepEqual(
    r.optionRows(truth).map((row) => [row.text, row.chosen, row.right]),
    [
      ['True', false, true],
      ['False', true, false],
    ]
  );
  const poll = question('poll', { value: [1] }, { options: ['Yes', 'No'] });
  assert.ok(r.optionRows(poll).every((row) => !row.right));
  const typed = question('short_answer', { value: ['persia'] }, { correct: ['Iran'] });
  assert.equal(r.typedAnswer(typed), 'persia');
  assert.equal(r.acceptedLine(typed), 'Accepted: Iran · Same meaning', 'older questions are Same meaning (OQ3)');
  assert.equal(r.acceptedLine({ ...typed, match_level: 'exact' }), 'Accepted: Iran · Exact');
  assert.equal(r.typedAnswer(question('short_answer', { state: 'no_answer', value: {} })), null);
  assert.equal(r.allBlank([question('short_answer', { state: 'no_answer', points: 0 })]), true);
});

test('‹ › follow the results page: class pupils lowest score first, then walk-ins, by attempt_id, skipping absent', () => {
  const summary = {
    pupils: [
      { id: 'p1', attempt_id: 'a1', name: 'Ada', score: 80, status: 'done' },
      { id: 'p2', attempt_id: 'a2', name: 'Ben', score: 30, status: 'done' },
      { id: 'p3', attempt_id: null, name: 'Cal', score: null, status: 'absent' },
    ],
    not_on_class_list: [{ id: 'a9', attempt_id: 'a9', name: 'Student 77', score: 50, status: 'done' }],
  };
  const order = r.reviewOrder(summary);
  assert.deepEqual(
    order.map((row) => row.name),
    ['Ben', 'Ada', 'Student 77']
  );
  assert.deepEqual(r.neighboursOf(order, 'a1'), { previous: order[0], next: order[2] });
  assert.deepEqual(r.neighboursOf(order, 'a2'), { previous: null, next: order[1] });
  assert.deepEqual(r.neighboursOf(order, 'nobody'), { previous: null, next: null });
  assert.deepEqual(r.reviewOrder(undefined), []);
  assert.equal(r.reviewLink('q 1', 'run/2', 'a1'), '/quizzes/q%201/runs/run%2F2/pupils/a1');
});

test("the header's context line, and no never-shown word on the page", () => {
  const year = new Date().getFullYear();
  const line = r.contextLine({
    quiz_title: 'Year 9 Cells',
    date: `${year}-11-14T09:00:00Z`,
    classes: [{ name: '8B' }],
  });
  assert.equal(line, 'Year 9 Cells · 14 Nov · 8B');
  assert.equal(r.contextLine({ quiz_title: 'Year 9 Cells', date: null, classes: [] }), 'Year 9 Cells');
  const said = (words) =>
    Object.values(words)
      .flatMap((value) =>
        typeof value === 'function' ? [value('Ada'), value(1)] : typeof value === 'object' ? said(value) : [value]
      )
      .join(' ');
  assert.deepEqual(r.neverShownIn(said(r.PUPIL_REVIEW)), []);
  assert.deepEqual(r.neverShownIn(said(r.REVIEW)), []);
});

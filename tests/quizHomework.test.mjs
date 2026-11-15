// The teacher's homework page logic (Phase 1.46 S6.2; SOT-10, SOT-7; design.md §3.10): handed in · working · not
// started from the run's summary, each pupil once with how far they got, honest averages, the due line and the words.
// Area: quizzes
import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({
  stdin: {
    contents: `export * from './src/areas/quizzes/homework/pupils.js';
export * from './src/areas/quizzes/homework/words.js';
export { neverShownIn } from './src/areas/quizzes/words.js';`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  logLevel: 'error',
});
const homework = await import(`data:text/javascript,${encodeURIComponent(bundle.outputFiles[0].text)}`);
const { homeworkRows, counters, answerWords, HOMEWORK, dueLine, formatDuration, formatPoints, neverShownIn } = homework;

// SOT-10's check: 3 pupils, one handed in, one answered 1 of 2, one never opened it; and a walk-in.
const summary = {
  kind: 'homework',
  status: 'active',
  classes: [{ id: 'c8b', name: '8B' }],
  expected: 3,
  took_part: 2,
  handed_in: 1,
  working: 1,
  not_started: 1,
  average: 20,
  max_points: 20,
  questions: [{ id: 'q1' }, { id: 'q2' }],
  pupils: [
    { id: 'l1', name: 'Ada Okafor', display_id: 'S-700', score: 20, status: 'done', needs_help: false },
    { id: 'l2', name: 'Ben Diaz', display_id: 'S-701', score: null, status: 'working', needs_help: false },
    { id: 'l3', name: 'Cleo Patel', display_id: 'S-702', score: null, status: 'not_started', needs_help: false },
  ],
  not_on_class_list: [{ id: 'w1', name: 'Sam Walker', display_id: 'S-990', score: null, status: 'working' }],
};
const progress = [
  {
    student_id: 'S-700',
    display_student_id: 'S-700',
    progress_percentage: 100,
    time_spent_seconds: 754,
    status: 'submitted',
  },
  {
    student_id: 's-701',
    display_student_id: 's-701',
    progress_percentage: 50,
    time_spent_seconds: 120,
    status: 'in_progress',
  },
  {
    student_id: 'outsider_S-990',
    display_student_id: 'S-990',
    progress_percentage: 50,
    time_spent_seconds: 60,
    is_outsider: true,
  },
];

test('handed in 1 · working 1 · not started 1, each pupil once, the walk-in apart (SOT-10 check)', () => {
  assert.deepEqual(counters(summary), { handedIn: 1, working: 1, notStarted: 1 });
  const { pupils, walkIns, total } = homeworkRows(summary, progress);
  assert.equal(total, 2);
  assert.deepEqual(
    pupils.map((row) => [row.name, row.state, row.answered, row.score, row.seconds]),
    [
      ['Ada Okafor', 'handedIn', 2, 20, 754],
      ['Ben Diaz', 'working', 1, null, null],
      ['Cleo Patel', 'notStarted', 0, null, null],
    ]
  );
  assert.equal(pupils[0].studentId, 'S-700', 'a pupil who started opens their answers');
  assert.equal(pupils[1].studentId, 's-701', 'matched by school number, whatever its case');
  assert.equal(pupils[2].studentId, null, "a pupil who hasn't started has no answers to open");
  assert.deepEqual(
    walkIns.map((row) => [row.name, row.number, row.studentId]),
    [['Sam Walker', 'S-990', 'outsider_S-990']]
  );
  assert.deepEqual(counters(null), { handedIn: null, working: null, notStarted: null }, 'loading: dashes');
});

test('honest numbers: the average says whom it covers, and a missing score is never 0', () => {
  assert.equal(
    HOMEWORK.average({ count: 3, all: true, average: 16, max: 20 }),
    'Average of the 3 who handed in: 16 / 20 points'
  );
  assert.equal(
    HOMEWORK.average({ count: 2, all: false, average: 15.5, max: 20 }),
    'Average of the 2 marked so far: 15.5 / 20 points'
  );
  assert.equal(formatPoints(16.333), '16.3');
  assert.equal(HOMEWORK.score(16, 20), '16 / 20');
});

test("the due line, the time taken, and a pupil's answers in words", () => {
  const now = new Date(2026, 10, 14, 16, 0);
  assert.equal(dueLine({ classes: '8B', deadline: new Date(2026, 10, 20, 17, 0), now }), '8B · Due Fri 20 Nov, 17:00');
  assert.equal(dueLine({ classes: '8B', deadline: null, now }), '8B · No due date');
  assert.equal(
    dueLine({ classes: '8B', closed: true, closedAt: new Date(2026, 10, 20, 17, 0), now }),
    '8B · Closed 20 Nov, 17:00'
  );
  assert.deepEqual([45, 754, 3900].map(formatDuration), ['45 s', '13 min', '1 h 5 min']);
  assert.equal(
    answerWords({ question_type: 'multiple_choice', student_answer: 1 }, ['Mitochondria', 'Chloroplast']),
    'Chloroplast'
  );
  assert.equal(answerWords({ question_type: 'multiple_choice', student_answer: 2 }, undefined), 'C');
  assert.equal(answerWords({ question_type: 'true_false', student_answer: false }), 'False');
  assert.equal(answerWords({ question_type: 'short_answer', student_answer: 'CO2' }), 'CO2');
  assert.equal(answerWords({ question_type: 'short_answer', student_answer: null }), 'No answer');
});

test('no word the screens never say', () => {
  const said = Object.values(HOMEWORK).map((word) =>
    typeof word === 'function' ? word({ count: 2, all: true, average: 1, max: 2 }, 3) : word
  );
  assert.deepEqual(neverShownIn(said.join(' ')), []);
});

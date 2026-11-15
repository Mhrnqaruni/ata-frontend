// The pupils' screens' logic (Phase 1.46 S6.3, Phase 1.47 S3.4; SOT-9, SOT-10, SOT-10a, C5, C10; design.md §3.5): the
// live room as the socket tells it (also after getting back in), kind feedback by match level, the points line, the
// end's counts and places, each answer in its words (blanks as none), and the words.
// Area: quizzes
import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({
  stdin: {
    contents: `export * from './src/areas/quizzes/play/playState.js';
export { PLAY } from './src/areas/quizzes/play/words.js';
export { neverShownIn } from './src/areas/quizzes/words.js';
export { secondsLeft } from './src/areas/quizzes/live/liveClock.js';`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  logLevel: 'error',
});
const play = await import(`data:text/javascript,${encodeURIComponent(bundle.outputFiles[0].text)}`);
const { initialPlay, playReducer, answerWords, rightWords, ready, PLAY, neverShownIn, secondsLeft } = play;
const { pointsLine, sendHint, closedOutcome, answerKinds, placed, givenAnswers } = play;

const NOW = Date.parse('2026-11-14T16:00:00.000Z');
const question = (id, index, type = 'multiple_choice', extra = {}) => ({
  type: 'question_started',
  question: {
    id,
    text: 'Q',
    type,
    options: ['Cell membrane', 'Nucleus', 'Cytoplasm'],
    points: 10,
    order_index: index,
    time_limit_seconds: 30,
  },
  remaining_ms: 29900,
  ...extra,
});
const apply = (state, messages, now = NOW) => messages.reduce((s, message) => playReducer(s, { message, now }), state);

test('a question, its close with right or wrong, and the end, as the socket tells it', () => {
  let state = apply(initialPlay(), [{ type: 'session_started' }]);
  assert.equal(state.phase, 'waiting');
  state = apply(state, [question('q1', 0)], NOW - 12000);
  assert.equal(state.phase, 'question');
  assert.equal(secondsLeft(state.endsAt, NOW - 12000), 30, "a device 12 s behind counts the server's 30 s (X9)");
  state = apply(state, [
    { type: 'question_ended', question_index: 0, cooldown_seconds: 0, auto_advance_enabled: false },
    {
      type: 'cooldown_started',
      cooldown_seconds: 0,
      auto_advance_enabled: false,
      your_answer: { is_correct: false, points_earned: 0, correct_answer: [0] },
    },
  ]);
  assert.equal(state.phase, 'closed');
  assert.equal(state.movesOnAt, null, 'waiting for the teacher: "Next question…"');
  assert.deepEqual(closedOutcome(state.question, state.feedback, true), {
    tone: 'wrong',
    title: 'Not quite.',
    line: 'The answer was Cell membrane.',
  });
  state = apply(state, [question('q2', 1)]);
  assert.equal(state.feedback, null, 'a new question starts clean');
  state = apply(state, [{ type: 'leaderboard_update', leaderboard: [{ rank: 1, participant_id: 'p1', score: 20 }] }]);
  state = apply(state, [{ type: 'session_ended', show_result_feedback: true, show_leaderboard: false }]);
  assert.deepEqual(state.end, { showResults: true, showLeaderboard: false });
  assert.equal(apply(state, [question('q3', 2)]).phase, 'finished', 'nothing reopens a finished quiz');
});

test('getting back in: the server says this pupil answered, and the same question keeps it', () => {
  let state = apply(initialPlay(), [question('q1', 0, 'multiple_choice', { remaining_ms: 12000 })]);
  state = apply(state, [{ type: 'answer_submitted', result: { question_id: 'q1', grading_status: 'complete' } }]);
  assert.equal(state.answeredId, 'q1');
  state = apply(state, [question('q1', 0, 'multiple_choice', { remaining_ms: 11000 })]);
  assert.equal(state.answeredId, 'q1', 'the same question again keeps the answer');
  state = apply(state, [{ type: 'cooldown_started', cooldown_seconds: 8, auto_advance_enabled: true }]);
  assert.equal(secondsLeft(state.movesOnAt, NOW), 8, 'moving on by itself: "Next question in 8 s"');
  assert.equal(state.feedback, null, 'a teacher who hides right or wrong sends none');
});

test('a short answer waits for its mark; a poll is never marked', () => {
  let state = apply(initialPlay(), [question('q1', 0, 'short_answer')]);
  state = apply(state, [
    { type: 'cooldown_started', cooldown_seconds: 0, your_answer: { is_correct: null, points_earned: 0 } },
  ]);
  assert.equal(state.feedback.pending, true);
  state = apply(state, [{ type: 'ai_grading_complete', question_id: 'q1' }]);
  assert.equal(state.regrade, 'q1');
  state = apply(state, [{ type: 'feedback', feedback: { is_correct: true, points_earned: 10 } }]);
  assert.deepEqual([state.feedback.pending, state.feedback.is_correct, state.regrade], [false, true, null]);
  let poll = apply(initialPlay(), [question('p1', 0, 'poll')]);
  poll = apply(poll, [
    { type: 'cooldown_started', cooldown_seconds: 0, your_answer: { is_correct: null, points_earned: 0 } },
  ]);
  assert.equal(poll.feedback.pending, false);
});

test('each answer in its words, and when an answer is ready to send', () => {
  const mc = question('q', 0).question;
  assert.equal(answerWords(mc, 1), 'Nucleus');
  assert.equal(answerWords({ type: 'true_false' }, false), 'False');
  assert.equal(answerWords({ type: 'short_answer' }, 'CO2'), 'CO2');
  assert.equal(rightWords({ type: 'short_answer' }, ['carbon dioxide', 'CO2']), 'carbon dioxide');
  assert.equal(ready(mc, 0), true, 'the first answer, index 0, is a choice');
  assert.equal(ready(mc, null), false);
  assert.equal(ready({ type: 'short_answer' }, '   '), false);
  assert.equal(ready({ type: 'true_false' }, false), true);
});

test('the words: plain and kind, and no word the screens never say', () => {
  assert.equal(PLAY.withTeacher('Ms Patel'), 'with Ms Patel');
  assert.equal(PLAY.notOnList('S-777'), "We couldn't find S-777 on the class list.");
  assert.equal(PLAY.yourPoints(26, 40), 'You got 26 of 40 points');
  assert.equal(PLAY.handedIn('Ms Patel', 'Fri 14 Nov, 11:52'), 'Handed in to Ms Patel · Fri 14 Nov, 11:52');
  assert.equal(PLAY.questionOf(3, 12), 'Question 3 of 12');
  const said = Object.values(PLAY).map((word) => (typeof word === 'function' ? word('x', 'y') : word));
  assert.deepEqual(neverShownIn(said.join(' ')), []);
});

test('the points line by type and level (C10): never "if right", nothing when the score is off', () => {
  const typed = (level, points = 10) => ({ type: 'short_answer', points, match_level: level });
  assert.equal(pointsLine({ type: 'multiple_choice', points: 10 }), '10 points');
  assert.equal(pointsLine({ type: 'true_false', points: 5 }), '5 points');
  assert.equal(pointsLine(typed('exact')), '10 points', 'Exact gives full points or none');
  assert.equal(pointsLine(typed('close')), 'Up to 10 points');
  assert.equal(pointsLine(typed('meaning')), 'Up to 10 points');
  assert.equal(pointsLine(typed(undefined)), 'Up to 10 points', 'a level not sent is Same meaning (C1)');
  assert.equal(pointsLine(typed(null)), 'Up to 10 points');
  assert.equal(pointsLine({ type: 'poll', points: 0 }), 'A poll · no points');
  assert.equal(pointsLine(typed('close'), { scoreShown: false }), null, 'the score off: no points words');
  assert.equal(pointsLine({ type: 'multiple_choice', points: null }), null, 'missing points are never 0');
});

test('the hint follows the question type', () => {
  assert.equal(sendHint({ type: 'short_answer' }), 'Type your answer, then Send.');
  assert.equal(sendHint({ type: 'multiple_choice' }), 'Tap an answer, then Send.');
  assert.equal(sendHint({ type: 'true_false' }), 'Tap an answer, then Send.');
});

test('a closed question by level: checking, then points at Close; straight answers at Exact; sent when hidden', () => {
  const close = { type: 'short_answer', points: 10, match_level: 'close' };
  const exact = { type: 'short_answer', points: 10, match_level: 'exact' };
  const mc = question('q', 0).question;
  assert.deepEqual(closedOutcome(close, { is_correct: null, pending: true }, true), {
    tone: 'waiting',
    title: 'Checking your answer…',
  });
  assert.deepEqual(closedOutcome(close, { is_correct: true, points_earned: 9 }, true), {
    tone: 'right',
    title: 'Right · 9 of 10 points',
  });
  assert.deepEqual(closedOutcome(close, { is_correct: false, points_earned: 3, correct_answer: ['Iran'] }, true), {
    tone: 'wrong',
    title: 'Not quite · 3 of 10 points.',
    line: 'Accepted: Iran',
  });
  assert.deepEqual(closedOutcome(exact, { is_correct: false, points_earned: 0, correct_answer: ['Iran'] }, true), {
    tone: 'wrong',
    title: 'Not quite.',
    line: 'Accepted: Iran',
  });
  assert.equal(closedOutcome(exact, { is_correct: true, points_earned: 10 }, true).title, 'Right!');
  assert.equal(closedOutcome(mc, { is_correct: true, points_earned: 10 }, true).line, '+10 points');
  assert.equal(closedOutcome(mc, null, true).title, 'Answer sent ✓', 'right or wrong hidden: only sent');
  assert.equal(closedOutcome(mc, null, false).title, PLAY.noAnswerSent);
  assert.equal(closedOutcome(mc, { did_not_answer: true }, false).title, PLAY.noAnswerSent);
  assert.equal(closedOutcome({ type: 'poll' }, { is_correct: null }, true).title, 'Answer sent ✓');
});

test('the end: counts, places above 0 only (1, 1, 3), and blanks as no answer', () => {
  const reviews = [
    { question_type: 'multiple_choice', student_answer: ['A'], is_correct: true, points_earned: 10, max_points: 10 },
    { question_type: 'multiple_choice', student_answer: ['B'], is_correct: true, points_earned: 10, max_points: 10 },
    { question_type: 'short_answer', student_answer: ['persia'], is_correct: true, points_earned: 7, max_points: 10 },
    { question_type: 'short_answer', student_answer: [], is_correct: null, points_earned: 0, max_points: 10 },
    { question_type: 'poll', student_answer: ['Yes'], is_correct: null, points_earned: 0, max_points: 0 },
    { question_type: 'short_answer', student_answer: {}, is_correct: false, points_earned: null, max_points: null },
  ];
  const kinds = answerKinds(reviews);
  assert.deepEqual(kinds, { right: 2, partly: 1, wrong: 0, blank: 2 });
  assert.equal(PLAY.answerKinds(kinds), '2 right · 1 partly right · 2 no answer');
  const waiting = [{ question_type: 'short_answer', student_answer: ['x'], marking_status: 'pending' }];
  assert.deepEqual(answerKinds(waiting), { right: 0, partly: 0, wrong: 0, blank: 0 });
  const board = [
    { rank: 1, participant_id: 'a', score: 20 },
    { rank: 1, participant_id: 'b', score: 20 },
    { rank: 3, participant_id: 'c', score: 10 },
    { rank: 4, participant_id: 'd', score: 0 },
  ];
  assert.deepEqual(
    placed(board).map((entry) => entry.rank),
    [1, 1, 3],
    'shared places stay, and 0 points gets no place'
  );
  assert.equal(PLAY.youPoints(0), 'You: 0 points');
  assert.deepEqual(givenAnswers({}), [], "homework's blank");
  assert.deepEqual(givenAnswers([]), [], "live's blank");
  assert.deepEqual(givenAnswers(null), []);
  assert.deepEqual(givenAnswers({ text: 'CO2' }), ['CO2']);
  assert.deepEqual(givenAnswers([0]), [0], 'the first option is an answer');
  assert.deepEqual(givenAnswers([false]), [false], 'False is an answer');
});

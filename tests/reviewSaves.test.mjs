// The review pages' save model (Phase 1.47 S4.1; SOT-6, QA N-1; design.md §3.9): a card saves only a real change with
// a valid mark, after quiet or on leaving its fields, one save at a time, with Undo, conflicts and fresher reads.
// Area: platform
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCardSaver, markNumber, sameValues, validMark } from '../src/components/review/cardSaver.js';

// Timers the test runs by hand.
function clock() {
  let id = 0;
  const due = new Map();
  return {
    setTimeout(fn) {
      id += 1;
      due.set(id, fn);
      return id;
    },
    clearTimeout(timer) {
      due.delete(timer);
    },
    tick() {
      const fns = [...due.values()];
      due.clear();
      for (const fn of fns) fn();
    },
    pending: () => due.size,
  };
}
const settle = () => new Promise((resolve) => setImmediate(resolve));

// The two pages' records: a quiz question with its answer (C3), and an assessment question (its review read).
const quiz = { question_id: 'q1', points: 10, answer: { points: 3, comment: 'Close.', revision: 'r1' } };
const quizValues = (q) => ({
  mark: q.answer.points == null ? '' : String(q.answer.points),
  comment: q.answer.comment ?? '',
});
const assessment = { questionId: '1.1', maxScore: 4, grade: null, feedback: '', revisionHash: 'h1' };
const assessmentValues = (q) => ({ mark: q.grade == null ? '' : String(q.grade), comment: q.feedback ?? '' });

// A saver over a quiz record whose save bumps the revision; calls records what each save was sent.
function quizSaver(options = {}) {
  const timers = clock();
  const calls = [];
  const saved = [];
  let fail = options.fail ?? null;
  const saver = createCardSaver({
    record: quiz,
    valuesOf: quizValues,
    isValid: (values, record) => validMark(values.mark, record.points, { whole: true }),
    save: async (values, record, extra) => {
      calls.push({ values, revision: record.answer.revision, undo: extra.undo ?? null });
      if (fail) throw Object.assign(new Error('refused'), { status: fail });
      await settle();
      const next = Number(record.answer.revision.slice(1)) + 1;
      return { ...record, answer: { points: Number(values.mark), comment: values.comment, revision: `r${next}` } };
    },
    onSaved: (event) => saved.push(event),
    timers,
    now: options.now ?? (() => 1000),
  });
  return { saver, timers, calls, saved, failWith: (status) => (fail = status) };
}

test('marks: a number from 0 to the maximum, whole where asked; an empty box is never 0 (N-1)', () => {
  assert.equal(markNumber(''), null);
  assert.equal(markNumber('  '), null);
  assert.equal(markNumber('0'), 0);
  assert.equal(validMark('', 10), false);
  assert.equal(validMark('0', 10), true);
  assert.equal(validMark('10', 10), true);
  assert.equal(validMark('11', 10), false);
  assert.equal(validMark('-1', 10), false);
  assert.equal(validMark('1e1', 10), false);
  assert.equal(validMark('seven', 10), false);
  assert.equal(validMark('2.5', 4), true);
  assert.equal(validMark('2.5', 4, { whole: true }), false);
  assert.ok(sameValues({ mark: '7', comment: 'Good' }, { mark: '07', comment: 'Good ' }));
  assert.ok(!sameValues({ mark: '7', comment: 'Good' }, { mark: '7', comment: 'Good.' }));
});

test('leaving a card with no change saves nothing, so a stray click never saves', async () => {
  const { saver, timers, calls } = quizSaver();
  saver.leave();
  saver.edit({ comment: 'Close.' }); // typed the same words again
  saver.leave();
  timers.tick();
  await settle();
  assert.equal(calls.length, 0);
  assert.equal(saver.snapshot().status, 'idle');
});

test('an empty or out-of-range mark shows "Add a mark to save" and sends nothing, even after quiet (N-1)', async () => {
  const timers = clock();
  const calls = [];
  const saver = createCardSaver({
    record: assessment, // a held answer: no mark yet
    valuesOf: assessmentValues,
    isValid: (values, record) => validMark(values.mark, record.maxScore),
    save: async (values) => calls.push(values),
    timers,
  });
  saver.edit({ comment: 'Check your units.' }); // only a comment
  assert.equal(saver.snapshot().status, 'invalid');
  assert.equal(timers.pending(), 0);
  saver.leave();
  timers.tick();
  await settle();
  saver.edit({ mark: '5' }); // over the maximum of 4
  saver.leave();
  await settle();
  assert.equal(calls.length, 0);
  assert.equal(saver.snapshot().status, 'invalid');
  assert.ok(saver.snapshot().unsaved, 'the leave guard counts it');
});

test('a real change saves once after quiet, then shows Saved, and the toast can offer Undo', async () => {
  const { saver, timers, calls, saved } = quizSaver();
  saver.edit({ mark: '7' });
  assert.equal(saver.snapshot().status, 'waiting');
  saver.edit({ mark: '8' });
  assert.equal(calls.length, 0, 'nothing is sent while the teacher is typing');
  timers.tick();
  assert.equal(saver.snapshot().status, 'saving');
  await settle();
  await settle();
  assert.deepEqual(calls, [{ values: { mark: '8', comment: 'Close.' }, revision: 'r1', undo: null }]);
  assert.equal(saver.snapshot().status, 'saved');
  assert.equal(saver.snapshot().record.answer.revision, 'r2');
  assert.equal(saved.length, 1);
  assert.equal(saved[0].before, quiz);
  assert.equal(saved[0].undo, false);
});

test('leaving the fields saves at once; changes made during a save follow it with its new revision', async () => {
  const { saver, timers, calls } = quizSaver();
  saver.edit({ mark: '6' });
  saver.leave();
  assert.equal(timers.pending(), 0);
  saver.edit({ comment: 'Nearly.' }); // typed while the first save is in flight
  saver.leave();
  await settle();
  await settle();
  await settle();
  await settle();
  assert.deepEqual(
    calls.map((call) => [call.values.mark, call.values.comment, call.revision]),
    [
      ['6', 'Close.', 'r1'],
      ['6', 'Nearly.', 'r2'],
    ],
    'each save sends the revision the last one returned, so a card never trips its own save'
  );
  assert.equal(saver.snapshot().status, 'saved');
  assert.equal(saver.snapshot().unsaved, false);
});

test('Undo sends the earlier values with the record from before the change', async () => {
  const { saver, calls, saved } = quizSaver();
  saver.edit({ mark: '9' });
  saver.leave();
  await settle();
  await settle();
  saver.undo(saved[0].before);
  await settle();
  await settle();
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1].values, { mark: '3', comment: 'Close.' });
  assert.equal(calls[1].undo, quiz);
  assert.equal(saved[1].undo, true);
  assert.deepEqual(saver.snapshot().values, { mark: '3', comment: 'Close.' });
});

test('a 409 shows "Changed somewhere else" and stops saving until the question is reloaded', async () => {
  const { saver, timers, calls, failWith } = quizSaver({ fail: 409 });
  saver.edit({ mark: '4' });
  saver.leave();
  await settle();
  assert.equal(saver.snapshot().status, 'conflict');
  saver.edit({ mark: '5' });
  saver.leave();
  timers.tick();
  await settle();
  assert.equal(calls.length, 1);
  failWith(null);
  saver.reset({ ...quiz, answer: { ...quiz.answer, points: 6, revision: 'r7' } });
  assert.equal(saver.snapshot().status, 'idle');
  assert.deepEqual(saver.snapshot().values, { mark: '6', comment: 'Close.' });
});

test('a failed save says so; Try again saves, and typing again starts over', async () => {
  const { saver, calls, failWith } = quizSaver({ fail: 500 });
  saver.edit({ mark: '2' });
  saver.leave();
  await settle();
  assert.equal(saver.snapshot().status, 'failed');
  failWith(null);
  saver.retry();
  await settle();
  await settle();
  assert.equal(calls.length, 2);
  assert.equal(saver.snapshot().status, 'saved');
});

test("a fresher read fills untouched fields; a read asked for before the last save can't undo it", async () => {
  let time = 1000;
  const { saver } = quizSaver({ now: () => time });
  // The AI's comment arrives while the teacher is changing the mark: their mark stays, the comment fills in.
  saver.edit({ mark: '5' });
  saver.refresh({ ...quiz, answer: { ...quiz.answer, comment: 'From the AI.', revision: 'r2' } }, 900);
  assert.deepEqual(saver.snapshot().values, { mark: '5', comment: 'From the AI.' });
  assert.equal(saver.snapshot().record.answer.revision, 'r2');
  time = 2000; // the save lands at 2000
  saver.leave();
  await settle();
  await settle();
  saver.refresh({ ...quiz, answer: { points: 3, comment: 'Old.', revision: 'r2' } }, 1500);
  assert.deepEqual(saver.snapshot().values, { mark: '5', comment: 'From the AI.' }, 'an older read is ignored');
});

// The assessment review page's rules on the shared save model (Phase 1.47 S4.3; SOT-6, QA N-1): a held answer saves
// nothing until it has a mark, Undo sends the earlier values, the map's squares, the total, and refused saves.
// Area: assessments
import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({
  stdin: {
    contents: `export * from './src/areas/assessments/reviewRules.js';
export { createCardSaver } from './src/components/review/cardSaver.js';`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  logLevel: 'error',
});
const r = await import(`data:text/javascript,${encodeURIComponent(bundle.outputFiles[0].text)}`);

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

const held = {
  questionId: '1.1',
  maxScore: 4,
  grade: null,
  feedback: '',
  status: 'PENDING_REVIEW',
  revisionHash: 'h1',
};
const marked = { questionId: '2', maxScore: 4, grade: 2, feedback: 'AI said', status: 'AI_GRADED', revisionHash: 'h2' };

// A card saver as the page builds it: its save sends saveBody and returns afterSave, recording what each save sent.
function card(record) {
  const timers = clock();
  const sent = [];
  let revision = 0;
  const saver = r.createCardSaver({
    record,
    valuesOf: r.valuesOf,
    isValid: r.isValid,
    save: async (values, current) => {
      const body = r.saveBody(values, current);
      sent.push(body);
      revision += 1;
      return r.afterSave(current, body, { resultRevision: `${current.revisionHash}-${revision}` });
    },
    timers,
  });
  return { saver, timers, sent };
}

test('N-1: on a held answer, a comment alone saves nothing, even on leaving the field', async () => {
  const { saver, timers, sent } = card(held);
  saver.edit({ comment: 'Shows good working.' });
  assert.equal(timers.pending(), 0);
  saver.leave();
  await settle();
  assert.deepEqual(sent, []);
  assert.equal(saver.snapshot().status, 'invalid'); // the card says "Add a mark to save"
  assert.equal(saver.snapshot().unsaved, true); // and the leave guard asks before the page goes
  saver.edit({ mark: '3' });
  timers.tick();
  await settle();
  assert.deepEqual(sent, [{ grade: 3, feedback: 'Shows good working.', expectedRevision: 'h1' }]);
  assert.equal(saver.snapshot().status, 'saved');
  assert.equal(saver.snapshot().record.status, 'TEACHER_GRADED');
});

test('a mark outside 0 to the maximum is never sent; decimals within it are', async () => {
  const { saver, timers, sent } = card(marked);
  saver.edit({ mark: '5' });
  assert.equal(timers.pending(), 0);
  assert.equal(saver.snapshot().status, 'invalid');
  saver.edit({ mark: '' });
  assert.equal(saver.snapshot().status, 'invalid');
  saver.edit({ mark: '2.5' });
  timers.tick();
  await settle();
  assert.deepEqual(sent, [{ grade: 2.5, feedback: 'AI said', expectedRevision: 'h2' }]);
});

test('Undo sends the earlier mark and feedback again, and the answer stays Teacher graded', async () => {
  const { saver, timers, sent } = card(marked);
  saver.edit({ mark: '4', comment: 'Full marks.' });
  timers.tick();
  await settle();
  assert.equal(r.canUndo(marked), true);
  saver.undo(marked);
  await settle();
  assert.deepEqual(sent[1], { grade: 2, feedback: 'AI said', expectedRevision: 'h2-1' });
  assert.deepEqual(saver.snapshot().values, { mark: '2', comment: 'AI said' });
  assert.equal(saver.snapshot().record.status, 'TEACHER_GRADED');
  // A held answer's first mark has no earlier mark to send, so its toast offers no Undo.
  assert.equal(r.canUndo(held), false);
});

test('held answers open with an empty mark, and a saved grade shows as typed', () => {
  assert.deepEqual(r.valuesOf(held), { mark: '', comment: '' });
  assert.deepEqual(r.valuesOf({ ...marked, grade: 7.5, feedback: null }), { mark: '7.5', comment: '' });
});

test('the map: full, part and no marks, held answers pending review, and a dot once the teacher marks', () => {
  assert.deepEqual(r.mapItem(held, 1), { id: '1.1', label: '1', state: 'waiting', changed: false, needsLook: true });
  assert.equal(r.mapItem({ ...held, printedLabel: '01.7' }, 1).label, '01.7');
  assert.equal(r.mapItem({ ...marked, grade: 4 }, 2).state, 'right');
  assert.equal(r.mapItem({ ...marked, grade: 0 }, 2).state, 'wrong');
  assert.equal(r.mapItem(marked, 2).state, 'part');
  assert.equal(r.mapItem({ ...marked, grade: null }, 2).state, 'none');
  const teacher = r.mapItem({ ...marked, status: 'TEACHER_GRADED' }, 2);
  assert.equal(teacher.changed, true);
  assert.equal(teacher.needsLook, false);
  assert.equal(r.LEGEND.waiting, 'Pending review'); // the held answer's chip says the same
});

test('the total is "—" until every question has a mark; the maximum always shows', () => {
  assert.deepEqual(r.totals([held, marked]), { total: null, maximum: 8 });
  assert.deepEqual(r.totals([{ ...held, grade: 1.5 }, marked]), { total: 3.5, maximum: 8 });
});

test('a refused save: the stale revision is "Changed somewhere else"; the server\'s own sentence says why', () => {
  const stale = r.refusal(new Error('This result changed after you opened it. Keep your draft and reopen the review.'));
  assert.equal(stale.status, 409);
  const plain = r.refusal(new Error('Could not save changes.'));
  assert.equal(plain.status, null);
  assert.equal(plain.reason, null);
  assert.equal(r.refusal(new Error('The mark is above the maximum.')).reason, 'The mark is above the maximum.');
});

test('card titles: "Question 4", the paper\'s label, and a label that already says Q', () => {
  assert.equal(r.titleOf({}, 4), 'Question 4');
  assert.equal(r.titleOf({ printedLabel: '1.1' }, 4), 'Question 1.1');
  assert.equal(r.titleOf({ printedLabel: 'Q3b' }, 4), 'Q3b');
});

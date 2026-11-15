// Where a quiz opens (Phase 1.46 S3.4; SOT-16; design.md §3.1): an open run's live or homework page, the editor for a
// draft or a quiz never run, else its one results page, so Home and the quiz list open the same page.
// Area: quizzes
import test from 'node:test';
import assert from 'node:assert/strict';
import { editLink, quizLink, resultsLink, runLink } from '../src/areas/quizzes/links.js';

const item = (state, extra = {}) => ({ id: 'q-1', state, run_count: 0, open_run: null, ...extra });

test('each state opens its page', () => {
  assert.equal(quizLink(item('draft')), '/quizzes/q-1/edit');
  assert.equal(quizLink(item('ready')), '/quizzes/q-1/edit');
  assert.equal(
    quizLink(item('live', { run_count: 2, open_run: { id: 'r-9', kind: 'live' } })),
    '/quizzes/sessions/r-9/host'
  );
  assert.equal(
    quizLink(item('homework', { run_count: 1, open_run: { id: 'h-3', kind: 'homework', deadline: null } })),
    '/quizzes/sp-sessions/h-3/host'
  );
  assert.equal(quizLink(item('finished', { run_count: 3 })), '/quizzes/q-1/results');
  // An archived quiz that has run opens its results; one that never ran opens the editor.
  assert.equal(quizLink(item('archived', { run_count: 1 })), '/quizzes/q-1/results');
  assert.equal(quizLink(item('archived')), '/quizzes/q-1/edit');
  // A draft opens the editor even after a run was started from it.
  assert.equal(quizLink(item('draft', { run_count: 1 })), '/quizzes/q-1/edit');
});

test('the links themselves', () => {
  assert.equal(editLink('a b'), '/quizzes/a%20b/edit');
  assert.equal(resultsLink('q-1'), '/quizzes/q-1/results');
  assert.equal(resultsLink('q-1', 'r 2'), '/quizzes/q-1/results?run=r%202');
  assert.equal(runLink({ id: 'r-1', kind: 'live' }), '/quizzes/sessions/r-1/host');
  assert.equal(runLink({ id: 'h-1', kind: 'homework' }), '/quizzes/sp-sessions/h-1/host');
});

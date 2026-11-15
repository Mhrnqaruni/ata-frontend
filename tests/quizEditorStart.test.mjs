// The quiz editor's Start and Send (Phase 1.46 S5.3; SOT-6, SOT-9, SOT-10; QA P2-2, P3-1, P3-12): only a real change of
// classes is sent, the pace only when it differs, and homework's start is tried twice, then left for Try again.
// Area: quizzes
import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({
  stdin: {
    contents: `export * from './src/areas/quizzes/editor/launch.js';
export { joinNames } from './src/areas/quizzes/editor/words.js';`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  logLevel: 'error',
});
const start = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

// A stand-in for the editor's api.js that records its calls and fails the starts it's told to.
function fakeApi({ startFailures = 0, paceFails = false } = {}) {
  const calls = [];
  let failures = startFailures;
  return {
    calls,
    createLiveRun: async (quizId, audience) => (calls.push(['live', quizId, audience]), { id: 'run-1' }),
    setPace: async (runId, movesOn, cooldown) => {
      calls.push(['pace', runId, movesOn, cooldown]);
      if (paceFails) throw new Error('no pace');
    },
    createHomework: async (body) => (calls.push(['homework', body.quiz_id]), { id: 'hw-1' }),
    startHomework: async (runId) => {
      calls.push(['start', runId]);
      if (failures > 0) {
        failures -= 1;
        throw new Error('Could not start the self-paced session.');
      }
    },
  };
}

test('only a real change of classes is sent at launch; an empty choice keeps the quiz’s own', () => {
  const own = { class_ids: ['c8', 'c9'], tag_ids: [], mode: 'union' };
  assert.equal(start.launchAudience({ class_ids: ['c9', 'c8'], tag_ids: [], mode: 'union' }, own), null);
  assert.deepEqual(start.launchAudience({ class_ids: ['c10'], tag_ids: [] }, own), { class_ids: ['c10'], tag_ids: [] });
  assert.equal(start.launchAudience({ class_ids: [], tag_ids: [] }, own), null);
  assert.deepEqual(start.launchAudience({ class_ids: ['c8'], tag_ids: [], mode: 'union' }, null), {
    class_ids: ['c8'],
    tag_ids: [],
    mode: 'union',
  });
});

test('a live run sets the pace only when it differs, with the quiz’s cooldown, and a failed pace still starts', async () => {
  const api = fakeApi();
  await start.startLive(api, { quizId: 'q', audience: null, movesOn: false, settings: {} });
  assert.deepEqual(api.calls, [['live', 'q', null]]);
  const moving = fakeApi({ paceFails: true });
  const run = await start.startLive(moving, {
    quizId: 'q',
    audience: { class_ids: ['c9'] },
    movesOn: true,
    settings: { cooldown_seconds: 15 },
  });
  assert.equal(run.id, 'run-1');
  assert.deepEqual(moving.calls[1], ['pace', 'run-1', true, 15]);
  assert.equal(start.quizMovesOn({ auto_advance_enabled: true }), true);
  assert.equal(start.quizMovesOn({}), false); // "I'll press Next" unless the quiz saved true (SOT-9)
});

test('Send makes the run and starts it; a failed start is tried once more, then Try again starts the same run', async () => {
  const once = fakeApi({ startFailures: 1 });
  assert.deepEqual(await start.sendHomework(once, { quiz_id: 'q' }), { id: 'hw-1', started: true });
  assert.deepEqual(
    once.calls.map((call) => call[0]),
    ['homework', 'start', 'start']
  );
  const twice = fakeApi({ startFailures: 2 });
  const failed = await start.sendHomework(twice, { quiz_id: 'q' });
  assert.equal(failed.started, false);
  assert.equal(failed.id, 'hw-1');
  const again = await start.sendHomework(twice, { quiz_id: 'q' }, failed.id);
  assert.deepEqual(again, { id: 'hw-1', started: true });
  assert.equal(twice.calls.filter((call) => call[0] === 'homework').length, 1); // no second run made
});

test('the homework run takes the two homework tiles and the due date; the due date starts tomorrow at 17:00', () => {
  const due = start.tomorrowAtFive(new Date(2026, 10, 14, 9, 30));
  assert.equal(due.getDate(), 15);
  assert.equal(due.getHours(), 17);
  const body = start.homeworkBody({
    quizId: 'q',
    settings: { show_final_score_to_students: false, show_answer_feedback: false },
    due,
    audience: null,
  });
  assert.equal(body.show_final_score_to_students, false);
  assert.equal(body.show_answer_feedback, false);
  assert.equal(body.deadline, due.toISOString());
  assert.equal('audience' in body, false);
  assert.equal(start.homeworkBody({ quizId: 'q', settings: {}, due }).show_answer_feedback, true);
  assert.equal(start.joinNames(['8B', '9C', '10A', '11B']), '8B, 9C and 2 more');
});

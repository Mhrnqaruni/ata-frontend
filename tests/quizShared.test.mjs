// The quiz area's shared words, join helpers, query keys and join lookup (Phase 1.46 S3.2; SOT-2, SOT-8, SOT-14,
// SOT-16; design.md §3.1, §3.9, §5): what every quiz lane imports, pinned so the lanes can build on it.
// Area: quizzes
import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

// The shared files as written, with stand-ins for the API client (each GET answers from `answers`, and apiError is
// the client's) and the query cache (session 7).
const standIns = {
  api: `export const answers = {}; export const calls = [];
export default { get: async (url, config) => { calls.push([url, config]); const a = answers[url]; if (a instanceof Error) throw a; return { data: a }; } };
export const apiError = (error, fallback) => {
  const detail = error?.response?.data?.detail;
  return new Error(typeof detail === 'string' && detail ? detail : fallback);
};`,
  queryCache: 'export const sessionGeneration = () => 7;',
};
const bundle = await build({
  stdin: {
    contents: `export * from './src/areas/quizzes/words.js';
export * from './src/areas/quizzes/shared/joining.js';
export { quizKeys, libraryParams, libraryQuery } from './src/areas/quizzes/queries.js';
export { lookupJoin } from './src/areas/quizzes/api/join.js';
export { answers, calls } from 'api';`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  logLevel: 'error',
  plugins: [
    {
      name: 'stand-ins',
      setup(build) {
        build.onResolve({ filter: /(^|\/)(api|queryCache)$/ }, (args) => ({
          path: args.path.split('/').pop(),
          namespace: 'stand-in',
        }));
        build.onLoad({ filter: /.*/, namespace: 'stand-in' }, (args) => ({ contents: standIns[args.path] }));
      },
    },
  ],
});
const shared = await import(`data:text/javascript,${encodeURIComponent(bundle.outputFiles[0].text)}`);
const { STATES, STATE_ORDER, WORDS, stateLabel, stateActions, classList, neverShownIn, NEVER_ON_SCREEN } = shared;
const ORIGIN = 'https://app.mysmartteach.com';
const NOW = new Date(2026, 10, 14, 16, 30);

test("the six states are the library's, each with a word, a tone and a tooltip; only Live now pulses", () => {
  assert.deepEqual(Object.keys(STATES).sort(), ['archived', 'draft', 'finished', 'homework', 'live', 'ready']);
  assert.deepEqual([...STATE_ORDER].sort(), Object.keys(STATES).sort());
  for (const state of Object.values(STATES)) {
    assert.ok(state.label && state.tip && ['neutral', 'accent', 'ok', 'muted'].includes(state.tone));
  }
  assert.deepEqual(
    Object.entries(STATES).flatMap(([name, state]) => (state.pulse ? [name] : [])),
    ['live']
  );
  assert.equal(stateLabel('live'), 'Live now');
  assert.equal(
    stateLabel('homework', { deadline: new Date(2026, 10, 21, 17, 0), now: NOW }),
    'Homework open · due Sat 21 Nov'
  );
  assert.equal(stateLabel('homework'), 'Homework open · no due date');
  assert.equal(stateLabel('unknown'), '');
});

test("each state's row button (Phase 1.47 R12; design.md §3.10): only Open, on live and open homework rows", () => {
  const labels = (state) => stateActions(state).map((b) => `${b.action}:${b.label}/${b.variant}`);
  assert.deepEqual(labels('live'), ['open:Open/contained']);
  assert.deepEqual(labels('homework'), ['open:Open/contained']);
  for (const state of ['draft', 'ready', 'finished', 'archived']) assert.deepEqual(labels(state), [], state);
});

test('classes on one line: "8B, 9C +1", or "No class yet"', () => {
  const classes = (...names) => names.map((name, i) => ({ id: `c${i}`, name }));
  assert.equal(classList(classes('8B', '9C', '10A')), '8B, 9C +1');
  assert.equal(classList(classes('8B', '9C')), '8B, 9C');
  assert.equal(classList(classes('8B', '9C', '10A', '11B'), { max: 3 }), '8B, 9C, 10A +1');
  assert.equal(classList([]), 'No class yet');
  assert.equal(classList(undefined), 'No class yet');
});

test('no shared word is one that never shows on a quiz page', () => {
  const words = [
    ...Object.values(WORDS),
    ...Object.values(STATES).flatMap((state) => [state.label, state.tip]),
    ...STATE_ORDER.flatMap((state) => stateActions(state, 'live').concat(stateActions(state, 'self_paced'))).map(
      (button) => button.label
    ),
  ];
  assert.deepEqual(neverShownIn(words.join(' | ')), []);
  assert.deepEqual(neverShownIn('Host quiz · Published · 3 sessions · Outsider Students'), [
    'host',
    'publish',
    'session',
    'outsider',
  ]);
  assert.deepEqual(neverShownIn('a ghost hostname'), []);
  assert.equal(NEVER_ON_SCREEN.length, 7);
});

test('joining: the code rule, the short link the QR holds, the address to type, and the pupil page per run', () => {
  assert.equal(shared.cleanCode(' ncf l38 '), 'NCFL38');
  assert.equal(shared.joinLink('ncfl38', ORIGIN), 'https://app.mysmartteach.com/join/NCFL38');
  assert.equal(shared.joinAddress(ORIGIN), 'app.mysmartteach.com/join');
  assert.equal(shared.joinAddress('http://localhost:5199'), 'localhost:5199/join');
  assert.equal(shared.joinPath('live', ' ncfl38'), '/quiz/join/NCFL38');
  assert.equal(shared.joinPath('homework', 'xyz789'), '/quiz/sp/join/XYZ789');
  assert.equal(shared.qrFileName('ncfl38'), 'join-NCFL38.png');
});

test("Share's invite (design.md §3.9), and homework's due date on a line of its own", () => {
  assert.equal(
    shared.inviteText({ title: 'Year 9 Cells', code: 'NCFL38', origin: ORIGIN }),
    'Join my quiz "Year 9 Cells": go to app.mysmartteach.com/join and type NCFL38, or open https://app.mysmartteach.com/join/NCFL38'
  );
  assert.equal(
    shared.inviteText({
      title: 'Fractions',
      code: 'xyz789',
      due: new Date(2026, 10, 20, 17, 0),
      origin: ORIGIN,
      now: NOW,
    }),
    'Join my quiz "Fractions": go to app.mysmartteach.com/join and type XYZ789, or open https://app.mysmartteach.com/join/XYZ789\nDue Fri 20 Nov, 17:00.'
  );
});

test("the shared keys sit in the app's teacher families, so a quiz change refreshes them", () => {
  const { quizKeys, libraryParams } = shared;
  assert.deepEqual(quizKeys.library('t1'), ['teacher', 7, 't1', 'quizzes', 'library']);
  assert.deepEqual(quizKeys.library('t1', { q: 'photo', state: ['ready', 'draft'], tag_id: [], mode: '' }), [
    'teacher',
    7,
    't1',
    'quizzes',
    'library',
    { q: 'photo', state: ['draft', 'ready'] },
  ]);
  // The same filters in another order make the same key.
  assert.deepEqual(
    libraryParams({ class_id: ['c2', 'c1'], sort: 'name', offset: 0 }),
    libraryParams({ offset: 0, sort: 'name', class_id: ['c1', 'c2'] })
  );
  assert.deepEqual(quizKeys.tags('t1'), ['teacher', 7, 't1', 'quizzes', 'tags']);
  assert.deepEqual(quizKeys.quiz('t1', 42), ['teacher', 7, 't1', 'quizzes', 'quiz', '42']);
  assert.deepEqual(quizKeys.runs('t1', 'q1'), ['teacher', 7, 't1', 'quizSession', 'runs', 'q1']);
  assert.deepEqual(quizKeys.summary('t1', 'q1', 'r1'), [
    'teacher',
    7,
    't1',
    'quizSession',
    'summary',
    'q1',
    'r1',
    'all',
  ]);
  assert.deepEqual(quizKeys.summary('t1', 'q1', 'r1', 'c9')[7], 'c9');
  assert.deepEqual(quizKeys.join(' ncfl38 '), ['quizJoin', 'NCFL38']);
});

test('the join lookup asks for the clean code, and each refusal says what to do', async () => {
  const { lookupJoin, answers } = shared;
  answers['/api/quiz-join/NCFL38'] = { kind: 'live', quiz_title: 'Year 9 Cells', teacher_name: 'Ms Patel' };
  assert.deepEqual(await lookupJoin(' ncfl38 '), {
    kind: 'live',
    quiz_title: 'Year 9 Cells',
    teacher_name: 'Ms Patel',
  });
  const refused = (status, detail) => Object.assign(new Error('refused'), { response: { status, data: { detail } } });
  const cases = [
    [refused(404, 'This quiz has finished.'), 'This quiz has finished.', 404],
    [
      refused(404, 'No quiz has this code. Check it with your teacher.'),
      'No quiz has this code. Check it with your teacher.',
      404,
    ],
    [refused(429, 'Rate limit exceeded: 60 per 1 minute'), WORDS.tooManyTries, 429],
    [new Error('Network Error'), WORDS.codeNotChecked, null],
  ];
  for (const [error, message, status] of cases) {
    answers['/api/quiz-join/OLD123'] = error;
    await assert.rejects(lookupJoin('old123'), (failure) => failure.message === message && failure.status === status);
  }
});

test("the library's one read: its key, its address, the tidy filters, and repeated filters as FastAPI reads them", async () => {
  const { libraryQuery, answers, calls } = shared;
  answers['/api/quiz-library'] = { items: [], total: 0, counts: {}, live_now: [] };
  const query = libraryQuery('t1', { state: ['ready', 'draft'], sort: 'last_used', limit: 4, q: '' });
  assert.deepEqual(query.queryKey, [
    'teacher',
    7,
    't1',
    'quizzes',
    'library',
    { state: ['draft', 'ready'], sort: 'last_used', limit: 4 },
  ]);
  const signal = new AbortController().signal;
  assert.deepEqual(await query.queryFn({ signal }), { items: [], total: 0, counts: {}, live_now: [] });
  const [url, config] = calls.at(-1);
  assert.equal(url, '/api/quiz-library');
  assert.deepEqual(config.params, { state: ['draft', 'ready'], sort: 'last_used', limit: 4 });
  assert.deepEqual(config.paramsSerializer, { indexes: null });
  assert.equal(config.signal, signal);
});

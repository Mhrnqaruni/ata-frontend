// Parent mode's "new" marks (Phase 1.37 S4.1; design §3.12; SOT C-24): the browser's store, C-24's rule, and the
// hook, which reads the notebook home under its own key with no polling of its own (C-10).
// Area: family
import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

// A stand-in localStorage. `storage` is 'ok'; 'blocked', where every use throws, as when a browser refuses storage;
// or 'full', where reads work and writes throw.
const stored = new Map();
let storage = 'ok';
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  get() {
    if (storage === 'blocked') throw new DOMException('The operation is insecure.', 'SecurityError');
    return {
      getItem: (key) => stored.get(key) ?? null,
      setItem: (key, value) => {
        if (storage === 'full') throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
        stored.set(key, String(value));
      },
    };
  },
});

// The hook as written, with stand-ins for React, React Query, the signed-in parent, the session counter and the API
// client, as in homePerformance.test.mjs: useQuery records the options it's given and answers with `answer`, and an
// effect runs at once, so the next call sees what it wrote. The store is the real one, shared with the hook.
const standIns = {
  react:
    'export const useEffect = (effect) => { effect(); };' +
    ' export const useMemo = (make) => make();' +
    ' export const useCallback = (callback) => callback;' +
    ' export const useSyncExternalStore = (subscribe, getSnapshot) => getSnapshot();',
  'react-query':
    'export const asked = []; export const answer = { data: undefined };' +
    ' export const useQuery = (options) => (asked.push(options), { data: answer.data });',
  useAuth: "export const useAuth = () => ({ user: { id: 'parent-1' } });",
  queryCache: 'export const sessionGeneration = () => 7;',
  api: 'export default {};',
};
const bundle = await build({
  stdin: {
    contents: `export { default as useNewMarks } from './src/areas/family/useNewMarks';
export * from './src/areas/family/newMarks';
export { default as api } from './src/services/api';
export { asked, answer } from '@tanstack/react-query';`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
  logLevel: 'error',
  plugins: [
    {
      name: 'stand-ins',
      setup(build) {
        build.onResolve({ filter: /(^|\/)(react|react-query|useAuth|queryCache|api)$/ }, (args) => ({
          path: args.path.split('/').pop(),
          namespace: 'stand-in',
        }));
        build.onLoad({ filter: /.*/, namespace: 'stand-in' }, (args) => ({ contents: standIns[args.path] }));
      },
    },
  ],
});
// The bundle imports nothing, so it loads straight from memory.
const { useNewMarks, newMarks, newDots, readSeen, rememberOpened, startSeen, subscribeSeen, api, asked, answer } =
  await import(`data:text/javascript,${encodeURIComponent(bundle.outputFiles[0].text)}`);

const KEY = 'mst.family.seen.parent-1.child-1';
const SINCE = '2026-11-08T10:00:00.000000+00:00';
const done = (id, kind, finishedAt) => ({ id, kind, status: 'completed', createdAt: finishedAt, finishedAt });
const ready = (opened = []) => ({ since: SINCE, opened });
const none = { check: 0, quiz: 0, flashcards: 0, mindmap: 0, story: 0, learn: 0, activities: 0 };
// The notebook home at the first visit, 10:00, and at 12:30, as the server sends them: activities newest first,
// without results, and attempts. Cut to the fields the rule reads.
const earlier = {
  serverTime: SINCE,
  materials: [],
  activities: [done('map-before', 'mindmap', '2026-11-07T18:00:00+00:00'), done('quiz-untried', 'quiz', SINCE)],
  attempts: [],
};
const home = {
  serverTime: '2026-11-08T12:30:00.000000+00:00',
  materials: [],
  activities: [
    done('check-after', 'check', '2026-11-08T12:00:00.250000+00:00'),
    { id: 'cards-making', kind: 'flashcards', status: 'running', createdAt: '2026-11-08T12:10:00+00:00' },
    done('story-after', 'story', '2026-11-08T11:30:00.123456+00:00'),
    done('quiz-tried', 'quiz', '2026-11-08T11:00:00+00:00'),
    { ...done('check-pages', 'check', '2026-11-08T10:30:00+00:00'), status: 'needs_input' },
    ...earlier.activities,
  ],
  attempts: [{ id: 'attempt-1', activityId: 'quiz-tried', score: 3, total: 5 }],
};
function reset() {
  stored.clear();
  storage = 'ok';
  asked.length = 0;
  answer.data = undefined;
}

test("an attempted quiz isn't new", () => {
  assert.equal(newMarks(home, ready()).ids.has('quiz-tried'), false);
  // Before its attempt, the same quiz was new.
  assert.equal(newMarks({ ...home, attempts: [] }, ready()).ids.has('quiz-tried'), true);
});

test("an item finished before `since` isn't new, but an untried quiz is", () => {
  const { ids, counts } = newMarks(home, ready());
  // map-before finished before `since`; cards-making and check-pages haven't completed; quiz-tried was tried.
  assert.deepEqual([...ids], ['check-after', 'story-after', 'quiz-untried']);
  assert.deepEqual(counts, { ...none, check: 1, quiz: 1, story: 1, activities: 2 });
});

test('opening an item clears its mark, and tells every hook', () => {
  reset();
  startSeen('parent-1', 'child-1', SINCE);
  answer.data = home;
  let marks = useNewMarks('child-1');
  assert.equal(marks.isNew('story-after'), true);
  let told = 0;
  const stop = subscribeSeen(() => (told += 1));
  marks.markOpened('story-after');
  marks = useNewMarks('child-1');
  assert.equal(marks.isNew('story-after'), false);
  assert.deepEqual(marks.counts, { ...none, check: 1, quiz: 1, activities: 1 });
  assert.equal(told, 1);
  // Marking the newest again writes nothing, so a page that marks on each render can't loop.
  marks.markOpened('story-after');
  assert.equal(told, 1);
  stop();
  // An untried quiz clears the same way, and the store holds ids only.
  marks.markOpened('quiz-untried');
  assert.equal(useNewMarks('child-1').isNew('quiz-untried'), false);
  assert.deepEqual(JSON.parse(stored.get(KEY)), ready(['quiz-untried', 'story-after']));
});

test('the store keeps the newest 300 ids', () => {
  reset();
  startSeen('parent-1', 'child-1', SINCE);
  for (let i = 1; i <= 305; i += 1) rememberOpened('parent-1', 'child-1', `item-${i}`);
  let { since, opened } = readSeen('parent-1', 'child-1');
  assert.equal(since, SINCE);
  assert.equal(opened.length, 300);
  assert.deepEqual([opened[0], opened.at(-1)], ['item-305', 'item-6']);
  // Opening one again moves it to the front, once.
  rememberOpened('parent-1', 'child-1', 'item-100');
  ({ opened } = readSeen('parent-1', 'child-1'));
  assert.equal(opened.length, 300);
  assert.equal(opened[0], 'item-100');
  assert.equal(opened.filter((id) => id === 'item-100').length, 1);
  // Reading again without a change gives the same object, as useSyncExternalStore needs.
  assert.equal(readSeen('parent-1', 'child-1'), readSeen('parent-1', 'child-1'));
});

test('with storage blocked there are no marks and no error', () => {
  for (const mode of ['blocked', 'full']) {
    reset();
    storage = mode;
    answer.data = home;
    useNewMarks('child-1'); // tries to start the store
    const marks = useNewMarks('child-1');
    assert.equal(marks.isNew('quiz-untried'), false, mode);
    assert.deepEqual(marks.counts, none, mode);
    marks.markOpened('story-after');
    assert.equal(readSeen('parent-1', 'child-1'), null, mode);
  }
});

test('the hook reads the notebook home under its existing key, with no refetchInterval (C-10)', async () => {
  reset();
  useNewMarks('child-1');
  const [query] = asked;
  assert.deepEqual(query.queryKey, ['family', 7, 'parent-1', 'child-1', 'home']);
  assert.equal(query.refetchInterval, undefined);
  assert.equal(query.enabled, true);
  const signal = new AbortController().signal;
  const calls = [];
  api.get = async (url, config) => (calls.push([url, config.signal]), { data: home });
  assert.equal(await query.queryFn({ signal }), home);
  assert.deepEqual(calls, [['/api/family/children/child-1', signal]]);
  // Before a child is chosen, it reads nothing.
  asked.length = 0;
  useNewMarks(undefined);
  assert.equal(asked[0].enabled, false);
});

test("the first visit starts `since` at the home's serverTime, once, so older items stay unmarked", () => {
  reset();
  assert.equal(useNewMarks('child-1').isNew('quiz-untried'), false); // the home is still loading
  assert.equal(stored.size, 0);
  answer.data = earlier;
  useNewMarks('child-1'); // the effect starts the store
  assert.deepEqual(JSON.parse(stored.get(KEY)), ready());
  let marks = useNewMarks('child-1');
  assert.equal(marks.isNew('map-before'), false);
  assert.equal(marks.isNew('quiz-untried'), true);
  // Later reads keep the first `since`, and what finished after it is new.
  answer.data = home;
  useNewMarks('child-1');
  marks = useNewMarks('child-1');
  assert.equal(readSeen('parent-1', 'child-1').since, SINCE);
  assert.equal(marks.isNew('story-after'), true);
  assert.equal(marks.isNew('map-before'), false);
});

test("the dots: a list section when its kind has new items, and the phone's Activities for any of its four", () => {
  // sections.js's shape, cut to what the dots read.
  const sections = [
    { id: 'child' },
    { id: 'notebook' },
    { id: 'homework', kind: 'check' },
    { id: 'activities' },
    { id: 'quizzes', kind: 'quiz', group: 'activities' },
    { id: 'flashcards', kind: 'flashcards', group: 'activities' },
    { id: 'mind-maps', kind: 'mindmap', group: 'activities' },
    { id: 'stories', kind: 'story', group: 'activities' },
  ];
  assert.deepEqual(newDots({ ...none, story: 1, activities: 1 }, sections), { stories: 1, activities: 1 });
  assert.deepEqual(newDots({ ...none, check: 2 }, sections), { homework: 2 });
  // A new explanation has no list section, so it marks only its own row (in Recent).
  assert.deepEqual(newDots({ ...none, learn: 1 }, sections), {});
});

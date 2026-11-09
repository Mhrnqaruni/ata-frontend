// The lists' refresh rules (Phase 1.37 S3.1; C-10, B10, C-19): a list polls only while a row is being made, and
// when one finishes, the child's notebook home and other lists refresh and the change is announced.
// Area: family
import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

// The hook as written, with stand-ins for React (an effect runs at once, and one ref stands for one mounted list),
// React Query's key hash, and the query client, which records what it's asked to refresh.
const standIns = {
  react:
    'const ref = { current: null }; export const refs = ref; export const useRef = () => ref;' +
    ' export const useEffect = (effect) => { effect(); };',
  'react-query': 'export const hashKey = (key) => JSON.stringify(key);',
  queryCache:
    'export const invalidated = [];' +
    ' export const queryClient = { invalidateQueries: async (filter) => { invalidated.push(filter); } };',
  api: 'export default {};',
};
const bundle = await build({
  stdin: {
    contents: `export { default as useFinishedRows, pollWhileMaking, finishedWords } from './src/areas/family/lists/useFinishedRows';
export { invalidated } from './src/services/queryCache';
export { refs } from 'react';`,
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
        build.onResolve({ filter: /(^|\/)(react|react-query|queryCache|api)$/ }, (args) => ({
          path: args.path.split('/').pop(),
          namespace: 'stand-in',
        }));
        build.onLoad({ filter: /.*/, namespace: 'stand-in' }, (args) => ({ contents: standIns[args.path] }));
      },
    },
  ],
});
// The bundle imports nothing, so it loads straight from memory.
const { useFinishedRows, pollWhileMaking, finishedWords, invalidated, refs } = await import(
  `data:text/javascript,${encodeURIComponent(bundle.outputFiles[0].text)}`
);

const key = ['family', 4, 'parent-1', 'child-1', 'activities', { kind: 'quiz', limit: 20 }];
const row = (id, status, kind = 'quiz') => ({ id, kind, status, title: id });

test('a list polls every 3 s only while one of its rows is being made', () => {
  assert.equal(pollWhileMaking([row('a', 'running'), row('b', 'completed')]), 3000);
  assert.equal(pollWhileMaking([row('a', 'queued')]), 3000);
  assert.equal(pollWhileMaking([row('b', 'completed'), row('c', 'failed')]), false);
  assert.equal(pollWhileMaking(undefined), false);
});

test('when a row finishes, the home and the other lists refresh, and the live region says so', () => {
  refs.current = null;
  invalidated.length = 0;
  const said = [];
  const announce = (text) => said.push(text);
  // The first answer is the starting point, and a poll with no change does nothing.
  useFinishedRows([row('a', 'running'), row('b', 'completed')], key, announce);
  useFinishedRows([row('a', 'running'), row('b', 'completed')], key, announce);
  assert.deepEqual([invalidated.length, said.length], [0, 0]);
  useFinishedRows([row('a', 'completed'), row('b', 'completed')], key, announce);
  assert.deepEqual(said, ['Your quiz is ready.']);
  assert.equal(invalidated.length, 1);
  const [{ queryKey, predicate }] = invalidated;
  assert.deepEqual(queryKey, ['family', 4, 'parent-1', 'child-1']);
  // The notebook home and the child's other lists, but not this list, which already has the change.
  const refreshes = (other) => predicate({ queryKey: ['family', 4, 'parent-1', 'child-1', ...other] });
  assert.equal(refreshes(['home']), true);
  assert.equal(refreshes(['activities', { limit: 6 }]), true);
  assert.equal(refreshes(['activities', { kind: 'quiz', limit: 20 }]), false);
  assert.equal(refreshes(['chats']), false);
});

test('a row that ends needing pages, or that fails, is announced in its row’s words, never “we” (Phase 1.38)', () => {
  assert.equal(finishedWords(row('a', 'completed', 'check')), 'The homework is marked.');
  assert.equal(finishedWords(row('a', 'needs_input', 'check')), 'Some pages are missing.');
  assert.equal(finishedWords(row('a', 'failed', 'story')), 'The story didn’t finish.');
  assert.equal(finishedWords(row('a', 'outcome_unknown', 'mindmap')), 'The mind map didn’t finish.');
});

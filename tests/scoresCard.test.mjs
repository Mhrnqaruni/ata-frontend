// The profile's "How Sam is doing" card (Phase 1.37 S4.2; Phase 1.38 design §3.4), drawn with React and recharts:
// one list of the chosen kind, the newest 50; the caption; a dot per score with its tooltip, the latest labelled, each
// opening its result; the sentence, the hidden table, the phone's date labels, no or one score, and a failed load.
// Area: family
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const require = createRequire(import.meta.url);
const React = require('react');
const { act, create } = require('react-test-renderer');
const recharts = require('recharts');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// The card's packages: React and recharts as they are, except that the chart gets a fixed size, because a test has
// no page to measure; MUI as plain elements, as in familySourceRecovery.test.cjs; and a useQuery that records the
// options it's given and answers with `answer`. `phone` is the phone media query's answer.
const asked = [];
let answer = {};
let phone = false;
const packages = {
  react: React,
  'react/jsx-runtime': require('react/jsx-runtime'),
  recharts: {
    ...recharts,
    ResponsiveContainer: ({ children, height }) => React.cloneElement(children, { width: 640, height }),
  },
  '@mui/material': { Button: 'Button', Tab: 'Tab', Tabs: 'Tabs', Tooltip: 'Tooltip', useMediaQuery: () => phone },
  '@tanstack/react-query': { useQuery: (options) => (asked.push(options), answer) },
};
// Stand-ins for the signed-in parent, the session counter, the API client (which records each request) and the CSS.
const standIns = {
  useAuth: "export const useAuth = () => ({ user: { id: 'parent-1' } });",
  queryCache: 'export const sessionGeneration = () => 3;',
  api:
    'export const calls = [];' +
    ' export default { get: async (url, config) => (calls.push([url, String(config.params)]), { data: {} }) };',
  css: '',
};
const bundle = await build({
  stdin: {
    contents: `export { default } from './src/areas/family/child/ScoresCard';
export { calls } from './src/services/api';`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  format: 'cjs',
  platform: 'node',
  jsx: 'automatic',
  write: false,
  logLevel: 'error',
  external: Object.keys(packages),
  plugins: [
    {
      name: 'stand-ins',
      setup(build) {
        build.onResolve({ filter: /(^|\/)(useAuth|queryCache|api)$|\.css$/ }, (args) => ({
          path: args.path.endsWith('.css') ? 'css' : args.path.split('/').pop(),
          namespace: 'stand-in',
        }));
        build.onLoad({ filter: /.*/, namespace: 'stand-in' }, (args) => ({ contents: standIns[args.path] }));
      },
    },
  ],
});
const card = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)((id) => packages[id], card, card.exports);
const { default: ScoresCard, calls } = card.exports;

const item = (id, kind, at, summary, status = 'completed') => ({
  id,
  kind,
  title: `Title ${id}`,
  status,
  createdAt: at,
  finishedAt: at,
  settings: {},
  summary,
});
const marks = (right, total) => ({ right, notQuite: total - right, toCheck: 0, total });
// One page of checks as the list sends it, newest first: one still marking, and three marked.
const checks = {
  items: [
    item('c-making', 'check', '2026-11-08T09:00:00+00:00', null, 'running'),
    item('c-3', 'check', '2026-11-06T09:00:00+00:00', marks(4, 6)),
    item('c-2', 'check', '2026-11-04T09:00:00+00:00', marks(0, 5)),
    item('c-1', 'check', '2026-11-02T09:00:00+00:00', marks(7, 10)),
  ],
  nextCursor: null,
};

async function render(props = {}) {
  let view;
  await act(async () => {
    view = create(React.createElement(ScoresCard, { childId: 'child-1', childName: 'Sam', onOpen() {}, ...props }));
  });
  return view;
}
// The rendered elements that pass `match`, and an element's text.
const find = (view, match) => view.root.findAll((node) => typeof node.type === 'string' && match(node));
const textOf = (node) => (typeof node === 'string' ? node : node.children.map(textOf).join(''));
const byClass = (view, className) => find(view, (node) => node.props.className === className);
const tickLabels = (view) =>
  find(view, (node) => node.type === 'text' && /cartesian-axis-tick-value/.test(node.props.className)).map(textOf);
const tabs = (view) => find(view, (node) => node.type === 'Tabs')[0];
const dots = (view) => find(view, (node) => node.type === 'g' && node.props.className === 'fam-scores-dot');

test('it asks for one list of the chosen kind, the newest 50, and the switch changes the kind', async () => {
  asked.length = 0;
  answer = {};
  const view = await render();
  const [query] = asked;
  assert.deepEqual(query.queryKey, ['family', 3, 'parent-1', 'child-1', 'activities', { kind: 'check', limit: 50 }]);
  assert.equal(query.refetchInterval, undefined);
  await query.queryFn({ signal: new AbortController().signal });
  assert.deepEqual(calls, [['/api/family/children/child-1/activities', 'kind=check&limit=50']]);
  // While the list loads, the card keeps the chart's shape.
  assert.equal(byClass(view, 'fam-scores-wait').length, 1);
  // Teacher's segmented control, Homework · Quizzes, named by the card's title.
  assert.equal(textOf(find(view, (node) => node.type === 'h2')[0]), 'How Sam is doing');
  assert.deepEqual(
    find(view, (node) => node.type === 'Tab').map((tab) => tab.props.label),
    ['Homework', 'Quizzes']
  );
  assert.equal(tabs(view).props.value, 'check');
  await act(async () => tabs(view).props.onChange({}, 'quiz'));
  assert.deepEqual(asked.at(-1).queryKey.at(-1), { kind: 'quiz', limit: 50 });
  assert.equal(tabs(view).props.value, 'quiz');
});

test('each score is a dot in time order with its tooltip, the latest labelled, and a dot opens its result', async () => {
  answer = { data: checks };
  let opened;
  const view = await render({ onOpen: (activity) => (opened = activity) });
  assert.deepEqual(
    dots(view).map((dot) => [dot.props['data-latest'], dot.props.tabIndex]),
    [
      [false, -1],
      [false, -1],
      [true, 0],
    ]
  );
  assert.deepEqual(byClass(view, 'fam-scores-latest').map(textOf), ['67%']);
  assert.deepEqual(
    byClass(view, 'fam-scores-mark').map((mark) => mark.props.r),
    [5, 5, 6.5]
  );
  // Hovering or focusing a dot shows its tooltip, which is also its name.
  assert.deepEqual(
    find(view, (node) => node.type === 'Tooltip').map((tip) => tip.props.title),
    [
      'Title c-1 · 7 of 10 right (70%) · 2 Nov',
      'Title c-2 · 0 of 5 right (0%) · 4 Nov',
      'Title c-3 · 4 of 6 right (67%) · 6 Nov',
    ]
  );
  assert.equal(dots(view)[2].props['aria-label'], 'Title c-3 · 4 of 6 right (67%) · 6 Nov');
  await act(async () => dots(view)[0].props.onClick());
  assert.equal(opened, checks.items[3]);
  await act(async () => dots(view)[2].props.onKeyDown({ key: 'Enter', preventDefault() {} }));
  assert.equal(opened, checks.items[1]);
  // The chart is one group, named for its kind; the gridlines' ticks are 0, 50 and 100%, and every date shows here.
  assert.equal(find(view, (node) => node.props.role === 'group')[0].props['aria-label'], 'Homework scores over time');
  assert.deepEqual(tickLabels(view).sort(), ['0%', '100%', '2 Nov', '4 Nov', '50%', '6 Nov']);
});

test('the caption, the sentence and the hidden table say what the chart shows', async () => {
  answer = { data: checks };
  const view = await render();
  assert.deepEqual(byClass(view, 'fam-scores-caption').map(textOf), [
    'Each dot is one homework check, by the day it was marked: how much Sam got right.',
  ]);
  const [trend] = byClass(view, 'fam-scores-trend');
  assert.equal(textOf(trend), 'Down from 70% to 67% across the last 3 homework checks.');
  assert.deepEqual(find(view, (node) => node.type === 'strong').map(textOf), ['Down from 70% to 67%']);
  const table = find(view, (node) => node.type === 'table')[0];
  assert.equal(table.props.className, 'fam-sr');
  assert.deepEqual(
    find(view, (node) => node.type === 'tr').map((row) => row.children.map(textOf)),
    [
      ['Date', 'Name', 'Score'],
      ['2 Nov 2026', 'Title c-1', '70%'],
      ['4 Nov 2026', 'Title c-2', '0%'],
      ['6 Nov 2026', 'Title c-3', '67%'],
    ]
  );
  await act(async () => tabs(view).props.onChange({}, 'quiz'));
  assert.deepEqual(byClass(view, 'fam-scores-caption').map(textOf), [
    'Each dot is one quiz, by the day Sam tried it: how much Sam got right.',
  ]);
});

test('on phones only the first and last dates are labelled, and the switch fills the width', async () => {
  answer = { data: checks };
  phone = true;
  const view = await render();
  phone = false;
  assert.deepEqual(
    tickLabels(view).filter((label) => !label.endsWith('%')),
    ['2 Nov', '6 Nov']
  );
  assert.equal(tabs(view).props.variant, 'fullWidth');
});

test('with no score yet, one sentence says when scores will show, with no chart or caption', async () => {
  answer = { data: { items: [checks.items[0]], nextCursor: null } };
  const view = await render();
  assert.deepEqual(byClass(view, 'fam-scores-trend').map(textOf), [
    'Sam’s homework scores will show here after the first check.',
  ]);
  assert.equal(find(view, (node) => node.type === 'svg').length, 0);
  assert.equal(byClass(view, 'fam-scores-caption').length, 0);
  // An untried quiz has no score yet either.
  answer = { data: { items: [item('q-new', 'quiz', '2026-11-08T08:00:00+00:00', { attempts: 0, latest: null })] } };
  await act(async () => tabs(view).props.onChange({}, 'quiz'));
  assert.deepEqual(byClass(view, 'fam-scores-trend').map(textOf), [
    'Sam’s quiz scores will show here after the first quiz.',
  ]);
});

test("with one score, the dot and the child's first score in bold", async () => {
  answer = { data: { items: [checks.items[3]], nextCursor: null } };
  const view = await render();
  assert.equal(dots(view).length, 1);
  assert.deepEqual(byClass(view, 'fam-scores-trend').map(textOf), ['Sam’s first homework check: 70%.']);
  assert.deepEqual(find(view, (node) => node.type === 'strong').map(textOf), ['70%']);
});

test('a failed load shows one line with Try again; a failed refresh keeps the saved scores', async () => {
  let retried = 0;
  answer = { isError: true, refetch: () => (retried += 1) };
  let view = await render();
  assert.match(textOf(view.root), /Could not load Sam’s scores\./);
  await act(async () => find(view, (node) => node.type === 'Button')[0].props.onClick());
  assert.equal(retried, 1);
  answer = { data: checks, isError: true };
  view = await render();
  assert.equal(dots(view).length, 3);
  assert.match(textOf(view.root), /Could not refresh\. Showing what was saved\./);
});

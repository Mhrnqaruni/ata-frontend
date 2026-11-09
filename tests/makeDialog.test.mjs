// The make window (Phase 1.38 design §6.3, §10.6): Make sends one plain request; when the server gives back an item it
// already has, the window asks "You already have this story", and Open it opens it while Make a new one sends the same
// request with a new attempt key. Guards the 9 Nov regression, where the button's click event went into the request.
// Area: family
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const require = createRequire(import.meta.url);
const React = require('react');
const { act, create } = require('react-test-renderer');
const { MemoryRouter, useLocation } = require('react-router-dom');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// MUI as plain elements named after their components, except a Dialog that shows its content only while open and
// the hooks; any component the window's fields use that isn't named here renders as a plain element too.
const named = { useMediaQuery: () => false, Dialog: ({ open, children }) => (open ? children : null) };
const mui = new Proxy(named, {
  get: (target, key) =>
    key in target ? target[key] : typeof key === 'string' && key !== '__esModule' ? key : undefined,
});
const packages = {
  react: React,
  'react/jsx-runtime': require('react/jsx-runtime'),
  'react-router-dom': require('react-router-dom'),
  '@mui/material': mui,
  // No materials, chats or home are loaded: the window offers "Describe a topic" alone.
  '@tanstack/react-query': { useQuery: () => ({ data: undefined }), useQueries: () => [] },
};
// Stand-ins: the family service answers the first start with an item it already had (another id), then with the
// requested id; the signed-in parent; the query cache; MUI's icons.
const standIns = {
  familyApi: `export const calls = [];
let starts = 0;
export const resetStarts = () => {
  starts = 0;
};
export const familyKeys = new Proxy({}, { get: () => (...key) => ['family', ...key] });
export const familyApi = {
  startActivity: async (childId, id, body) => {
    calls.push(['startActivity', childId, id, body]);
    starts += 1;
    return starts === 1
      ? { id: 'story-old', kind: 'story', status: 'completed', createdAt: '2026-11-08T04:26:00+00:00' }
      : { id, kind: 'story', status: 'queued' };
  },
};`,
  useAuth: "export const useAuth = () => ({ user: { id: 'parent-1' } });",
  queryCache:
    'export const sessionGeneration = () => 0; export const queryClient = { invalidateQueries: async () => {} };',
  icon: 'export default function Icon() { return null; }',
};
const bundle = await build({
  stdin: {
    contents: `export { default as MakeDialog } from './src/areas/family/make/MakeDialog';
export { calls, resetStarts } from './src/areas/family/familyApi';`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  format: 'cjs',
  platform: 'node',
  jsx: 'automatic',
  write: false,
  loader: { '.css': 'empty' },
  logLevel: 'error',
  external: Object.keys(packages),
  plugins: [
    {
      name: 'stand-ins',
      setup(build) {
        build.onResolve({ filter: /(^|\/)(familyApi|useAuth|queryCache)$|^@mui\/icons-material\// }, (args) => ({
          path: args.path.startsWith('@mui/') ? 'icon' : args.path.split('/').pop(),
          namespace: 'stand-in',
        }));
        build.onLoad({ filter: /.*/, namespace: 'stand-in' }, (args) => ({ contents: standIns[args.path] }));
      },
    },
  ],
});
const dialog = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)((id) => packages[id], dialog, dialog.exports);
const { MakeDialog, calls, resetStarts } = dialog.exports;

const child = { id: 'child-1', displayName: 'Sam' };
const page = '/family/children/child-1/stories';
const textOf = (node) => (typeof node === 'string' ? node : node.children.map(textOf).join(''));
const byMst = (view, value) => view.root.findAll((node) => node.props['data-mst'] === value)[0];
const settle = () => act(async () => new Promise((resolve) => setTimeout(resolve, 10)));

// The window over the Stories page, opened as the page opens it: its own history entry with ?dialog=make-story.
async function open() {
  const where = {};
  function Where() {
    const location = useLocation();
    Object.assign(where, { path: location.pathname + location.search });
    return null;
  }
  calls.length = 0;
  resetStarts();
  let view;
  await act(async () => {
    view = create(
      React.createElement(
        MemoryRouter,
        {
          initialEntries: [page, { pathname: page, search: '?dialog=make-story', state: { dialog: true } }],
          initialIndex: 1,
          future: { v7_startTransition: true, v7_relativeSplatPath: true },
        },
        React.createElement(MakeDialog, { child, mode: 'section' }),
        React.createElement(Where)
      )
    );
  });
  // Describe a topic, then Make.
  const topicChoice = view.root
    .findAll((node) => node.type === 'button' && node.props.role === 'radio')
    .find((node) => textOf(node) === 'Describe a topic');
  if (topicChoice) await act(async () => topicChoice.props.onClick());
  const topic = view.root.findAll(
    (node) => node.type === 'TextField' && node.props.label === 'What should it be about?'
  )[0];
  await act(async () => topic.props.onChange({ target: { value: 'Decimal place value' } }));
  await act(async () => byMst(view, 'family-make-story').props.onClick());
  await settle();
  return { view, where };
}

test('Make sends one plain request, and an item the server already had brings the choice', async () => {
  const { view } = await open();
  assert.equal(calls.length, 1);
  const [, childId, id, body] = calls[0];
  assert.equal(childId, 'child-1');
  assert.match(id, /^[0-9a-f-]{36}$/);
  assert.doesNotThrow(() => JSON.stringify(body)); // the 9 Nov regression: the click event in the body
  assert.equal(body.kind, 'story');
  assert.equal(body.topic, 'Decimal place value');
  assert.equal(body.newAttemptKey, undefined);
  // The server answered with yesterday's story, so the window asks instead of closing.
  const titles = view.root.findAll((node) => node.type === 'DialogTitle').map(textOf);
  assert.ok(titles.includes('You already have this story'), titles.join(' | '));
  assert.match(
    textOf(view.root),
    /MySmartTeach made one with these settings .+. Open it, or make a new one\? The one you have is kept\./
  );
});

test('Make a new one sends the same request with a new attempt key', async () => {
  const { view } = await open();
  await act(async () => byMst(view, 'family-make-new-anyway').props.onClick());
  await settle();
  assert.equal(calls.length, 2);
  const [, , firstId, first] = calls[0];
  const [, , secondId, second] = calls[1];
  assert.notEqual(secondId, firstId);
  assert.equal(second.topic, first.topic);
  assert.equal(second.sourceActivityId, 'story-old');
  assert.match(second.newAttemptKey, /^[0-9a-f-]{36}$/);
  // Made: the choice is gone.
  assert.equal(
    view.root
      .findAll((node) => node.type === 'DialogTitle')
      .map(textOf)
      .includes('You already have this story'),
    false
  );
});

test('Open it opens the existing item in the window’s place', async () => {
  const { view, where } = await open();
  await act(async () => byMst(view, 'family-make-open-existing').props.onClick());
  await settle();
  assert.equal(where.path, '/family/children/child-1/stories/story-old');
  assert.equal(calls.length, 1);
});

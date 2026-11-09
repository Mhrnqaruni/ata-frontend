// The child's profile (Phase 1.38 design §3.4), drawn with React: the title row (the tab's title, the avatar, the name,
// the year and note, Edit details), the scores card, and "Your chats about Sam" with up to five chats, newest first,
// See all, and its empty, loading and failed states.
// Area: family
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const require = createRequire(import.meta.url);
const React = require('react');
const { act, create } = require('react-test-renderer');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
// The page sets the tab's title; a test has no page, so it gets a stand-in document.
globalThis.document ??= { title: '' };

// The page's packages: MUI and the router's Link as plain elements, the outlet's child, a navigate that records where
// it went, and a useQuery that answers the chat list with `chats`.
const child = { id: 'child-1', displayName: 'Sam', gradeLevel: 'Year 4', notes: '  Finds reading aloud hard ' };
const went = [];
let chats = {};
const packages = {
  react: React,
  'react/jsx-runtime': require('react/jsx-runtime'),
  '@mui/material': { Button: 'Button', Skeleton: 'Skeleton', Typography: 'Typography' },
  'react-router-dom': {
    Link: 'Link',
    useOutletContext: () => ({ child }),
    useNavigate: () => (to, options) => went.push([to, options]),
    useLocation: () => ({ pathname: '/family/children/child-1/profile' }),
  },
  '@tanstack/react-query': { useQuery: () => chats },
};
// Stand-ins for the signed-in parent, the session counter, the API client, the dialog address (which records the
// dialogs it opens), the scores card, MUI's icons and the CSS.
const standIns = {
  useAuth: "export const useAuth = () => ({ user: { id: 'parent-1' } });",
  queryCache: 'export const sessionGeneration = () => 3;',
  api: 'export default { get: async () => ({ data: {} }) };',
  useDialogParam: 'export const opened = []; export default (name) => [false, () => opened.push(name), () => {}];',
  ScoresCard: "export default 'ScoresCard';",
  css: '',
};
const bundle = await build({
  stdin: {
    contents: `export { default, lastMessage, profileLine } from './src/areas/family/child/ProfilePage';
export { opened } from './src/areas/family/useDialogParam';`,
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
        build.onResolve({ filter: /^@mui\/icons-material\// }, (args) => ({ path: args.path, namespace: 'icon' }));
        build.onLoad({ filter: /.*/, namespace: 'icon' }, (args) => ({
          contents: `export default ${JSON.stringify(args.path.split('/').pop())};`,
        }));
        build.onResolve({ filter: /(^|\/)(useAuth|queryCache|api|useDialogParam|ScoresCard)$|\.css$/ }, (args) => ({
          path: args.path.endsWith('.css') ? 'css' : args.path.split('/').pop(),
          namespace: 'stand-in',
        }));
        build.onLoad({ filter: /.*/, namespace: 'stand-in' }, (args) => ({ contents: standIns[args.path] }));
      },
    },
  ],
});
const page = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)((id) => packages[id], page, page.exports);
const { default: ProfilePage, lastMessage, profileLine, opened } = page.exports;

async function render() {
  let view;
  await act(async () => {
    view = create(React.createElement(ProfilePage));
  });
  return view;
}
const find = (view, match) => view.root.findAll((node) => typeof node.type === 'string' && match(node));
const textOf = (node) => (typeof node === 'string' ? node : node.children.map(textOf).join(''));
const byMst = (view, name) => find(view, (node) => node.props['data-mst'] === name);
// A chat as the chat list sends it, last updated `hoursAgo` hours ago.
const chat = (id, hoursAgo, title = `Chat ${id}`) => {
  const at = new Date(Date.now() - hoursAgo * 3600000).toISOString();
  return { id, title, revision: 1, updatedAt: at, createdAt: at };
};

test("the title row: the tab's title, the child's avatar, name, year and note, and Edit details", async () => {
  chats = { data: { items: [], nextCursor: null } };
  const view = await render();
  assert.equal(document.title, 'Profile · Parent mode · MySmartTeach');
  assert.equal(textOf(find(view, (node) => node.props.component === 'h1')[0]), 'Sam');
  assert.equal(
    textOf(find(view, (node) => node.props.className === 'fam-profile-line')[0]),
    'Year 4 · Finds reading aloud hard'
  );
  // The 64 px avatar in the child's colour leads the title.
  const [leading] = find(view, (node) => node.props.className === 'mst-page-head-leading');
  const [avatar] = leading.findAll((node) => node.props.className === 'fam-avatar');
  assert.equal(textOf(avatar), 'S');
  assert.equal(avatar.props.style.width, 64);
  // Edit details opens the address's edit dialog.
  const [edit] = byMst(view, 'family-edit-child');
  assert.equal(textOf(edit), 'Edit details');
  assert.deepEqual([edit.props.variant, edit.props.startIcon.type], ['outlined', 'EditOutlined']);
  await act(async () => edit.props.onClick());
  assert.deepEqual(opened, ['edit-child']);
});

test("the year alone without a note, and 'Year not set' without a year", () => {
  assert.equal(profileLine({ gradeLevel: 'Year 2', notes: '' }), 'Year 2');
  assert.equal(profileLine({ gradeLevel: '', notes: null }), 'Year not set');
  assert.equal(profileLine({ notes: 'Loves maths' }), 'Year not set · Loves maths');
});

test("the scores card is the child's, and a dot opens its result with the way back here", async () => {
  chats = { data: { items: [], nextCursor: null } };
  const view = await render();
  const [scores] = find(view, (node) => node.type === 'ScoresCard');
  assert.deepEqual([scores.props.childId, scores.props.childName], ['child-1', 'Sam']);
  went.length = 0;
  scores.props.onOpen({ kind: 'quiz', id: 'a1' });
  assert.deepEqual(went, [
    ['/family/children/child-1/quizzes/a1', { state: { from: '/family/children/child-1/profile' } }],
  ]);
});

test('up to five chats, newest first, each opening its chat; See all opens the Notebook with its history', async () => {
  // Six chats, out of order: the oldest is left out.
  chats = {
    data: { items: [chat('c3', 30), chat('c1', 1), chat('c6', 200), chat('c2', 5), chat('c5', 90), chat('c4', 60)] },
  };
  const view = await render();
  assert.equal(textOf(find(view, (node) => node.type === 'h2')[0]), 'Your chats about Sam');
  const rows = byMst(view, 'family-profile-chat');
  assert.deepEqual(
    rows.map((row) => row.props.to),
    ['c1', 'c2', 'c3', 'c4', 'c5'].map((id) => `/family/children/child-1/notebook?chat=${id}`)
  );
  assert.deepEqual(
    rows.map((row) => textOf(row.findAll((node) => node.props.className === 'mst-list-title')[0])),
    ['Chat c1', 'Chat c2', 'Chat c3', 'Chat c4', 'Chat c5']
  );
  for (const row of rows) {
    assert.match(textOf(row.findAll((node) => node.props.className === 'mst-list-meta')[0]), /^Last message \S/);
  }
  const [all] = byMst(view, 'family-profile-all-chats');
  assert.deepEqual(
    [textOf(all), all.props.component, all.props.to],
    ['See all', 'Link', '/family/children/child-1/notebook?history=open']
  );
});

test('a chat row says when its last message was, with today and yesterday in lower case', () => {
  const now = new Date(2026, 10, 8, 20, 0);
  assert.equal(lastMessage(new Date(2026, 10, 8, 18, 20).toISOString(), now), 'Last message today at 18:20');
  assert.equal(lastMessage(new Date(2026, 10, 7, 9, 5).toISOString(), now), 'Last message yesterday at 09:05');
  assert.equal(lastMessage(new Date(2026, 10, 2, 9, 0).toISOString(), now), 'Last message 2 Nov');
  assert.equal(lastMessage(undefined, now), '');
});

test('no chats yet, loading, and a failed load', async () => {
  chats = { data: { items: [], nextCursor: null } };
  let view = await render();
  assert.match(textOf(view.root), /Your chats about Sam will show here\./);
  assert.equal(byMst(view, 'family-profile-chat').length, 0);
  chats = { isPending: true };
  view = await render();
  assert.equal(find(view, (node) => node.type === 'Skeleton').length, 1);
  let retried = 0;
  chats = { isError: true, refetch: () => (retried += 1) };
  view = await render();
  assert.match(textOf(view.root), /Could not load your chats about Sam\./);
  await act(async () => byMst(view, 'family-profile-chats-retry')[0].props.onClick());
  assert.equal(retried, 1);
});

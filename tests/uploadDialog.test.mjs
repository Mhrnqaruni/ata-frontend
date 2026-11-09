// The upload dialog at its addresses (Phase 1.37 S3.4; design §3.7; C-18, C-21): Check homework marks the photos and
// opens the check in the dialog's place, Add the missing pages starts with the check's first pages, and an upload from
// the Notebook joins the chat in its history entry, with the files the chat handed over.
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

// The dialog's packages: React and React Router as they are; MUI as plain elements, as in
// familySourceRecovery.test.cjs, except a Dialog that shows its content only while open.
const mui = { useMediaQuery: () => false, Dialog: ({ open, children }) => (open ? children : null) };
// Tooltip: teacher's UploadFileRow, which PageDrop reuses, wraps its Remove button in one.
for (const name of [
  'Alert',
  'Button',
  'DialogActions',
  'DialogContent',
  'DialogTitle',
  'IconButton',
  'TextField',
  'Tooltip',
])
  mui[name] = name;
mui.Typography = 'Typography';
const packages = {
  react: React,
  'react/jsx-runtime': require('react/jsx-runtime'),
  'react-router-dom': require('react-router-dom'),
  '@mui/material': mui,
};
// Stand-ins: the family service, which records each request and answers as the server does, the signed-in parent,
// the query cache and MUI's icons.
const standIns = {
  familyApi: `export const calls = [];
const record = (name, answer) => async (...args) => (calls.push([name, ...args]), answer);
export const familyKeys = { child: (...key) => ['family', ...key], conversation: (g, u, c, id) => ['family', g, u, c, 'conversation', id] };
export const familyApi = {
  uploadMaterial: record('uploadMaterial', { id: 'material-new' }),
  startActivity: record('startActivity', { id: 'check-new' }),
  attachMaterial: record('attachMaterial', {}),
  activity: record('activity', { id: 'check-old', kind: 'check', materialId: 'material-old' }),
  material: record('material', { id: 'material-old', purpose: 'work', title: '', files: [{ name: 'page-1.jpg', mime: 'image/jpeg' }] }),
  materialFile: record('materialFile', new Blob(['page'])),
};`,
  useAuth: "export const useAuth = () => ({ user: { id: 'parent-1' } });",
  queryCache:
    'export const sessionGeneration = () => 0; export const queryClient = { invalidateQueries: async () => {} };',
  icon: 'export default function Icon() { return null; }',
};
const bundle = await build({
  stdin: {
    contents: `export { default as UploadDialog, stageFiles } from './src/areas/family/make/UploadDialog';
export { calls } from './src/areas/family/familyApi';`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  format: 'cjs',
  platform: 'node',
  jsx: 'automatic',
  write: false,
  loader: { '.css': 'empty' }, // PageDrop imports homework.css
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
const { UploadDialog, stageFiles, calls } = dialog.exports;

const child = { id: 'child-1', displayName: 'Sam' };
const page = '/family/children/child-1/homework';
// The dialog over a page, opened as the pages open it: its own history entry, with ?dialog= and its state.
async function open(search, state, at = page) {
  const where = {};
  function Where() {
    const location = useLocation();
    Object.assign(where, { path: location.pathname + location.search, state: location.state });
    return null;
  }
  calls.length = 0;
  let view;
  await act(async () => {
    view = create(
      React.createElement(
        MemoryRouter,
        {
          initialEntries: [at, { pathname: at.split('?')[0], search, state: { ...state, dialog: true } }],
          initialIndex: 1,
          future: { v7_startTransition: true, v7_relativeSplatPath: true },
        },
        React.createElement(UploadDialog, { child }),
        React.createElement(Where)
      )
    );
  });
  return { view, where };
}
const textOf = (node) => (typeof node === 'string' ? node : node.children.map(textOf).join(''));
const find = (view, type) => view.root.findAll((node) => node.type === type);
const button = (view, label) => find(view, 'Button').find((node) => textOf(node) === label);
const settle = () => act(async () => new Promise((resolve) => setTimeout(resolve, 10)));

test('Check homework uploads the photos, marks them with today’s check, and closes onto the list', async () => {
  const { view, where } = await open('?dialog=check');
  assert.equal(textOf(find(view, 'DialogTitle')[0]), 'Check homework');
  const photo = new File(['photo'], 'page-1.jpg', { type: 'image/jpeg' });
  await act(async () => find(view, 'input')[0].props.onChange({ target: { files: [photo], value: '' } }));
  await act(async () => button(view, 'Check 1 page').props.onClick()); // the main button counts the pages (§5.4)
  await settle();
  // [name, child id, upload id, form, …] and [name, child id, check id, body].
  const upload = calls.find(([name]) => name === 'uploadMaterial');
  const start = calls.find(([name]) => name === 'startActivity');
  assert.equal(upload[1], 'child-1');
  assert.deepEqual(upload[3].getAll('purpose'), ['work']);
  assert.deepEqual(start[3], {
    materialId: 'material-new',
    materialIds: ['material-new'],
    kind: 'check',
    count: 5,
    focus: '',
    title: 'Homework check',
    tag: '',
    difficulty: 'Standard',
    quizType: 'mcq',
  });
  // The window closes onto the page, and the row appears at the top as "Marking…" (design §5.4).
  assert.deepEqual(where, { path: page, state: null });
  assert.equal(find(view, 'DialogTitle').length, 0);
});

test('Add the missing pages starts with the check’s first pages, read through its material', async () => {
  const { view } = await open('?dialog=add-pages', { addPages: { activityId: 'check-old' } });
  await settle();
  assert.equal(textOf(find(view, 'DialogTitle')[0]), 'Add the missing pages');
  assert.deepEqual(
    calls.map(([name, ...args]) => [name, ...args.filter((arg) => typeof arg === 'string')]),
    [
      ['activity', 'child-1', 'check-old'],
      ['material', 'child-1', 'material-old'],
      ['materialFile', 'child-1', 'material-old'],
    ]
  );
  // The first pages show as numbered thumbnails (design §5.4).
  assert.match(textOf(view.root), /Page 1: page-1/);
  assert.equal(button(view, 'Check 1 page').props.disabled, false); // the main button counts the pages (§5.4)
});

test('an upload from the Notebook keeps the chat’s files and joins the chat in its history entry, then closes', async () => {
  const notes = new File(['notes'], 'notes.pdf', { type: 'application/pdf' });
  const token = stageFiles([notes]);
  const notebook = '/family/children/child-1/notebook?chat=chat-9';
  const { view, where } = await open(
    '?chat=chat-9&dialog=upload',
    { upload: { chatId: 'chat-9', files: token } },
    notebook
  );
  assert.equal(textOf(find(view, 'DialogTitle')[0]), 'Add a worksheet');
  assert.match(textOf(view.root), /notes\.pdf/);
  await act(async () => button(view, 'Add worksheet').props.onClick());
  await settle();
  assert.deepEqual(
    calls.find(([name]) => name === 'attachMaterial'),
    ['attachMaterial', 'child-1', 'chat-9', 'material-new']
  );
  // Closing steps back over the dialog's entry, to the Notebook with its chat.
  assert.equal(where.path, notebook);
  assert.equal(find(view, 'DialogTitle').length, 0);
});

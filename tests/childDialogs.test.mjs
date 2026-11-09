// The child's dialogs (Phase 1.38 design §3.5), drawn with React: Edit details' words, fields and errors under their
// field, Remove apart from the foot, its confirm's words, saving and removing; and Add a child keeping today's words.
// Area: family
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const require = createRequire(import.meta.url);
const React = require('react');
const { act, create } = require('react-test-renderer');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// MUI as plain elements (a closed dialog still draws its insides, so tests read `open`), a navigate that records where
// it went, and `phone` as the phone media query's answer.
const went = [];
let phone = false;
const mui = ['Alert', 'Button', 'Dialog', 'DialogActions', 'DialogContent', 'DialogContentText', 'DialogTitle'];
const packages = {
  react: React,
  'react/jsx-runtime': require('react/jsx-runtime'),
  '@mui/material': {
    ...Object.fromEntries([...mui, 'FormHelperText', 'TextField', 'Typography'].map((name) => [name, name])),
    useMediaQuery: () => phone,
  },
  'react-router-dom': { useNavigate: () => (to, options) => went.push([to, options]) },
};
// Stand-ins: the parent, the cache and the API client (both record what they're asked), the dialog address (`dialog`
// is the open one; show and hide are recorded), MUI's icons and the CSS.
const standIns = {
  useAuth: "export const useAuth = () => ({ user: { id: 'parent-1' } });",
  queryCache:
    'export const sessionGeneration = () => 3;' +
    ' export const queryClient = { setQueryData: () => {}, invalidateQueries: async () => {} };',
  api:
    'export const calls = []; const call = (method) => async (url, body) => (calls.push([method, url, body]), { data: {} });' +
    " export default { get: call('get'), put: call('put'), patch: call('patch'), delete: call('delete') };",
  useDialogParam:
    "export const address = { dialog: '', log: [] };" +
    ' export const openAt = () => true; export const useLiveLocation = () => ({ current: {} });' +
    ' export default (name) => [address.dialog === name, () => address.log.push(["show", name]),' +
    ' () => address.log.push(["hide", name])];',
  css: '',
};
const bundle = await build({
  stdin: {
    contents: `export { default } from './src/areas/family/child/ChildDialogs';
export { calls } from './src/services/api';
export { address } from './src/areas/family/useDialogParam';`,
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
        build.onResolve({ filter: /(^|\/)(useAuth|queryCache|api|useDialogParam)$|\.css$/ }, (args) => ({
          path: args.path.endsWith('.css') ? 'css' : args.path.split('/').pop(),
          namespace: 'stand-in',
        }));
        build.onLoad({ filter: /.*/, namespace: 'stand-in' }, (args) => ({ contents: standIns[args.path] }));
      },
    },
  ],
});
const dialogs = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(
  (id) => packages[id],
  dialogs,
  dialogs.exports
);
const { default: ChildDialogs, calls, address } = dialogs.exports;

const sam = { id: 'child-1', displayName: 'Sam', gradeLevel: 'Year 4', notes: 'Finds reading aloud hard' };
const mia = { id: 'child-2', displayName: 'Mia', gradeLevel: 'Year 1', notes: '' };

async function open(dialog) {
  address.dialog = dialog;
  address.log.length = 0;
  calls.length = 0;
  went.length = 0;
  let view;
  await act(async () => {
    view = create(React.createElement(ChildDialogs, { child: sam, children: [sam, mia] }));
  });
  return view;
}
const find = (view, match) => view.root.findAll((node) => typeof node.type === 'string' && match(node));
const textOf = (node) => (typeof node === 'string' ? node : node.children.map(textOf).join(''));
const byType = (view, type) => find(view, (node) => node.type === type);
const byMst = (view, name) => find(view, (node) => node.props['data-mst'] === name)[0];
const field = (view, label) => byType(view, 'TextField').find((node) => node.props.label.startsWith(label));
const button = (node, words) => node.findAll((item) => item.type === 'Button' && textOf(item) === words)[0];

test("Edit details: the child's name in its words, the three fields, and Cancel and Save changes in the foot", async () => {
  const view = await open('edit-child');
  const [edit, confirm] = byType(view, 'Dialog');
  assert.deepEqual([edit.props.open, confirm.props.open, edit.props.fullScreen], [true, false, false]);
  assert.equal(textOf(byType(view, 'DialogTitle')[0]), 'Edit Sam’s details');
  assert.equal(field(view, 'First name').props.value, 'Sam');
  const notes = field(view, 'Anything');
  assert.deepEqual(
    [notes.props.label, notes.props.helperText, notes.props.value, notes.props.minRows],
    ['Anything to know about Sam? (optional)', 'Helps the AI pitch quizzes and answers at Sam’s level.', sam.notes, 3]
  );
  // School year: 13 pills, one choice.
  const years = find(view, (node) => node.props.role === 'radio');
  assert.deepEqual([years.length, years[0].children.join(''), years[12].children.join('')], [13, 'Year 1', 'Year 13']);
  assert.deepEqual(
    years.filter((year) => year.props['aria-checked']).map((year) => year.children.join('')),
    ['Year 4']
  );
  const foot = byType(view, 'DialogActions')[0];
  assert.ok(button(foot, 'Cancel') && button(foot, 'Save changes'));
  // Remove sits apart at the end of the form, not in the foot.
  const remove = byMst(view, 'family-remove-child');
  assert.deepEqual([textOf(remove), remove.props.startIcon.type], ['Remove Sam', 'PersonRemoveOutlined']);
  assert.equal(remove.parent.props.className, 'fam-cf-remove');
  assert.equal(button(foot, 'Remove Sam'), undefined);
});

test('a missing answer is said under its field, and nothing is saved', async () => {
  const view = await open('edit-child');
  await act(async () => field(view, 'First name').props.onChange({ target: { value: '  ' } }));
  await act(async () => byMst(view, 'family-save-child').props.onClick());
  const name = field(view, 'First name');
  assert.deepEqual([name.props.error, name.props.helperText], [true, 'Add Sam’s first name.']);
  assert.equal(find(view, (node) => node.props.role === 'alert').length, 0);
  assert.deepEqual(calls, []);
});

test('Save changes saves the name, year and note, then closes', async () => {
  const view = await open('edit-child');
  await act(async () => field(view, 'First name').props.onChange({ target: { value: 'Samuel ' } }));
  const years = find(view, (node) => node.props.role === 'radio');
  await act(async () => years[4].props.onClick());
  await act(async () => byMst(view, 'family-save-child').props.onClick());
  assert.deepEqual(calls, [
    [
      'patch',
      '/api/parent/settings/manual-learners/child-1',
      { displayName: 'Samuel', gradeLevel: 'Year 5', notes: 'Finds reading aloud hard' },
    ],
  ]);
  assert.deepEqual(address.log, [['hide', 'edit-child']]);
});

test("Remove asks first, in design's words, then archives the child and opens the next child's page", async () => {
  const view = await open('edit-child');
  await act(async () => byMst(view, 'family-remove-child').props.onClick());
  assert.deepEqual(address.log, [['show', 'remove-child']]);
  const confirmView = await open('remove-child');
  const [edit, confirm] = byType(confirmView, 'Dialog');
  // The edit dialog stays open under its confirm.
  assert.deepEqual([edit.props.open, confirm.props.open], [true, true]);
  assert.equal(textOf(confirm.findAll((node) => node.type === 'DialogTitle')[0]), 'Remove Sam from parent mode?');
  assert.equal(
    textOf(confirm.findAll((node) => node.type === 'DialogContentText')[0]),
    'Sam’s page and lists go away. Sam’s homework checks, chats and activities stay saved on MySmartTeach, but you won’t see them in parent mode.'
  );
  const keep = button(confirm, 'Keep Sam');
  const removeButton = byMst(confirmView, 'family-confirm-remove');
  assert.equal(keep.props.variant, undefined);
  assert.deepEqual(
    [textOf(removeButton), removeButton.props.color, removeButton.props.variant],
    ['Remove Sam', 'error', 'contained']
  );
  await act(async () => removeButton.props.onClick());
  assert.deepEqual(calls, [['delete', '/api/parent/settings/manual-learners/child-1', undefined]]);
  assert.deepEqual(went, [['/family/children/child-2', { replace: true }]]);
});

test('Add a child says what it needs, then what is missing under each field, and is a full-screen sheet on phones', async () => {
  phone = true;
  const view = await open('add-child');
  phone = false;
  const [add] = byType(view, 'Dialog');
  assert.deepEqual([add.props.open, add.props.fullScreen], [true, true]);
  assert.equal(textOf(byType(view, 'DialogTitle')[0]), 'Add a child');
  assert.equal(
    textOf(find(view, (node) => node.props.className === 'fam-dialog-sub')[0]),
    'Their first name and school year are all you need.'
  );
  const notes = field(view, 'Anything');
  assert.deepEqual(
    [notes.props.label, notes.props.placeholder, notes.props.helperText],
    [
      'Anything to know about them? (optional)',
      'For example: finds fractions tricky',
      'Helps the AI pitch quizzes and answers at your child’s level.',
    ]
  );
  assert.equal(byMst(view, 'family-remove-child'), undefined);
  await act(async () => byMst(view, 'family-save-child').props.onClick());
  assert.equal(textOf(byMst(view, 'family-save-child')), 'Add child');
  const name = field(view, 'First name');
  assert.deepEqual([name.props.error, name.props.helperText], [true, 'Add your child’s first name.']);
  assert.deepEqual(find(view, (node) => node.type === 'FormHelperText' && node.props.error).map(textOf), [
    'Choose your child’s school year.',
  ]);
  assert.deepEqual(find(view, (node) => node.props.role === 'alert').length, 0);
  assert.deepEqual(calls, []);
});

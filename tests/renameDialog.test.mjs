// The rename window (Phase 1.46 S1.4, SOT-1.4, SOT-19's X3): the list's cached row takes the new name before the
// window closes, so the card shows it at once, for a quiz and for an assessment; a refused rename changes nothing.
// Area: academics
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const require = createRequire(import.meta.url);
const React = require('react');
const { act, create } = require('react-test-renderer');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// MUI as plain elements, with a Dialog that shows its content only while open.
const mui = { Dialog: ({ open, children }) => (open ? children : null) };
for (const name of ['Alert', 'Button', 'DialogActions', 'DialogContent', 'DialogTitle', 'TextField']) mui[name] = name;
const packages = { react: React, 'react/jsx-runtime': require('react/jsx-runtime'), '@mui/material': mui };
// Stand-ins that write to one log, so the order of the rename, the cache update and the close shows: the rename
// service answers as the server does ({ id, name }), or refuses; the cache records each update.
const standIns = {
  log: 'export const log = []; export const fail = { detail: null };',
  activityService: `import { log, fail } from 'log';
export const renameActivity = async (kind, id, name) => {
  log.push(['rename', kind, id, name]);
  if (fail.detail) throw { response: { data: { detail: fail.detail } } };
  return { id, name };
};`,
  queryCache:
    "import { log } from 'log'; export const queryClient = { setQueriesData: (...args) => log.push(['cache', ...args]) };",
};
// Which cached queries an update reaches: teacher lists are keyed ['teacher', session, user, family].
const reaches = (filters) =>
  [
    ['teacher', 0, 'teacher-1', 'quizzes'],
    ['teacher', 3, 'teacher-2', 'quizzes'],
    ['teacher', 0, 'teacher-1', 'assessments'],
    ['teacher', 0, 'teacher-1', 'class', 'c-1'],
    ['family', 0, 'parent-1', 'quizzes'],
  ]
    .filter((queryKey) => filters.predicate({ queryKey }))
    .map((queryKey) => queryKey.join(' '));
const bundle = await build({
  stdin: {
    contents: `export { default as RenameActivityDialog } from './src/components/common/RenameActivityDialog';
export { log, fail } from 'log';`,
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
        build.onResolve({ filter: /(^|\/)(activityService|queryCache|log)$/ }, (args) => ({
          path: args.path.split('/').pop(),
          namespace: 'stand-in',
        }));
        build.onLoad({ filter: /.*/, namespace: 'stand-in' }, (args) => ({ contents: standIns[args.path] }));
      },
    },
  ],
});
const loaded = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)((id) => packages[id], loaded, loaded.exports);
const { RenameActivityDialog, log, fail } = loaded.exports;

// Opens the window for an item, types the new name and presses Save name (the form's submit).
async function rename(item, typed, onSaved) {
  log.length = 0;
  let view;
  await act(async () => {
    view = create(React.createElement(RenameActivityDialog, { item, onClose: () => log.push(['close']), onSaved }));
  });
  const field = view.root.findAll((node) => node.type === 'TextField')[0];
  await act(async () => field.props.onChange({ target: { value: typed } }));
  const dialog = view.root.findAll((node) => node.type === mui.Dialog)[0];
  await act(async () => dialog.props.PaperProps.onSubmit({ preventDefault() {} }));
  return view;
}

test("X3: a renamed quiz is renamed in the list's cache before the window closes", async () => {
  await rename({ kind: 'quiz', id: 'q-2', name: 'Forces' }, '  Forces and motion ');
  assert.deepEqual(
    log.map(([step]) => step),
    ['rename', 'cache', 'close']
  );
  assert.deepEqual(log[0], ['rename', 'quiz', 'q-2', 'Forces and motion']);
  const [, filters, update] = log[1];
  assert.deepEqual(reaches(filters), ['teacher 0 teacher-1 quizzes', 'teacher 3 teacher-2 quizzes']);
  const quizzes = [
    { id: 'q-1', title: 'Cells', display_title: 'Cells', quiz_phase: 'normal' },
    { id: 'q-2', title: 'Forces', display_title: 'Pre - Forces', quiz_phase: 'pre' },
  ];
  const rows = update(quizzes);
  // The list shows "Pre - Forces and motion" from the title and the phase, as the server's display title does.
  assert.deepEqual(rows[1], { id: 'q-2', title: 'Forces and motion', display_title: null, quiz_phase: 'pre' });
  assert.equal(rows[0], quizzes[0]);
  assert.equal(update(undefined), undefined); // a list that hasn't loaded stays so
});

test('X3 on the new quiz library: the window hands the new name to onSaved before it closes', async () => {
  await rename({ kind: 'quiz', id: 'q-2', name: 'Forces' }, '  Forces and motion ', (name) =>
    log.push(['saved', name])
  );
  assert.deepEqual(log.slice(2), [['saved', 'Forces and motion'], ['close']]);
});

test("an assessment is renamed in the assessments list's cache", async () => {
  await rename({ kind: 'assessment', id: 'a-7', name: 'Mock paper 1' }, 'Mock paper 1 (Nov)');
  const [, filters, update] = log[1];
  assert.deepEqual(reaches(filters), ['teacher 0 teacher-1 assessments']);
  assert.deepEqual(update([{ id: 'a-7', assessmentName: 'Mock paper 1', status: 'Completed' }]), [
    { id: 'a-7', assessmentName: 'Mock paper 1 (Nov)', status: 'Completed' },
  ]);
  assert.equal(log[2][0], 'close');
});

test('a refused rename changes no cache, says why and keeps the window open', async () => {
  fail.detail = 'This quiz is running, so it keeps its name until the run ends.';
  try {
    const view = await rename({ kind: 'quiz', id: 'q-1', name: 'Cells' }, 'Cells 2');
    assert.deepEqual(
      log.map(([step]) => step),
      ['rename']
    );
    const alert = view.root.findAll((node) => node.type === 'Alert')[0];
    assert.equal(alert.props.children, fail.detail);
  } finally {
    fail.detail = null;
  }
});

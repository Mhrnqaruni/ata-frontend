// The student-group results panel says "Student groups" words (Phase 1.46; SOT-14 W2; design.md §5): no "tag" and
// no never-shown word on screen, closed, open with results, or open with none.
// Area: academics
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const require = createRequire(import.meta.url);
const React = require('react');
const { act, create } = require('react-test-renderer');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// MUI as plain elements whose props the tests read.
const mui = {};
for (const name of [
  'Accordion',
  'AccordionDetails',
  'AccordionSummary',
  'Alert',
  'Autocomplete',
  'Table',
  'TableBody',
  'TableCell',
  'TableContainer',
  'TableHead',
  'TableRow',
  'TextField',
  'Typography',
])
  mui[name] = name;
const packages = { react: React, 'react/jsx-runtime': require('react/jsx-runtime'), '@mui/material': mui };
const standIns = {
  tagService: `export default { analytics: async () => globalThis.groupResults };`,
  icon: 'export default function Icon() { return null; }',
};
const bundle = await build({
  stdin: {
    contents: `export { default } from './src/components/tags/TagAnalytics';
export { neverShownIn } from './src/areas/quizzes/words';`,
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
        build.onResolve({ filter: /(^|\/)tagService$|^@mui\/icons-material\// }, (args) => ({
          path: args.path.startsWith('@mui/') ? 'icon' : 'tagService',
          namespace: 'stand-in',
        }));
        build.onLoad({ filter: /.*/, namespace: 'stand-in' }, (args) => ({ contents: standIns[args.path] }));
      },
    },
  ],
});
const loaded = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)((id) => packages[id], loaded, loaded.exports);
const { default: TagAnalytics, neverShownIn } = loaded.exports;

const textOf = (node) => {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (node == null) return '';
  return (Array.isArray(node) ? node : node.children || []).map(textOf).join('');
};
// Everything a teacher sees or hears: the text, the field's label and the table's name.
function onScreen(view) {
  const field = view.root.findAll((node) => node.type === 'Autocomplete')[0];
  const label = field ? field.props.renderInput({}).props.label : '';
  const names = view.root.findAll((node) => node.props['aria-label']).map((node) => node.props['aria-label']);
  return [textOf(view.toJSON()), label, ...names].join(' | ');
}
async function openPanel(results) {
  globalThis.groupResults = results;
  let view;
  await act(async () => {
    view = create(React.createElement(TagAnalytics, { activityId: 'run-1' }));
  });
  const closed = onScreen(view);
  await act(async () => view.root.findAll((node) => node.type === 'Accordion')[0].props.onChange(null, true));
  return { closed, open: onScreen(view) };
}
const results = {
  tags: [{ id: 'g1', name: 'Reading club' }],
  distinct_students: 2,
  participated: 2,
  expected: 2,
  scored: 2,
  average_percentage: 70,
  rows: [
    {
      kind: 'quiz',
      activity_id: 'run-1',
      student_id: 's1',
      name: 'Ada',
      school_id: 'S-1',
      classes: [{ name: '8B' }],
      title: 'Cells',
      percentage: 80,
      participated: true,
    },
    {
      kind: 'quiz',
      activity_id: 'run-1',
      student_id: 's2',
      name: 'Ben',
      school_id: 'S-2',
      classes: [{ name: '8B' }],
      title: 'Cells',
      percentage: null,
      participated: false,
    },
  ],
};

test('closed and open with results: Student groups words only', async () => {
  const { closed, open } = await openPanel(results);
  assert.match(closed, /^Results by student group/);
  assert.match(open, /Filter groups \(any chosen\)/);
  assert.match(open, /Ada · S-1/);
  for (const text of [closed, open]) {
    assert.deepEqual(neverShownIn(text), [], text);
    assert.doesNotMatch(text, /\btags?\b/i, text);
  }
});

test('open with no results yet', async () => {
  const { open } = await openPanel({ ...results, rows: [], distinct_students: 0 });
  assert.match(open, /No group results yet\./);
  assert.deepEqual(neverShownIn(open), []);
  assert.doesNotMatch(open, /\btags?\b/i);
});

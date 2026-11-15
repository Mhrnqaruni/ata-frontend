// The class chooser window and AudienceSelector (Phase 1.46 S3.3, SOT-11; design.md §3.3): at 200 classes, Recent
// first, the year groups, the search, the keys, ticks and "3 selected · Clear", groups, and the same value back.
// Area: academics
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const require = createRequire(import.meta.url);
const React = require('react');
const { act, create } = require('react-test-renderer');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.document = { getElementById: () => null }; // the window scrolls the row moved to into view

// MUI as plain elements whose props the tests read; the window shows its content only while open.
const mui = { Dialog: ({ open, children }) => (open ? children : null) };
for (const name of [
  'Accordion',
  'AccordionDetails',
  'AccordionSummary',
  'Alert',
  'Box',
  'Button',
  'ButtonBase',
  'Checkbox',
  'Chip',
  'FormControl',
  'IconButton',
  'InputAdornment',
  'InputLabel',
  'Link',
  'MenuItem',
  'Select',
  'Skeleton',
  'Tab',
  'Tabs',
  'TextField',
  'Typography',
])
  mui[name] = name;
const packages = {
  react: React,
  'react/jsx-runtime': require('react/jsx-runtime'),
  'react-router-dom': require('react-router-dom'),
  '@mui/material': mui,
};
// 200 classes and 2 student groups from the teacher's cache, and a preview service that records what it's asked.
const classes = [];
for (const year of [7, 8, 9, 10, 11])
  for (const set of 'ABCDEFGH')
    for (const subject of ['Science', 'Maths', 'English', 'History', 'Geography'])
      classes.push({
        id: `c${classes.length}`,
        name: `${year}${set} ${subject}`,
        studentCount: 20 + (classes.length % 10),
      });
const groups = [
  { id: 'g1', name: 'Reading club', count: 12 },
  { id: 'g2', name: 'Exam access', count: 1 },
];
const standIns = {
  useTeacherData: `export const useTeacherData = (family) => ({
  data: family === 'classes' ? globalThis.teacherClasses : { tags: globalThis.teacherGroups },
  isPending: false, isError: false, refetch() {},
});`,
  tagService: `export const asked = [];
export default { preview: async (selection) => (asked.push(selection), { count: 2, students: [
  { id: 's1', name: 'Ada', studentId: 'S-1', classes: [{ id: 'c40', name: '8A English' }] },
  { id: 's2', name: 'Ben', studentId: 'S-2', classes: [{ id: 'c41', name: '8A Geography' }] }] }) };`,
  icon: 'export default function Icon() { return null; }',
};
globalThis.teacherClasses = classes;
globalThis.teacherGroups = groups;
const bundle = await build({
  stdin: {
    contents: `export { default as ClassChooser } from './src/components/tags/ClassChooser';
export { default as AudienceSelector } from './src/components/tags/AudienceSelector';
export { asked } from 'tagService';`,
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
        build.onResolve({ filter: /(^|\/)(useTeacherData|tagService)$|^@mui\/icons-material\// }, (args) => ({
          path: args.path.startsWith('@mui/') ? 'icon' : args.path.split('/').pop(),
          namespace: 'stand-in',
        }));
        build.onLoad({ filter: /.*/, namespace: 'stand-in' }, (args) => ({ contents: standIns[args.path] }));
      },
    },
  ],
});
const loaded = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)((id) => packages[id], loaded, loaded.exports);
const { ClassChooser, AudienceSelector, asked } = loaded.exports;

const textOf = (node) => {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (node == null) return '';
  return (Array.isArray(node) ? node : node.children || []).map(textOf).join('');
};
const all = (view, type) => (view.root ?? view).findAll((node) => node.type === type);
const options = (view) => view.root.findAll((node) => node.props.role === 'option' && typeof node.type === 'string');
const heads = (view) => view.root.findAll((node) => node.props.role === 'presentation').map((node) => textOf(node));
async function render(element) {
  let view;
  await act(async () => {
    view = create(element);
  });
  return view;
}
const field = (view) => all(view, 'TextField')[0];
const type = (view, text) => act(async () => field(view).props.onChange({ target: { value: text } }));
const key = (view, name) => act(async () => field(view).props.onKeyDown({ key: name, preventDefault() {} }));
const foot = (view) => textOf(all(view, 'Typography').find((node) => /selected$/.test(textOf(node))));

test('at 200 classes: Recent first, then each year, every class with its pupils', async () => {
  const view = await render(
    React.createElement(ClassChooser, {
      open: true,
      value: null,
      recentClassIds: ['c41', 'gone', 'c7'],
      onClose() {},
      onDone() {},
    })
  );
  assert.equal(textOf(all(view, 'Typography')[0]), 'Choose classes');
  assert.deepEqual(heads(view), ['Recent', 'Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11']);
  const rows = options(view);
  assert.equal(rows.length, 202); // the 2 recent classes, then all 200
  assert.deepEqual(
    rows.slice(0, 2).map((row) => textOf(row)),
    ['8A Maths21 pupils', '7B English27 pupils']
  );
  assert.equal(field(view).props.placeholder, 'Search classes');
  assert.deepEqual(
    all(view, 'Tab').map((tab) => tab.props.label),
    ['Classes', 'Student groups']
  );
  // New assessment gives no Recent.
  const plain = await render(React.createElement(ClassChooser, { open: true, value: null, onClose() {}, onDone() {} }));
  assert.equal(heads(plain)[0], 'Year 7');
});

test('typing "8B" finds its 5 classes; ↓ and Space tick one; Enter is Done with the same value shape', async () => {
  const done = [];
  const view = await render(
    React.createElement(ClassChooser, {
      open: true,
      value: { class_ids: ['c3'], tag_ids: ['g2'], mode: 'filter' },
      onClose() {},
      onDone: (value) => done.push(value),
    })
  );
  await type(view, '8B');
  assert.equal(options(view).length, 5);
  assert.ok(options(view).every((row) => textOf(row).startsWith('8B ')));
  assert.equal(textOf(all(view, 'Typography').find((node) => node.props.role === 'status')), '5 found');
  await key(view, 'ArrowDown');
  await key(view, 'ArrowDown');
  assert.equal(field(view).props.inputProps['aria-activedescendant'], options(view)[1].props.id);
  await key(view, ' ');
  assert.equal(options(view)[1].props['aria-selected'], true);
  assert.equal(foot(view), '3 selected');
  await key(view, 'Enter');
  assert.deepEqual(done, [{ class_ids: ['c3', 'c49'], tag_ids: ['g2'], mode: 'filter' }]);
});

test('ticks by click, "3 selected · Clear", no match, and the groups tab with its pupils', async () => {
  const view = await render(React.createElement(ClassChooser, { open: true, value: null, onClose() {}, onDone() {} }));
  for (const index of [0, 1, 2]) await act(async () => options(view)[index].props.onClick());
  assert.equal(foot(view), '3 selected');
  assert.ok(all(view, 'Button').some((button) => textOf(button) === 'Clear'));
  await act(async () =>
    all(view, 'Button')
      .find((button) => textOf(button) === 'Clear')
      .props.onClick()
  );
  assert.equal(foot(view), '0 selected');
  await type(view, '10Z');
  assert.match(textOf(view.toJSON()), /No class matches ‘10Z’/);
  await act(async () => all(view, 'Tabs')[0].props.onChange(null, 'groups'));
  assert.equal(field(view).props.value, '');
  assert.deepEqual(
    options(view).map((row) => textOf(row)),
    ['Exam access1 pupil', 'Reading club12 pupils']
  );
});

test('a tick past the 100 an audience holds is refused, and says so', async () => {
  const hundred = classes.slice(0, 100).map((c) => c.id);
  const view = await render(
    React.createElement(ClassChooser, {
      open: true,
      value: { class_ids: hundred, tag_ids: [] },
      onClose() {},
      onDone() {},
    })
  );
  const spare = options(view).find((row) => row.props['aria-selected'] === false);
  await act(async () => spare.props.onClick());
  assert.equal(foot(view), '100 selected');
  assert.match(textOf(view.toJSON()), /Up to 100 classes/);
});

test('AudienceSelector keeps its props and value: the field opens the window, Done changes it, the preview follows', async () => {
  const changes = [];
  const previews = [];
  const props = { value: null, onChange: (v) => changes.push(v), onPreview: (d) => previews.push(d) };
  const view = await render(React.createElement(AudienceSelector, props));
  assert.match(textOf(view.toJSON()), /Classes and student groupsChoose classes/);
  assert.equal(all(view, 'TextField').length, 0); // the window is shut
  await act(async () => all(view, 'ButtonBase')[0].props.onClick());
  for (const index of [40, 41]) await act(async () => options(view)[index].props.onClick());
  await act(async () =>
    all(view, 'Button')
      .find((button) => textOf(button) === 'Done')
      .props.onClick()
  );
  assert.deepEqual(changes, [{ mode: 'union', class_ids: ['c42', 'c44'], tag_ids: [] }]);
  assert.equal(all(view, 'TextField').length, 0); // and shut again
  // The page gives the new value back; the field shows the classes, and the server's preview comes through.
  await act(async () => view.update(React.createElement(AudienceSelector, { ...props, value: changes[0] })));
  assert.deepEqual(
    all(view, 'Chip').map((chip) => chip.props.label),
    ['8A English', '8A Geography']
  );
  assert.deepEqual(asked.at(-1), { class_ids: ['c42', 'c44'], tag_ids: [], mode: 'union' });
  assert.equal(previews.at(-1).count, 2);
  assert.match(textOf(view.toJSON()), /2 students · See who/);
});

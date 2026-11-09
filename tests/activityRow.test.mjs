// Parent mode's list rows (Phase 1.38; design §1.6): the words for each state and the date line, and the row as it
// draws: a link to its address, the New chip, one status at the right, the kind's tile, the spinner, Add the missing
// pages beside the link, and Mark it.
// Area: family
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { dateLine, rowStatus, savedLine, savedTitle } from '../src/areas/family/lists/rowWords.js';

const require = createRequire(import.meta.url);
const React = require('react');
const { act, create } = require('react-test-renderer');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// The row's packages: React as it is, and MUI's parts, the router's Link and the icons as plain elements, as in
// familySourceRecovery.test.cjs. Its CSS is left out. The frontend's files are ES modules, so the bundle reads a
// package's default export as Node does, as the whole module: an icon's stand-in is the component itself, an svg
// that keeps the icon's name.
const packages = {
  react: React,
  'react/jsx-runtime': require('react/jsx-runtime'),
  '@mui/material': { Button: 'Button', Chip: 'Chip', CircularProgress: 'CircularProgress' },
  'react-router-dom': { Link: 'Link' },
};
const icon = (id) => (props) => React.createElement('svg', { ...props, 'data-icon': id.split('/').pop() });
const bundle = await build({
  entryPoints: ['src/areas/family/lists/ActivityRow.jsx'],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  jsx: 'automatic',
  write: false,
  logLevel: 'error',
  external: [...Object.keys(packages), '@mui/icons-material/*'],
  plugins: [
    {
      name: 'no-css',
      setup(build) {
        build.onResolve({ filter: /\.css$/ }, () => ({ path: 'css', namespace: 'stand-in' }));
        build.onLoad({ filter: /.*/, namespace: 'stand-in' }, () => ({ contents: '' }));
      },
    },
  ],
});
const rows = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(
  (id) => packages[id] ?? icon(id),
  rows,
  rows.exports
);
const { default: ActivityRow, UnmarkedRow } = rows.exports;

// List items as the activity list sends them (SOT B4), dated in an earlier year so the row's date line is fixed.
const AT = '2025-11-07T09:00:00+00:00';
const item = (kind, status, summary = null) => ({
  id: `${kind}-${status}`,
  kind,
  title: `My ${kind}`,
  status,
  createdAt: AT,
  finishedAt: ['queued', 'running'].includes(status) ? null : AT,
  settings: { madeFrom: null },
  summary,
});
const tried = (latest) => ({
  attempts: latest ? 1 : 0,
  latest,
  best: latest && { score: latest.score, total: latest.total },
});
const marked = { right: 4, notQuite: 1, toCheck: 1, total: 6 };
const TO = '/family/children/c1/homework/check-completed';

async function render(type, props) {
  let view;
  await act(async () => {
    view = create(React.createElement(type, props));
  });
  return view;
}
// The drawn elements that pass `match`, the ones with a class or a type, the chips' words, and an element's text.
const find = (view, match) => view.root.findAll((node) => typeof node.type === 'string' && match(node));
const byClass = (view, name) => find(view, (node) => node.props.className === name);
const byType = (view, type) => find(view, (node) => node.type === type);
const chips = (view) => byType(view, 'Chip').map((chip) => chip.props.label);
const textOf = (node) => (typeof node === 'string' ? node : node.children.map(textOf).join(''));

test('the words for each state: one status, and none for a finished item with nothing to say (design §1.6)', () => {
  const words = (row) => [rowStatus(row).state, rowStatus(row).text];
  assert.deepEqual(words(item('quiz', 'running')), ['making', 'Making… about a minute']);
  assert.deepEqual(words(item('story', 'queued')), ['making', 'Making… about a minute']);
  assert.deepEqual(words(item('check', 'running')), ['making', 'Marking… about a minute']);
  assert.deepEqual(words(item('quiz', 'completed', tried(null))), ['untried', 'Not tried yet']);
  assert.deepEqual(words(item('quiz', 'completed', tried({ score: 4, total: 5, at: AT }))), ['scored', '4 of 5 right']);
  assert.deepEqual(words(item('check', 'completed', marked)), ['scored', '4 of 6 right']);
  // "Ready" is gone, because every finished item would say it.
  for (const kind of ['flashcards', 'mindmap', 'story', 'learn']) {
    assert.deepEqual(words(item(kind, 'completed')), ['done', ''], kind);
  }
  // A check that needs pages says so in its line (design §5.3), so its status chip is empty.
  assert.deepEqual(words(item('check', 'needs_input')), ['pages', '']);
  for (const status of ['failed', 'outcome_unknown', 'cancelled']) {
    assert.deepEqual(words(item('story', status)), ['failed', 'Didn’t finish'], status);
  }
});

test('the date line says what its time means: made, marked, started or sent (design §1.6, §5.3)', () => {
  // Built from local times, so the lines hold in any time zone. A finished row's line uses its finish and an
  // unfinished one's its start, so each row's other time is set far off.
  const now = new Date(2026, 10, 8, 18, 30);
  const at = (...parts) => new Date(...parts).toISOString();
  const done = (kind, status, ...parts) => ({ kind, status, createdAt: at(2020, 0, 1), finishedAt: at(...parts) });
  const begun = (kind, status, ...parts) => ({ kind, status, createdAt: at(...parts), finishedAt: at(2030, 0, 1) });
  assert.equal(dateLine(done('quiz', 'completed', 2026, 10, 8, 10, 15), { now }), 'Made today at 10:15');
  assert.equal(dateLine(done('story', 'completed', 2026, 10, 7, 18, 40), { now }), 'Made yesterday at 18:40');
  assert.equal(dateLine(done('check', 'completed', 2026, 10, 3, 9, 0), { now }), 'Marked 3 Nov');
  assert.equal(dateLine(done('check', 'needs_input', 2026, 10, 3, 9, 0), { now }), 'Needs more pages');
  assert.equal(dateLine(begun('check', 'failed', 2026, 10, 3, 9, 0), { now }), 'Couldn’t be marked');
  // While it's being made, or when it didn't finish: when it started.
  assert.equal(dateLine(begun('mindmap', 'running', 2026, 10, 8, 18, 29), { now }), 'Started today at 18:29');
  assert.equal(dateLine(begun('story', 'failed', 2025, 10, 7, 9, 0), { now }), 'Started 7 Nov 2025');
  // A saved upload: photos are named by their day, and the line says they wait for marking (design §5.3).
  const photo = { name: 'IMG_1.jpg', mime: 'image/jpeg' };
  assert.equal(savedTitle({ files: [photo], createdAt: at(2026, 9, 28, 9, 0) }, now), 'Photo from 28 Oct');
  assert.equal(
    savedTitle({ files: [photo, photo], createdAt: at(2026, 10, 8, 16, 20) }, now),
    'Photos from today at 16:20'
  );
  assert.equal(savedLine({ files: [photo, photo] }), '2 photos, saved but not marked');
  assert.equal(savedLine({ files: [{ name: 'sheet.pdf', mime: 'application/pdf' }] }), '1 file, saved but not marked');
  assert.equal(dateLine({ kind: 'quiz', status: 'completed' }, { now }), '');
  // In a list that mixes kinds, the kind comes first (design §2.3).
  const mixed = { withKind: true, now };
  assert.equal(dateLine(done('check', 'completed', 2026, 10, 8, 16, 20), mixed), 'Homework · marked today at 16:20');
  assert.equal(dateLine(done('quiz', 'completed', 2026, 10, 8, 10, 15), mixed), 'Quiz · made today at 10:15');
  assert.equal(dateLine(begun('story', 'running', 2026, 10, 8, 18, 29), mixed), 'Story · started today at 18:29');
});

test('a row is a link to its address, with its title, date line, New chip and score, and no tile', async () => {
  const check = item('check', 'completed', marked);
  const view = await render(ActivityRow, { item: check, to: TO, from: '/family/children/c1/homework', isNew: true });
  const [link] = byType(view, 'Link');
  assert.deepEqual([link.props.to, link.props.state], [TO, { from: '/family/children/c1/homework' }]);
  assert.equal(link.props.className, 'mst-list-row home-row-button fam-list-link');
  // Heard as "My check, new"; the chip is seen, not heard.
  assert.equal(textOf(byClass(view, 'mst-list-title')[0]), 'My check, new');
  assert.equal(textOf(byClass(view, 'mst-list-meta')[0]), 'Marked 7 Nov 2025');
  const [chip] = byType(view, 'Chip');
  assert.deepEqual([chip.props.label, chip.props['aria-hidden']], ['New', true]);
  const [score] = byClass(view, 'fam-list-status');
  assert.deepEqual([textOf(score), score.props['data-tone']], ['4 of 6 right', undefined]);
  // A one-kind list has no tile, and the ✓ ! ? counts are gone.
  assert.deepEqual([byClass(view, 'mst-tile').length, link.props['data-tile']], [0, undefined]);
  assert.doesNotMatch(JSON.stringify(view.toJSON()), /✓/);
  const plain = await render(ActivityRow, { item: check, to: TO });
  // Not new: only the "to look at" chip of a marked check with answers to look at (design §5.3).
  assert.deepEqual([chips(plain), byClass(plain, 'fam-sr').length], [['2 to look at'], 0]);
});

test('never New with Not tried yet; a finished set shows New until it is opened, then nothing', async () => {
  const untried = await render(ActivityRow, { item: item('quiz', 'completed', tried(null)), to: TO, isNew: true });
  assert.deepEqual([chips(untried), byClass(untried, 'fam-sr').length], [['Not tried yet'], 0]);
  const cards = item('flashcards', 'completed');
  const fresh = await render(ActivityRow, { item: cards, to: TO, isNew: true });
  assert.deepEqual(chips(fresh), ['New']);
  const opened = await render(ActivityRow, { item: cards, to: TO });
  assert.deepEqual([chips(opened), textOf(byClass(opened, 'fam-list-end')[0])], [[], '']);
});

test('a row in a list that mixes kinds shows its kind tile, with the Outlined icon, and its kind first', async () => {
  const view = await render(ActivityRow, { item: item('story', 'completed'), to: TO, showKind: true });
  const [tile] = byClass(view, 'mst-tile');
  assert.deepEqual([tile.props['data-size'], tile.findByType('svg').props['data-icon']], ['sm', 'AutoStoriesOutlined']);
  assert.equal(textOf(byClass(view, 'mst-list-meta')[0]), 'Story · made 7 Nov 2025');
  // The phone's two-line layout keeps a column for the tile.
  assert.equal(byType(view, 'Link')[0].props['data-tile'], '');
});

test('a row being made shows the spinner and its words, and when it started', async () => {
  const story = await render(ActivityRow, { item: item('story', 'running'), to: TO });
  assert.equal(textOf(byClass(story, 'fam-list-status')[0]), 'Making… about a minute');
  assert.equal(byType(story, 'CircularProgress')[0].props.size, 16);
  assert.equal(textOf(byClass(story, 'mst-list-meta')[0]), 'Started 7 Nov 2025');
  const check = await render(ActivityRow, { item: item('check', 'running'), to: TO });
  assert.equal(textOf(byClass(check, 'fam-list-status')[0]), 'Marking… about a minute');
});

test('a check that needs pages offers Add the missing pages beside the link, and a failure says so', async () => {
  let added;
  const pages = item('check', 'needs_input');
  const view = await render(ActivityRow, { item: pages, to: TO, onAddPages: (row) => (added = row) });
  // Its line says what's wrong (design §5.3), so there's no status chip.
  assert.equal(textOf(byClass(view, 'mst-list-meta')[0]), 'Needs more pages');
  assert.equal(byClass(view, 'fam-list-status').length, 0);
  // Beside the link, never inside it.
  assert.equal(byType(view, 'Link')[0].findAll((node) => node.type === 'Button').length, 0);
  const [action] = byType(view, 'Button');
  assert.equal(textOf(action), 'Add the missing pages');
  await act(async () => action.props.onClick());
  assert.equal(added, pages);
  // Off while it works; and with no function from the page, no button.
  const busy = await render(ActivityRow, { item: pages, to: TO, onAddPages() {}, busy: true });
  assert.equal(byType(busy, 'Button')[0].props.disabled, true);
  const plain = await render(ActivityRow, { item: pages, to: TO });
  assert.equal(byType(plain, 'Button').length, 0);
  const failed = await render(ActivityRow, { item: item('story', 'failed'), to: TO });
  assert.deepEqual(
    byClass(failed, 'fam-list-status').map((node) => [textOf(node), node.props['data-tone']]),
    [['Didn’t finish', 'warn']]
  );
});

test('a homework upload not marked yet is named by its day, says it waits for marking, and offers Check now', async () => {
  let marking;
  // A camera names photos only by number, so the row names them by their day (design §5.3).
  const upload = {
    id: 'm-1',
    title: 'Homework',
    purpose: 'work',
    files: [{ name: 'IMG_0412.jpg', mime: 'image/jpeg' }],
    createdAt: AT,
  };
  const view = await render(UnmarkedRow, { material: upload, onMark: (material) => (marking = material) });
  assert.equal(textOf(byClass(view, 'mst-list-title')[0]), 'Photo from 7 Nov 2025');
  assert.equal(textOf(byClass(view, 'mst-list-meta')[0]), '1 photo, saved but not marked');
  assert.equal(byClass(view, 'fam-list-status').length, 0); // its line says it, so no chip
  assert.equal(byType(view, 'Link').length, 0);
  const [mark] = byType(view, 'Button');
  assert.equal(textOf(mark), 'Check now'); // the parent's action is "check" (design §5.3)
  await act(async () => mark.props.onClick());
  assert.equal(marking, upload);
});

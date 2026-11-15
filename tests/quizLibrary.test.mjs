// The quiz list's rules (Phase 1.46 S4.1-S4.3; SOT-2 to SOT-5, SOT-11; design.md §3.1, §3.13, §5, §11): the filters,
// the dates, the sort, what a row says and opens, the count, the strip, tags' ticks, the words and the example quiz.
// Area: quizzes
import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

// The list's plain modules as written, with stand-ins for the API client and the query cache.
const standIns = {
  api: `export default {}; export const apiError = (error, fallback) => new Error(fallback);`,
  queryCache: `export const sessionGeneration = () => 7; export const cacheFamilies = { quiz: ['quizzes'] };
export const invalidateAfter = (service) => service;`,
};
const bundle = await build({
  stdin: {
    contents: `export * from './src/areas/quizzes/library/filters.js';
export * from './src/areas/quizzes/library/rows.js';
export { LIBRARY, quizzes } from './src/areas/quizzes/library/words.js';
export { queryString } from './src/areas/quizzes/library/api.js';
export { EXAMPLE_QUIZ } from './src/areas/quizzes/library/exampleQuiz.js';
export { neverShownIn } from './src/areas/quizzes/words.js';`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  logLevel: 'error',
  plugins: [
    {
      name: 'stand-ins',
      setup(build) {
        build.onResolve({ filter: /(^|\/)(api|queryCache)$/ }, (args) => ({
          path: args.path.split('/').pop(),
          namespace: 'stand-in',
        }));
        build.onLoad({ filter: /.*/, namespace: 'stand-in' }, (args) => ({ contents: standIns[args.path] }));
      },
    },
  ],
});
const lib = await import(`data:text/javascript,${encodeURIComponent(bundle.outputFiles[0].text)}`);
const NOW = new Date(2026, 10, 14, 16, 30); // Saturday 14 Nov 2026

const quiz = (fields = {}) => ({
  id: 'q1',
  title: 'Photosynthesis end of unit test',
  description: null,
  mode: 'live',
  state: 'finished',
  question_count: 12,
  classes: [{ id: 'c1', name: '8B' }],
  tags: [],
  last_used_at: '2026-10-03T09:00:00Z',
  updated_at: '2026-10-01T09:00:00Z',
  run_count: 2,
  open_run: null,
  quiz_phase: 'normal',
  ...fields,
});
// C7's latest run (SOT-1): its average, day, classes, finished pupils and whether it's still open.
const run = (fields = {}) => ({
  average_percent: 71.6,
  date: '2026-11-14T09:00:00',
  classes: [{ id: 'c1', name: '8B' }],
  finished: 26,
  open: false,
  ...fields,
});

test('the filters live in the address, with the defaults left out and anything unknown dropped', () => {
  const filters = lib.readFilters(
    'q=photo&status=draft&status=bogus&status=draft&class=c1&class=c2&tag=t1&type=homework&date=custom&from=2026-10-01&to=2026-10-31&sort=name&order=desc'
  );
  assert.deepEqual(filters, {
    q: 'photo',
    status: ['draft'],
    classIds: ['c1', 'c2'],
    tagIds: ['t1'],
    type: 'homework',
    date: 'custom',
    from: '2026-10-01',
    to: '2026-10-31',
    sort: 'name',
    order: 'desc',
  });
  assert.equal(
    lib.writeFilters(filters),
    'q=photo&status=draft&class=c1&class=c2&tag=t1&type=homework&date=custom&from=2026-10-01&to=2026-10-31&sort=name&order=desc'
  );
  assert.equal(lib.writeFilters(lib.NO_FILTERS), '');
  assert.equal(lib.writeFilters({ sort: 'name', order: 'asc' }), 'sort=name', "a sort's own direction is left out");
  assert.equal(lib.writeFilters({ date: 'week', from: '2026-10-01' }), 'date=week', 'days only with Pick dates');
  assert.deepEqual(lib.readFilters('sort=size&order=up&type=both&date=year&from=1 Oct'), lib.NO_FILTERS);
  assert.deepEqual(lib.readFilters('sort=questions'), lib.NO_FILTERS, 'question counts no longer sort the list (R12)');
  assert.equal(lib.hasFilters(lib.NO_FILTERS), false);
  assert.equal(lib.hasFilters({ ...lib.NO_FILTERS, q: '  ' }), false);
  assert.equal(lib.hasFilters({ ...lib.NO_FILTERS, sort: 'name' }), false, 'a sort is not a filter');
  assert.equal(lib.hasFilters({ ...lib.NO_FILTERS, type: 'live' }), true);
});

test("the API's query (SOT-2): repeatable filters, the mode's own name, the days, and the sort only when it isn't the default", () => {
  const params = lib.apiParams(
    { ...lib.NO_FILTERS, q: ' photo ', status: ['ready', 'draft'], classIds: ['c2', 'c1'], type: 'homework' },
    NOW
  );
  assert.deepEqual(params, { q: 'photo', state: ['draft', 'ready'], class_id: ['c1', 'c2'], mode: 'self_paced' });
  assert.deepEqual(lib.apiParams(lib.NO_FILTERS, NOW), {});
  assert.deepEqual(lib.apiParams({ ...lib.NO_FILTERS, sort: 'newest', order: 'asc' }, NOW), {
    sort: 'newest',
    order: 'asc',
  });
  assert.deepEqual(lib.apiParams({ ...lib.NO_FILTERS, sort: 'name', order: 'asc' }, NOW), { sort: 'name' });
  assert.equal(
    lib.queryString({ ...params, limit: 50, offset: 0 }),
    'q=photo&state=draft&state=ready&class_id=c1&class_id=c2&mode=self_paced&limit=50&offset=0'
  );
});

test('the Date filter: this week from Monday, this month from the 1st, this term from its start, or picked days', () => {
  const range = (date, extra = {}) => lib.dateRange({ date, ...extra }, NOW);
  assert.deepEqual(range('week'), { from: '2026-11-09' });
  assert.deepEqual(lib.dateRange({ date: 'week' }, new Date(2026, 10, 9, 8)), { from: '2026-11-09' }, 'a Monday');
  assert.deepEqual(lib.dateRange({ date: 'week' }, new Date(2026, 10, 15, 8)), { from: '2026-11-09' }, 'a Sunday');
  assert.deepEqual(range('month'), { from: '2026-11-01' });
  assert.deepEqual(range('term'), { from: '2026-09-01' });
  assert.deepEqual(lib.dateRange({ date: 'term' }, new Date(2026, 1, 3)), { from: '2026-01-01' });
  assert.deepEqual(lib.dateRange({ date: 'term' }, new Date(2026, 4, 20)), { from: '2026-04-01' });
  assert.deepEqual(range('custom', { from: '2026-10-01', to: '' }), { from: '2026-10-01', to: undefined });
  assert.deepEqual(range(''), {});
  assert.equal(lib.dateLabel({ date: 'term' }, NOW), 'This term');
  assert.equal(lib.dateLabel({ date: 'custom', from: '2026-10-03', to: '2026-11-14' }, NOW), '3 Oct – 14 Nov');
  assert.equal(lib.dateLabel({ date: 'custom', from: '2025-10-03', to: '' }, NOW), 'From 3 Oct 2025');
  assert.equal(lib.localDay('2026-11-14').getDate(), 14, "a picked day is the device's own day");
});

test('the sortable heads: the sorted column flips, another starts in its own direction', () => {
  const f = lib.NO_FILTERS;
  assert.equal(lib.sortOrder(f), 'desc');
  assert.deepEqual(lib.sortBy(f, 'last_used'), { sort: 'last_used', order: 'asc' });
  assert.deepEqual(lib.sortBy({ ...f, order: 'asc' }, 'last_used'), { sort: 'last_used', order: '' });
  assert.deepEqual(lib.sortBy(f, 'name'), { sort: 'name', order: '' });
  assert.deepEqual(lib.sortBy({ ...f, sort: 'name' }, 'name'), { sort: 'name', order: 'desc' });
  assert.equal(lib.chipLabel('Class', []), 'Class');
  assert.equal(lib.chipLabel('Class', ['8B']), 'Class: 8B');
  assert.equal(lib.chipLabel('Class', ['8B', '9C', '10A']), 'Class: 8B +2');
});

test('a row: Last used, "Edited 3 Oct" for a quiz never run, the second line, and the page a click opens (§11.7)', () => {
  assert.deepEqual(lib.lastUsed(quiz(), NOW), { text: '3 Oct', edited: false });
  assert.deepEqual(lib.lastUsed(quiz({ last_used_at: '2026-11-14T08:00:00' }), NOW), { text: 'Today', edited: false });
  assert.deepEqual(lib.lastUsed(quiz({ run_count: 0, state: 'ready' }), NOW), { text: 'Edited 1 Oct', edited: true });
  assert.deepEqual(lib.lastUsed(quiz({ run_count: 0, updated_at: '2026-11-13T12:00:00' }), NOW), {
    text: 'Edited yesterday',
    edited: true,
  });
  // Line 2 puts the Average first and the classes last, so long class names never cut the Average off (C9, L1).
  assert.equal(lib.metaLine(quiz(), NOW), 'Last used 3 Oct · 8B', 'no question count (R12)');
  assert.equal(
    lib.metaLine(quiz({ classes: [], run_count: 0, state: 'draft', question_count: 1, latest_run: null }), NOW),
    'Edited 1 Oct · No class yet'
  );
  assert.equal(
    lib.metaLine(quiz({ classes: [{ name: '8B' }, { name: '9C' }, { name: '10A' }], latest_run: run() }), NOW),
    'Average 72% · Last used 3 Oct · 8B, 9C +1'
  );
  assert.equal(
    lib.metaLine(quiz({ last_used_at: '2026-11-14T08:00:00', latest_run: run({ open: true }) }), NOW),
    'Average 72% so far · Last used today · 8B'
  );
  assert.equal(lib.metaLine(quiz({ latest_run: run({ average_percent: null }) }), NOW), 'Last used 3 Oct · 8B');
  // A phone's line 2 leaves the classes out (L2): "Average 76% · Last used 3 Oct".
  assert.equal(lib.metaLine(quiz({ latest_run: run() }), NOW, { classes: false }), 'Average 72% · Last used 3 Oct');
  assert.equal(lib.metaLine(quiz({ run_count: 0, latest_run: null }), NOW, { classes: false }), 'Edited 1 Oct');
  // The row click, by state (design.md §3.10).
  assert.equal(lib.openPath(quiz()), '/quizzes/q1/results');
  assert.equal(lib.openPath(quiz({ state: 'draft' })), '/quizzes/q1/edit');
  assert.equal(lib.openPath(quiz({ state: 'ready', run_count: 0 })), '/quizzes/q1/edit?step=ready');
  assert.equal(
    lib.openPath(quiz({ state: 'live', open_run: { id: 'r1', kind: 'live' } })),
    '/quizzes/sessions/r1/host'
  );
  assert.equal(
    lib.openPath(quiz({ state: 'homework', open_run: { id: 'r2', kind: 'homework' } })),
    '/quizzes/sp-sessions/r2/host'
  );
  assert.equal(lib.openPath(quiz({ state: 'archived' })), '/quizzes/q1/results');
  assert.equal(lib.openPath(quiz({ state: 'archived', run_count: 0 })), '/quizzes/q1/edit');
  assert.equal(lib.runPath({ kind: 'live', id: 'r1' }), '/quizzes/sessions/r1/host');
  assert.equal(lib.runPath({ kind: 'homework', id: 'r2' }), '/quizzes/sp-sessions/r2/host');
  assert.equal(lib.displayTitle(quiz({ quiz_phase: 'pre', title: 'Cells' })), 'Pre - Cells');
  assert.equal(lib.displayTitle(quiz({ quiz_phase: 'post', title: 'Cells' })), 'Post - Cells');
});

test("the layout follows the list's width: one line from 1040 px, two lines below, the fewest columns on a phone", () => {
  assert.equal(lib.layoutFor(null), 'wide');
  assert.equal(lib.layoutFor(1082), 'wide', '1366 with the sidebar open');
  assert.equal(lib.layoutFor(1039), 'narrow');
  assert.equal(lib.layoutFor(740), 'narrow', '1024 with the sidebar open');
  assert.equal(lib.layoutFor(358), 'phone');
});

test('the count, and the "Live now" strip only while a live quiz is outside the first 5 rows', () => {
  assert.equal(lib.countText({ shown: 135, filtered: false }), '135 quizzes');
  assert.equal(lib.countText({ shown: 1, filtered: false }), '1 quiz');
  assert.equal(lib.countText({ shown: 23, all: 135, filtered: true }), '23 of 135');
  assert.equal(lib.countText({ shown: 23, filtered: true }), '23 quizzes', 'before the plain total is known');
  assert.equal(lib.countText({ shown: 4, all: 135, filtered: true, archived: true }), '4 archived quizzes');
  assert.equal(lib.countText({ shown: 1, filtered: true, archived: true }), '1 archived quiz');
  assert.equal(lib.LIBRARY.count(1234), '1,234 quizzes');
  const rows = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => quiz({ id }));
  assert.deepEqual(lib.liveToShow([quiz({ id: 'b' })], rows), []);
  assert.deepEqual(lib.liveToShow([quiz({ id: 'b' }), quiz({ id: 'f' })], rows).length, 2);
  assert.deepEqual(lib.liveToShow([], rows), []);
  assert.deepEqual(lib.liveToShow(undefined, rows), []);
});

test("the list's words never say session, publish, host, analytics, outsider, audience or cooldown (design.md §5)", () => {
  const texts = [];
  // Each worded function with the first arguments it takes: a count, a name, or a list of titles.
  const say = (words) => {
    for (const args of [[3, 'Cells'], ['Cells', 3], [['Cells', 'Forces']]]) {
      try {
        return words(...args);
      } catch {
        /* the next kind of argument */
      }
    }
    throw new Error(`no arguments fit ${words}`);
  };
  const collect = (value) => {
    if (typeof value === 'string') texts.push(value);
    else if (typeof value === 'function') texts.push(String(say(value)));
    else if (value && typeof value === 'object') Object.values(value).forEach(collect);
  };
  collect(lib.LIBRARY);
  assert.ok(texts.length > 100);
  assert.deepEqual(lib.neverShownIn(texts.join(' ')), []);
});

test("S4.2: a tag's tick across the chosen quizzes, and the words for archive, delete and tags", () => {
  const t1 = { id: 't1', name: 'Year 9' };
  const chosen = [quiz({ id: 'a', tags: [t1] }), quiz({ id: 'b', tags: [t1] }), quiz({ id: 'c', tags: [] })];
  assert.equal(lib.tagState('t1', chosen), 'some');
  assert.equal(lib.tagState('t1', chosen.slice(0, 2)), 'all');
  assert.equal(lib.tagState('t2', chosen), 'none');
  assert.equal(lib.tagState('t1', []), 'none');
  const words = lib.LIBRARY;
  assert.equal(words.deleteTitle(1), 'Delete this quiz?');
  assert.equal(words.deleteTitle(3), 'Delete 3 quizzes?');
  assert.equal(words.deleteButton(3), 'Delete 3 quizzes');
  // Phase 1.47 R11: the Delete window says plainly what happens to pupils' scores, once a quiz has run.
  assert.equal(
    words.deleteText(3, '', true),
    "They leave your list for good, and their scores are removed from pupils' grades, progress and reports. Archive keeps everything instead."
  );
  assert.equal(
    words.deleteText(1, 'Cells', true),
    "“Cells” leaves your list for good, and its scores are removed from pupils' grades, progress and reports. Archive keeps everything instead."
  );
  assert.equal(words.deleteText(1, 'Cells', false), '“Cells” leaves your list for good. Archive keeps it instead.');
  assert.equal(words.deleteText(2, '', false), 'They leave your list for good. Archive keeps them instead.');
  assert.equal(words.archived(1), 'Quiz archived · Results kept');
  assert.equal(words.archived(40), '40 quizzes archived · Results kept');
  assert.equal(words.archivedChipCount(3), 'Archived (3)');
  assert.equal(words.unarchived(1), 'Quiz unarchived');
  assert.equal(words.tagAdded('Year 9', 20), 'Tag “Year 9” added to 20 quizzes');
  assert.equal(words.tagRemoved('Year 9', 1), 'Tag “Year 9” taken off 1 quiz');
  assert.equal(
    words.stillRunning(['Forces quiz', 'Cells']),
    'Nothing was deleted: these are still running. End their run first: Forces quiz, Cells.'
  );
  assert.equal(words.copyDefault('Cells'), 'Cells (copy)');
  assert.equal(words.selected(40), '40 selected');
});

test('Phase 1.47 S5.2: the Average from C7, rounded as results rounds it, with its tooltip saying "so far" while open', () => {
  assert.equal(lib.averageText(quiz({ latest_run: run() })), '72%');
  assert.equal(lib.averageText(quiz({ latest_run: run({ average_percent: 0 }) })), '0%', 'a real 0 stays 0');
  assert.equal(lib.averageText(quiz({ latest_run: run({ average_percent: null, finished: 0 }) })), '—');
  assert.equal(lib.averageText(quiz({ latest_run: null })), '—', 'never run');
  assert.equal(lib.averageText(quiz()), '—', 'before the API sends latest_run');
  assert.equal(lib.averageTip(quiz({ latest_run: run() }), NOW), 'Latest run · Today · 8B · 26 pupils');
  assert.equal(
    lib.averageTip(quiz({ latest_run: run({ open: true, finished: 12, date: '2026-11-03T09:00:00' }) }), NOW),
    'Latest run · 3 Nov · 8B · 12 pupils so far'
  );
  assert.equal(
    lib.averageTip(
      quiz({ latest_run: run({ finished: 1, classes: [{ name: '8B' }, { name: '9C' }, { name: '10A' }] }) }),
      NOW
    ),
    'Latest run · Today · 8B, 9C +1 · 1 pupil'
  );
  assert.equal(
    lib.averageTip(quiz({ latest_run: run({ average_percent: null, finished: 0, open: true, classes: [] }) }), NOW),
    'Latest run · Today · nobody has finished yet'
  );
  assert.equal(
    lib.averageTip(quiz({ latest_run: run({ average_percent: null, finished: 0 }) }), NOW),
    'Latest run · Today · 8B · nobody finished'
  );
  assert.equal(
    lib.averageTip(quiz({ latest_run: run({ classes: ['8B'] }) }), NOW),
    'Latest run · Today · 8B · 26 pupils'
  );
  assert.equal(lib.averageTip(quiz({ latest_run: null }), NOW), 'Not run yet');
});

test('Phase 1.47 S5.2: status words only where the teacher must act, and no run buttons on the rows (R12)', () => {
  const words = (fields) => lib.rowStatus(quiz(fields), NOW)?.text ?? null;
  assert.equal(words({ state: 'live', open_run: { id: 'r1', kind: 'live' } }), 'Live now');
  assert.equal(
    words({ state: 'homework', open_run: { id: 'r2', kind: 'homework', deadline: '2026-11-20T17:00:00' } }),
    'Homework · due Fri 20 Nov'
  );
  assert.equal(
    words({ state: 'homework', open_run: { id: 'r2', kind: 'homework', deadline: null } }),
    'Homework · open'
  );
  assert.equal(words({ state: 'draft' }), 'Draft');
  for (const state of ['ready', 'finished', 'archived']) assert.equal(words({ state }), null, state);
});

test("Phase 1.47 S5.2: the ⋯ menu's first item by state, then the rest; Unarchive first in the Archived view", () => {
  assert.deepEqual(lib.menuItems(quiz()), ['again', 'results', 'edit', 'rename', 'copy', 'tags', 'archive']);
  assert.deepEqual(lib.menuItems(quiz({ state: 'ready', run_count: 0 })), [
    'start',
    'edit',
    'rename',
    'copy',
    'tags',
    'archive',
  ]);
  assert.deepEqual(
    lib.menuItems(quiz({ state: 'draft', run_count: 0 })),
    ['continue', 'rename', 'copy', 'tags', 'archive'],
    "a draft's first item already edits"
  );
  assert.deepEqual(lib.menuItems(quiz({ state: 'live' })), ['results', 'edit', 'rename', 'copy', 'tags', 'archive']);
  assert.deepEqual(lib.menuItems(quiz({ state: 'archived', archived_at: '2026-11-01T09:00:00Z' })), [
    'unarchive',
    'results',
    'edit',
    'rename',
    'copy',
    'tags',
  ]);
  assert.deepEqual(
    lib.menuItems(quiz({ state: 'live', archived_at: '2026-11-01T09:00:00Z' })),
    ['results', 'edit', 'rename', 'copy', 'tags', 'unarchive'],
    'a running quiz is never hidden by archiving, so its menu offers Unarchive last'
  );
});

test('Phase 1.47 S5.2: the Archived chip shows archived quizzes alone, and titles come before their tags (R11, R14)', () => {
  const archived = { ...lib.NO_FILTERS, status: ['archived'] };
  assert.equal(lib.archivedView(archived), true);
  assert.equal(lib.archivedView(lib.NO_FILTERS), false);
  assert.deepEqual(lib.apiParams(archived, NOW), { state: ['archived'] });
  assert.deepEqual(
    lib.apiParams({ ...archived, status: ['draft', 'archived'] }, NOW),
    { state: ['archived'] },
    'an older address'
  );
  // A 200 px title and two 60 px chips: both fit in 400 px, one and "+1" in 320, none but "+2" in 250 (the title isn't
  // cut while a tag shows), and a phone shows none.
  const fit = (room, max = 2) => lib.tagsThatFit({ title: 200, tags: [60, 60], room, max });
  assert.equal(fit(400), 2);
  assert.equal(fit(320), 1);
  assert.equal(fit(250), 0);
  assert.equal(fit(1000, 0), 0);
  assert.equal(lib.tagsThatFit({ title: 200, tags: [60, 60, 60], room: 360 }), 1, 'two chips and "+1" need 372 px');
  assert.equal(lib.tagsThatFit({ title: 100, tags: [], room: 400 }), 0);
});

test('S4.3: the example quiz (design.md §3.13): 8 questions of every kind, each with its explanation, ready to finish', () => {
  const quiz = lib.EXAMPLE_QUIZ;
  assert.equal(quiz.title, 'Example quiz: general knowledge');
  assert.equal(quiz.settings.mode, 'live');
  assert.equal(quiz.settings.show_leaderboard_to_students, false, 'the leaderboard starts off (Q5)');
  assert.equal('status' in quiz, false, 'POST /api/quizzes makes it a draft');
  assert.deepEqual(
    quiz.questions.map((question) => question.question_type),
    [
      'multiple_choice',
      'multiple_choice',
      'multiple_choice',
      'true_false',
      'true_false',
      'short_answer',
      'short_answer',
      'poll',
    ]
  );
  quiz.questions.forEach((question, index) => {
    assert.equal(question.order_index, index);
    assert.ok(
      question.question_text.trim() && question.explanation.trim(),
      `question ${index + 1}: text and explanation`
    );
    assert.ok(question.time_limit_seconds >= 20 && question.time_limit_seconds <= 30, `question ${index + 1}: 20–30 s`);
    assert.equal(question.points, question.question_type === 'poll' ? 0 : 10, `question ${index + 1}: points`);
    assert.ok(!question.media_url, 'no pictures, so nothing to copy');
  });
  const [planet, hexagon, mammal, water, spiders, gas, times, poll] = quiz.questions;
  assert.equal(planet.options[planet.correct_answer[0]], 'Mercury');
  assert.equal(hexagon.options[hexagon.correct_answer[0]], '6');
  assert.equal(mammal.options[mammal.correct_answer[0]], 'Dolphin');
  assert.deepEqual([water.correct_answer, spiders.correct_answer], [[true], [false]]);
  assert.deepEqual(gas.correct_answer, ['carbon dioxide', 'CO2']);
  assert.deepEqual(times.correct_answer, ['56']);
  assert.deepEqual(
    [gas.match_level, times.match_level],
    ['close', 'close'],
    "a new typed answer's level is Close (C1)"
  );
  assert.deepEqual([poll.correct_answer, poll.options.length], [[], 4]);
  // The publish rules a quiz must meet to start (SOT-1.3): choice questions have 2 to 6 answers, all with text, and a
  // multiple-choice one has one right answer among them; true or false has one; a short answer has accepted answers.
  for (const question of quiz.questions) {
    if (['multiple_choice', 'poll'].includes(question.question_type)) {
      assert.ok(
        question.options.length >= 2 && question.options.length <= 6 && question.options.every((text) => text.trim())
      );
    }
    if (question.question_type === 'multiple_choice') {
      assert.ok(question.correct_answer.length === 1 && question.correct_answer[0] < question.options.length);
    }
    if (question.question_type === 'short_answer') assert.ok(question.correct_answer.length >= 1);
  }
  assert.deepEqual(lib.neverShownIn(JSON.stringify([quiz.title, quiz.questions])), [], 'what pupils and teachers read');
});

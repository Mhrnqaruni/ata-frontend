// The quiz results page's words and figures (Phase 1.46 S6.4, Phase 1.47 S5.1; SOT-7; design.md §3.8, §5): honest
// summary facts, blanks counted, the plain sentence, pupils lowest first, the question lines and filter, Review's
// address, the downloads' words, the run picker's lines and the spreadsheet.
// Area: quizzes
import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({
  stdin: {
    contents: `export * from './src/areas/quizzes/results/figures.js';
export * from './src/areas/quizzes/results/words.js';
export * from './src/areas/quizzes/results/spreadsheet.js';
export { fileNameOf } from './src/areas/quizzes/results/files.js';
export { neverShownIn } from './src/areas/quizzes/words.js';`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  logLevel: 'error',
});
const r = await import(`data:text/javascript,${encodeURIComponent(bundle.outputFiles[0].text)}`);

const pupil = (name, score, status = 'done', extra = {}) => ({
  id: name.toLowerCase(),
  name,
  display_id: `S-${name.length}`,
  score,
  status,
  needs_help: status === 'done' && score !== null && score < 60,
  ...extra,
});
const question = (number, answered, correct, top) => ({
  id: `q${number}`,
  number,
  text: `Question ${number}`,
  type: 'multiple_choice',
  answered,
  correct,
  top_wrong_answer: top ? { text: top, count: 3 } : null,
});
// A closed live run for 28: 24 finished, 4 absent; 2 below half; question 4 the hardest.
const finishers = Array.from({ length: 24 }, (_, i) => pupil(`Pupil${String(i).padStart(2, '0')}`, 70 + i));
const live = {
  run_id: 'r1',
  kind: 'live',
  status: 'completed',
  expected: 28,
  took_part: 24,
  average: 86.4,
  max_points: 120,
  pupils: [
    ...finishers.slice(2),
    pupil('Ana', 40),
    pupil('Ben', 55),
    ...['Cy', 'Di', 'Ed', 'Flo'].map((name) => pupil(name, null, 'absent')),
  ],
  questions: [question(4, 24, 12, 'False'), question(2, 24, 20, 'Venus'), question(1, 24, 24), question(3, 0, null)],
  not_on_class_list: [],
};

test('the summary opens with honest facts: who took part, whom the average covers, the hardest, below half', () => {
  const facts = r.summaryFacts(live);
  assert.deepEqual(
    facts.map((fact) => [fact.value, fact.label, fact.detail]),
    [
      ['24 of 28', 'took part', undefined],
      ['86.4 / 120', 'average points', 'of the 24 who finished'],
      ['Q4', 'hardest question', '12 wrong · most chose ‘False’'],
      ['2', 'below half the points', undefined],
    ]
  );
  const homework = { ...live, kind: 'homework', status: 'active', handed_in: 12, working: 5, not_started: 11 };
  assert.deepEqual(r.summaryFacts(homework)[0], {
    key: 'handed',
    value: '12',
    label: 'handed in',
    detail: '5 working · 11 not started',
  });
  // Closed homework says what didn't happen, since nobody is working any more.
  const closed = { ...homework, status: 'completed', working: 2, not_started: 5 };
  assert.equal(r.summaryFacts(closed)[0].detail, "2 didn't hand in · 5 didn't start");
  assert.equal(r.summaryFacts({ ...closed, working: 0, not_started: 0 })[0].detail, 'Everyone handed in');
  // Missing isn't 0: no average and no wrong answers say so.
  const none = { ...live, average: null, pupils: live.pupils.map((p) => ({ ...p, score: null })), questions: [] };
  assert.deepEqual(r.summaryFacts(none)[1], {
    key: 'average',
    value: '—',
    label: 'average points',
    detail: 'No scores yet',
  });
  assert.equal(r.summaryFacts(none)[2].detail, 'No answers yet');
});

test('one plain sentence under the facts, from the share below half and the hardest questions', () => {
  assert.equal(r.summarySentence(live), 'Most of the class did well. Question 4 tripped up 12 pupils.');
  const half = {
    ...live,
    pupils: live.pupils.map((p, i) => (p.status === 'done' ? { ...p, needs_help: i % 2 === 0 } : p)),
    questions: [question(4, 24, 8, 'False'), question(7, 24, 10, '12'), question(1, 24, 20)],
  };
  assert.equal(r.summarySentence(half), 'About half the class is below half the points. Start with questions 4 and 7.');
  const clean = { ...live, pupils: finishers, questions: [question(1, 24, 24)] };
  assert.equal(r.summarySentence(clean), 'Everyone who finished scored at least half the points.');
  assert.equal(r.summarySentence({ ...live, took_part: 0 }), 'Nobody took part in this run.');
  assert.equal(r.summarySentence({ ...live, took_part: 0, status: 'active' }), 'Nobody has started yet.');
  const notYet = { ...live, kind: 'homework', status: 'active', pupils: [pupil('Ana', 3, 'working')], took_part: 1 };
  assert.equal(r.summarySentence(notYet), 'Nobody has handed in yet.');
  assert.equal(r.summarySentence({ ...notYet, status: 'completed' }), 'Nobody handed in.');
  assert.equal(r.summarySentence({ ...notYet, kind: 'live' }), 'The quiz is still running.');
});

test('pupils lowest first, with no result always after; points never show a needless .0', () => {
  const order = (list, how) => r.byScore(list, how).map((p) => p.name);
  // A score so far (Ed, still working) isn't a result, so it isn't ranked among the finishers.
  const list = [
    pupil('Zed', 90),
    pupil('Cy', null, 'absent'),
    pupil('Ana', 40),
    pupil('Ed', 12, 'working'),
    pupil('Bo', 40),
  ];
  assert.deepEqual(order(list), ['Ana', 'Bo', 'Zed', 'Ed', 'Cy']);
  assert.deepEqual(order(list, 'desc'), ['Zed', 'Ana', 'Bo', 'Ed', 'Cy']);
  assert.equal(r.resultScore(pupil('Ed', 12, 'working')), null);
  assert.deepEqual(
    r.byName(list).map((p) => p.name),
    ['Ana', 'Bo', 'Cy', 'Ed', 'Zed']
  );
  assert.equal(r.points(120), '120');
  assert.equal(r.points(86.46), '86.5');
  assert.equal(r.points(null), null);
  assert.equal(r.scoreOutOf(86, 120), '86 / 120');
  assert.equal(r.scoreOutOf(null, 120), null);
});

test("each pupil's Result shows only the exceptions; a walk-in's below half is worked out the same way", () => {
  const word = (p, max = 120) => r.resultOf(p, r.isBelowHalf(p, max))?.word ?? null;
  assert.equal(word(pupil('Ana', 40)), 'Below half the points');
  assert.equal(word(pupil('Zed', 90)), null);
  assert.equal(word(pupil('Cy', null, 'absent')), 'Absent');
  assert.equal(word(pupil('Di', null, 'not_started')), 'Not started');
  assert.equal(word(pupil('Ed', 12, 'working')), 'Working');
  assert.equal(word(pupil('Flo', null)), 'Waiting for your mark');
  assert.equal(word({ name: 'Mia', status: 'done', score: 50 }), 'Below half the points');
  assert.equal(word({ name: 'Mia', status: 'done', score: 60 }), null);
  const closedHomework = { kind: 'homework', status: 'completed' };
  assert.equal(r.resultOf(pupil('Ed', 12, 'working'), false, closedHomework).word, "Didn't hand in");
  assert.equal(r.resultOf(pupil('Cy', null, 'absent'), false, closedHomework).word, "Didn't start");
  assert.equal(r.resultOf(pupil('Ed', 12, 'working'), false, { kind: 'homework', status: 'active' }).word, 'Working');
});

test('the run picker: "14 Nov · 8B", the time when two runs share a day, and each run\'s facts', () => {
  const now = new Date(2026, 10, 15, 9, 0);
  const at = (h, m, day = 14) => new Date(2026, 10, day, h, m).toISOString();
  const runs = [
    { id: 'a', kind: 'live', status: 'completed', started_at: at(10, 5), classes: [{ id: 'c1', name: '8B' }] },
    { id: 'b', kind: 'live', status: 'completed', started_at: at(14, 30), classes: [] },
    { id: 'c', kind: 'live', status: 'completed', started_at: at(9, 0, 3), classes: [{ id: 'c2', name: '9C' }] },
  ];
  assert.equal(r.runTitle(runs[0], runs, { now }), '14 Nov, 10:05 · 8B');
  assert.equal(r.runTitle(runs[1], runs, { now }), '14 Nov, 14:30 · Anyone with the code');
  assert.equal(r.runTitle(runs[2], runs, { now }), '3 Nov · 9C');
  const facts = { kind: 'live', status: 'completed', expected: 28, took_part: 26, average_percent: 71.6 };
  assert.equal(r.runFacts(facts), 'Live · 26 of 28 took part · average 72%');
  assert.equal(r.runFacts({ ...facts, status: 'active', average_percent: null }), 'Live now · 26 of 28 took part');
  const homework = { kind: 'homework', status: 'completed', expected: 30, took_part: 22, handed_in: 20 };
  assert.equal(r.runFacts(homework), 'Homework · 20 of 30 handed in');
});

test("blanks count (C8): the human's run never says No wrong answers, and the sentence says how many were blank", () => {
  // Two pupils, three questions: Q1 and Q3 left blank by both, Q2 right for both; hardest first, as the server sends.
  const blanks = {
    ...live,
    expected: 2,
    took_part: 2,
    average: 10,
    max_points: 30,
    pupils: [pupil('Ana', 10, 'done', { needs_help: true }), pupil('Ben', 10, 'done', { needs_help: true })],
    questions: [
      { ...question(1, 0, 0), type: 'short_answer', no_answer: 2, missed_by: ['ana', 'ben'] },
      { ...question(3, 0, 0), type: 'short_answer', no_answer: 2, missed_by: ['ana', 'ben'] },
      { ...question(2, 2, 2), no_answer: 0, missed_by: [] },
    ],
  };
  const facts = r.summaryFacts(blanks);
  assert.deepEqual([facts[2].value, facts[2].detail], ['Q1', 'nobody answered']);
  assert.equal(
    r.summarySentence(blanks),
    'Most of the class is below half the points. 4 of 6 answers were left blank. Start with questions 1 and 3.'
  );
  assert.ok(!JSON.stringify(facts).includes('No wrong answers'));
  // Wrong answers and blanks together; a blank on a poll alone still isn't "No wrong answers".
  const mixed = { ...question(4, 26, 14, 'Cell wall'), no_answer: 2 };
  assert.equal(
    r.summaryFacts({ ...live, questions: [mixed] })[2].detail,
    '12 wrong, 2 no answer · most chose ‘Cell wall’'
  );
  const pollBlank = { ...live, questions: [question(1, 24, 24), { ...question(2, 22, null), no_answer: 2 }] };
  assert.equal(r.summaryFacts(pollBlank)[2].detail, '2 no answer');
  assert.equal(r.summaryFacts({ ...live, questions: [question(1, 24, 24)] })[2].detail, 'No wrong answers');
  // A blank sentence only from a quarter of the answers.
  assert.equal(
    r.summarySentence({ ...live, questions: [{ ...question(1, 24, 20), no_answer: 4 }] }).includes('blank'),
    false
  );
});

test('each question: "14 of 28 right" of all who met it, its second line, and the filter by missed_by', () => {
  const q4 = { ...question(4, 26, 14, 'Cell wall'), no_answer: 2, missed_by: ['ana', 'cy'] };
  assert.equal(r.rightWords(q4), '14 of 28 right');
  assert.equal(r.questionLine(q4), '12 wrong · most chose ‘Cell wall’ · 2 no answer');
  assert.equal(r.questionLine({ ...q4, type: 'short_answer' }, { markedByAi: true }).endsWith(' · Marked by AI'), true);
  assert.equal(r.questionLine(question(1, 24, 24)), '');
  assert.equal(r.missedCount(q4), 14);
  assert.equal(r.missedCount({ ...question(9, 20, null), no_answer: 3 }), 0); // a poll trips nobody up
  const people = [pupil('Ana', 40), pupil('Ben', 90), pupil('Cy', 20)];
  assert.deepEqual(
    r.missedBy(q4, people).map((p) => p.name),
    ['Ana', 'Cy']
  );
  assert.deepEqual(r.missedBy({ ...q4, missed_by: undefined }, people), []);
  assert.equal(r.RESULTS.wrongOrBlank(4), 'Q4 · wrong or blank');
});

test("a pupil's Review opens their attempt's page; no attempt, no Review; a blank finisher reads No answers", () => {
  const ana = pupil('Ana', 40, 'done', { attempt_id: 'part 7' });
  assert.equal(r.reviewPath('quiz-1', 'run-2', ana), '/quizzes/quiz-1/runs/run-2/pupils/part%207');
  assert.equal(r.reviewPath('quiz-1', 'run-2', pupil('Cy', null, 'absent', { attempt_id: null })), null);
  assert.equal(r.reviewPath('quiz-1', 'run-2', pupil('Ed', 12, 'working')), null); // before C8 lands
  const word = (p) => r.resultOf(p, r.isBelowHalf(p, 120))?.word ?? null;
  assert.equal(word(pupil('Flo', 0, 'done', { answered: 0 })), 'No answers');
  assert.equal(word(pupil('Flo', 0, 'done', { answered: 3 })), 'Below half the points');
});

test('the Download menu says what it prepares, and a PDF failure offers Word', () => {
  assert.equal(r.RESULTS.preparing(28, 'pdf'), 'Preparing 28 PDFs…');
  assert.equal(r.RESULTS.preparing(1, 'pdf'), 'Preparing 1 PDF…');
  assert.equal(r.RESULTS.preparing(28, 'docx'), 'Preparing 28 Word files…');
  assert.equal(r.RESULTS.preparing(0, 'pdf'), 'Preparing the PDFs…');
  assert.equal(r.RESULTS.pdfsFailed, "Couldn't make the PDFs. Try again, or download Word.");
  assert.equal(
    r.fileNameOf({ 'content-disposition': 'attachment; filename="8B reports.zip"' }, 'x.zip'),
    '8B reports.zip'
  );
  assert.equal(r.fileNameOf({ 'content-disposition': "attachment; filename*=UTF-8''Ana%20B.pdf" }, 'x'), 'Ana B.pdf');
  assert.equal(r.fileNameOf({}, 'Quiz reports.zip'), 'Quiz reports.zip');
});

test('the homework spreadsheet: the class list, then those not on it, quoted, and safe from formulas', () => {
  const summary = {
    kind: 'homework',
    status: 'active',
    max_points: 20,
    pupils: [pupil('Ben', null, 'not_started'), { ...pupil('Ana, Jr', 8), needs_help: true }],
    not_on_class_list: [{ id: 'w1', name: '=HYPERLINK("x")', display_id: 'S-778', score: 20, status: 'done' }],
  };
  const csv = r.resultsCsv(summary);
  assert.equal(csv.charCodeAt(0), 0xfeff);
  const lines = csv.slice(r.BYTE_ORDER_MARK.length).trim().split('\r\n');
  assert.equal(lines[0], 'Name,School ID,On the class list,Status,Score,Out of,Below half the points');
  assert.equal(lines[1], '"Ana, Jr",S-7,Yes,Handed in,8,20,Yes');
  assert.equal(lines[2], 'Ben,S-3,Yes,Not started,,20,');
  assert.equal(lines[3], `"'=HYPERLINK(""x"")",S-778,No,Handed in,20,20,`);
  assert.equal(r.csvName('Fractions: week 3', '14 Nov 2026'), 'Fractions week 3 results 14 Nov 2026.csv');
});

test('no word on the results page is one that never shows on a quiz page', () => {
  const words = Object.values(r.RESULTS).flatMap((value) =>
    typeof value === 'function' ? [value(3), value('Ana', 'Ben')] : [value].flat()
  );
  const samples = [r.summarySentence(live), ...r.summaryFacts(live).flatMap((f) => [f.value, f.label, f.detail])];
  assert.deepEqual(r.neverShownIn([...words, ...samples].join(' | ')), []);
});

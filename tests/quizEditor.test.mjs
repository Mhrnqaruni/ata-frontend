// The quiz editor's rules (Phase 1.46 S5.2; SOT-1.3, SOT-12; design.md §3.4): drafts save unfinished work, the
// checklist and the header's warning, changing a question's type, the outline's Find, and the editor's state.
// Area: quizzes
import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({
  stdin: {
    contents: `export * from './src/areas/quizzes/editor/draft.js';
export * from './src/areas/quizzes/editor/questionModel.js';
export * from './src/areas/quizzes/editor/editorState.js';
export { questionsCsv } from './src/areas/quizzes/editor/csv.js';
export { joinNames, SAVING } from './src/areas/quizzes/editor/words.js';`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  logLevel: 'error',
});
const editor = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`
);
const { changeType, quizProblems, unfinished, issueOf, savedQuestions, questionMatches, reduce, initialState } = editor;

const choice = (options, correct, extra = {}) => ({
  key: extra.key ?? `k${Math.random()}`,
  question_type: 'multiple_choice',
  question_text: 'Which part of the cell controls what enters and leaves?',
  options,
  correct_answer: correct,
  points: 10,
  time_limit_seconds: 30,
  ...extra,
});
const quiz = (questions, extra = {}) => ({
  title: 'Year 9 Cells',
  quizPhase: 'normal',
  linkedQuizId: null,
  questions,
  ...extra,
});

test('X2: answers A and B filled, C and D empty, B right: a draft saves 2 answers with B still right', () => {
  const question = choice(['Cell membrane', 'Nucleus', '', ''], [1]);
  assert.deepEqual(quizProblems(quiz([question]), { draft: true }), []);
  const [saved] = savedQuestions([question]);
  assert.deepEqual(saved.options, ['Cell membrane', 'Nucleus']);
  assert.deepEqual(saved.correct_answer, [1]);
  assert.equal(saved.order_index, 0);
  assert.equal('key' in saved, false);
});

test('Finish editing lists each unfinished question with its place, and a draft only needs a title', () => {
  const questions = [
    choice(['A', 'B'], []),
    choice(['', '', '', ''], [], { question_text: '' }),
    { key: 'tf', question_type: 'true_false', question_text: 'Cells divide.', options: [], correct_answer: [] },
    { key: 'sa', question_type: 'short_answer', question_text: 'Name it.', options: [], correct_answer: ['  '] },
    choice(['Mercury', 'Venus'], [0]),
  ];
  assert.deepEqual(quizProblems(quiz(questions), { draft: true }), []);
  assert.deepEqual(
    quizProblems(quiz(questions)).map((problem) => [problem.text, problem.index]),
    [
      ['Question 1 needs a right answer', 0],
      ['Question 2 needs its text', 1],
      ['Question 3 needs a right answer', 2],
      ['Question 4 needs an accepted answer', 3],
    ]
  );
  assert.deepEqual(
    quizProblems(quiz([], { title: ' ' })).map((problem) => problem.text),
    ['Give the quiz a title', 'Add at least one question']
  );
  assert.deepEqual(unfinished(questions), { count: 4, text: '4 questions to finish', first: 0 });
  assert.deepEqual(unfinished([questions[0], questions[2], questions[4]]), {
    count: 2,
    text: '2 need a right answer',
    first: 0,
  });
  assert.equal(unfinished([questions[4]]), null);
  assert.equal(issueOf(choice(['A', 'B', '', ''], [3])), 'right'); // a right answer on an empty box is none
});

test('changing the type keeps what fits, and says what went', () => {
  const mc = choice(['Cell membrane', 'Nucleus', 'Cytoplasm', ''], [1]);
  const short = changeType(mc, 'short_answer');
  assert.deepEqual([short.question.correct_answer, short.question.options], [['Nucleus'], []]);
  assert.equal(short.removed, 'Answers A and C removed');
  const tf = changeType(mc, 'true_false');
  assert.deepEqual(tf.question.correct_answer, []);
  assert.equal(tf.removed, 'Answers A, B and C removed');
  assert.equal(changeType(choice(['True', 'False', '', ''], [1]), 'true_false').removed, null);
  assert.deepEqual(changeType(choice(['True', 'False', '', ''], [1]), 'true_false').question.correct_answer, [false]);
  const poll = changeType(mc, 'poll');
  assert.deepEqual(
    [poll.question.correct_answer, poll.question.points, poll.removed],
    [[], 0, 'The right answer removed']
  );
  const back = changeType(poll.question, 'multiple_choice');
  assert.equal(back.question.points, 10);
  const fromTf = changeType({ ...tf.question, correct_answer: [true] }, 'multiple_choice');
  assert.deepEqual(
    [fromTf.question.options, fromTf.question.correct_answer, fromTf.removed],
    [['True', 'False'], [0], null]
  );
  const accepted = {
    key: 's',
    question_type: 'short_answer',
    question_text: 'Gas?',
    options: [],
    correct_answer: ['carbon dioxide', 'CO2'],
  };
  const fromShort = changeType(accepted, 'multiple_choice');
  assert.deepEqual(fromShort.question.options.slice(0, 1), ['carbon dioxide']);
  assert.deepEqual([fromShort.question.correct_answer, fromShort.removed], [[0], 'Other accepted answers removed']);
  const wide = {
    ...choice(['a', 'b', 'c', 'd', 'e', 'f'], []),
    question_type: 'poll',
    options: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
  };
  assert.equal(changeType(wide, 'multiple_choice').removed, 'Answer G removed');
});

test('removing an answer moves the right answer with it; Find takes a number or a word', () => {
  assert.deepEqual(editor.removeOption(choice(['A', 'B', 'C'], [2]), 0).correct_answer, [1]);
  assert.deepEqual(editor.removeOption(choice(['A', 'B', 'C'], [1]), 1).correct_answer, []);
  const questions = Array.from({ length: 100 }, (_, i) =>
    choice([`a${i}`, 'b'], [0], { question_text: `Question about topic ${i}` })
  );
  questions[56] = { ...questions[56], question_text: 'What does osmosis move?' };
  assert.deepEqual(questionMatches(questions, '57'), [56]);
  assert.deepEqual(questionMatches(questions, ' Osmosis '), [56]);
  assert.deepEqual(questionMatches(questions, '101'), []);
  assert.equal(questionMatches(questions, '').length, 100);
});

test('the editor state counts changes, maps saved ids by key, and keeps a stored picture saved', () => {
  const start = reduce(initialState(), { type: 'load', quiz: { ...editor.newQuiz(), id: 'q1' } });
  const added = reduce(start, { type: 'add', question: choice(['A', 'B'], [0], { key: 'one' }) });
  assert.equal(added.version, 1);
  const saved = reduce(added, {
    type: 'saved',
    id: 'q1',
    ids: editor.idsByKey(['one'], [{ id: 'server-1', order_index: 0 }]),
    version: 1,
  });
  assert.equal(saved.quiz.questions[0].id, 'server-1');
  assert.equal(saved.savedVersion, 1);
  const pictured = reduce(saved, {
    type: 'question',
    key: 'one',
    patch: { media_url: '/quiz-images/server-1/a.png' },
    alreadySaved: true,
  });
  assert.equal(pictured.version, pictured.savedVersion);
  const typed = reduce(pictured, {
    type: 'question',
    key: 'one',
    patch: (q) => ({ ...q, question_text: 'New words' }),
  });
  assert.equal(typed.version > typed.savedVersion, true);
  const every = reduce(typed, { type: 'every', field: 'points', value: 5 });
  assert.equal(every.quiz.questions[0].points, 5);
  const imported = reduce(reduce(initialState(editor.newQuiz()), { type: 'add', question: editor.blankQuestion() }), {
    type: 'append',
    questions: [choice(['x', 'y'], [0])],
  });
  assert.equal(imported.quiz.questions.length, 1); // the lone untouched question gave way
});

test('the save sends an emptied description as "", and a post quiz keeps its pre quiz’s class', () => {
  const body = editor.payloadOf({
    ...editor.newQuiz(),
    title: ' Cells ',
    audience: { class_ids: ['c8', 'c9'], tag_ids: [], mode: 'union' },
  });
  assert.deepEqual([body.title, body.description, body.class_id, body.linked_quiz_id], ['Cells', '', 'c8', null]);
  const post = editor.payloadOf({
    ...editor.newQuiz(),
    title: 'After',
    quizPhase: 'post',
    linkedQuizId: 'pre',
    classId: 'c9',
  });
  assert.deepEqual([post.class_id, post.linked_quiz_id], ['c9', 'pre']);
  const loaded = editor.quizFrom({ id: 'q', title: 'T', class_id: 'c7', settings: { mode: 'sp' }, questions: [] });
  assert.deepEqual([loaded.audience.class_ids, loaded.settings.mode], [['c7'], 'self_paced']);
});

test('Export CSV quotes what needs quoting', () => {
  const csv = editor.questionsCsv([
    choice(['Yes, it does', 'No "never"'], [0], { question_text: 'Line one\nline two' }),
  ]);
  const [, row] = csv.split(/\n(?=1,)/);
  assert.match(row, /^1,Multiple Choice,"Line one\nline two","Yes, it does","No ""never""",,,,,Option 1,10,30,$/);
});

test('S5.1: the server’s audience is kept apart, so the page knows a saved quiz’s classes can’t be emptied', () => {
  const loaded = editor.quizFrom({ id: 'q', title: 'T', audience: { class_ids: ['c8'], tag_ids: [] }, questions: [] });
  assert.deepEqual(loaded.serverAudience, { class_ids: ['c8'], tag_ids: [], mode: 'union' });
  const start = reduce(initialState(), { type: 'load', quiz: loaded });
  const cleared = reduce(start, { type: 'set', fields: { audience: null } });
  assert.deepEqual(cleared.quiz.serverAudience.class_ids, ['c8']); // the server keeps it until a save says otherwise
  const saved = reduce(cleared, {
    type: 'saved',
    id: 'q',
    ids: {},
    version: 1,
    audience: editor.audienceFrom({ class_id: 'c9' }),
  });
  assert.deepEqual(saved.quiz.serverAudience.class_ids, ['c9']);
  assert.equal(editor.newQuiz().serverAudience, null);
});

test('S5.1: who can join, in a sentence, and the saving words', () => {
  assert.equal(editor.joinNames([]), '');
  assert.equal(editor.joinNames(['8B']), '8B');
  assert.equal(editor.joinNames(['8B', '9C']), '8B and 9C');
  assert.equal(editor.joinNames(['8B', '9C', '10A']), '8B, 9C and 10A');
  assert.equal(editor.joinNames(['8B', '9C', '10A', '11B', '7A']), '8B, 9C and 3 more');
  assert.equal(editor.SAVING.saved(1000, 50000), 'Saved · just now');
  assert.equal(editor.SAVING.saved(1000, 1000 + 3 * 60000), 'Saved · 3 min ago');
});

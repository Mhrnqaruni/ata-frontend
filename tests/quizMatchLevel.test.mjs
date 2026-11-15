// The typed answers' match levels in the quiz editor (Phase 1.47 S5.3; SOT-1 C1, SOT-2; design.md §3.5, §3.7): a new
// question sends Close, a loaded one its own level (none is Same meaning), the level survives edits, and the points words.
// Area: quizzes
import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({
  stdin: {
    contents: `export * from './src/areas/quizzes/editor/matchLevels.js';
export * from './src/areas/quizzes/editor/questionModel.js';
export * from './src/areas/quizzes/editor/editorState.js';`,
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

const typed = (extra = {}) => ({
  question_type: 'short_answer',
  question_text: 'What gas do plants take in?',
  options: [],
  correct_answer: ['carbon dioxide'],
  points: 10,
  ...extra,
});

test('C1: a new question sends Close; a loaded one sends its own level, and none (or an unknown one) is Same meaning', () => {
  const fresh = editor.blankQuestion('short_answer');
  assert.equal(fresh.match_level, 'close');
  assert.equal(editor.blankQuestion().match_level, 'close'); // it counts once the question becomes a typed answer
  const quiz = editor.quizFrom({
    id: 'q',
    title: 'Gases',
    questions: [
      typed({ id: 'a', order_index: 0 }), // saved before the levels
      typed({ id: 'b', order_index: 1, match_level: 'exact' }),
      typed({ id: 'c', order_index: 2, match_level: 'close' }),
      typed({ id: 'd', order_index: 3, match_level: 'fuzzy' }),
    ],
  });
  assert.deepEqual(
    quiz.questions.map((question) => question.match_level),
    ['meaning', 'exact', 'close', 'meaning']
  );
  const sent = editor.payloadOf({ ...quiz, questions: [...quiz.questions, fresh] }).questions;
  assert.deepEqual(
    sent.map((question) => question.match_level),
    ['meaning', 'exact', 'close', 'meaning', 'close']
  );
});

test('QA P2-6: a question set to Exact, then its text edited, still sends Exact, and reloads as Exact', () => {
  const loaded = editor.quizFrom({
    id: 'q',
    title: 'Capitals',
    questions: [typed({ id: 'a', correct_answer: ['Tehran'] })],
  });
  let state = editor.reduce(editor.initialState(), { type: 'load', quiz: loaded });
  const { key } = state.quiz.questions[0];
  state = editor.reduce(state, { type: 'question', key, patch: (now) => ({ ...now, match_level: 'exact' }) });
  state = editor.reduce(state, {
    type: 'question',
    key,
    patch: (now) => ({ ...now, question_text: 'Capital of Iran?' }),
  });
  const [sent] = editor.payloadOf(state.quiz).questions;
  assert.deepEqual([sent.match_level, sent.question_text], ['exact', 'Capital of Iran?']);
  const reloaded = editor.quizFrom({ id: 'q', title: 'Capitals', questions: [{ ...sent, id: 'a2' }] });
  assert.equal(reloaded.questions[0].match_level, 'exact');
});

test('a copy and a type change keep the level; an AI import gives Close unless it says otherwise', () => {
  const exact = typed({ key: 'k1', match_level: 'exact' });
  assert.equal(editor.copyOf(exact).match_level, 'exact');
  const asChoice = editor.changeType(exact, 'multiple_choice').question;
  assert.equal(editor.changeType(asChoice, 'short_answer').question.match_level, 'exact');
  assert.equal(editor.importedQuestion(typed()).match_level, 'close');
  assert.equal(editor.importedQuestion(typed({ match_level: 'exact' })).match_level, 'exact');
  const imported = editor.importedQuestion({
    question_type: 'true_false',
    question_text: 'Cells divide.',
    correct_answer: [true],
  });
  assert.deepEqual([imported.points, imported.options, imported.match_level], [10, [], 'close']);
  const appended = editor.reduce(editor.initialState(editor.newQuiz()), { type: 'append', questions: [imported] });
  assert.equal(editor.payloadOf({ ...appended.quiz, title: 'Cells' }).questions[0].match_level, 'close');
});

test('the points words say "Up to" where the AI may give part points, and never "if right"', () => {
  const words = (type, level, points = 10) => editor.pointsWords({ type, points, level });
  assert.equal(words('multiple_choice', 'close'), '10 points');
  assert.equal(words('true_false', 'meaning'), '10 points');
  assert.equal(words('short_answer', 'close'), 'Up to 10 points');
  assert.equal(words('short_answer', 'meaning'), 'Up to 10 points');
  assert.equal(words('short_answer', undefined), 'Up to 10 points'); // not known: never promise all or nothing
  assert.equal(words('short_answer', 'exact'), '10 points');
  assert.equal(words('short_answer', 'exact', 1), '1 point');
  assert.equal(words('poll', 'close', 0), 'A poll · no points');
});

test('the closed card names the level after the accepted answers', () => {
  const question = typed({ correct_answer: ['carbon dioxide', 'CO2', ' '], match_level: 'close' });
  assert.deepEqual(
    editor.answerParts(question).map((part) => part.text),
    ['Accepted: carbon dioxide, CO2', 'Close']
  );
  assert.equal(editor.answerParts({ ...question, match_level: undefined })[1].text, 'Same meaning');
  assert.equal(editor.answerParts({ ...question, match_level: 'exact' })[1].text, 'Exact');
  assert.deepEqual(editor.answerParts({ ...question, correct_answer: [] }), []);
});

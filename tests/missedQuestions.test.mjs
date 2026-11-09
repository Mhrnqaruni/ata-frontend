// Practising a quiz's missed questions (Phase 1.37 S4.3; design §3.14; SOT B17.4): the missed set comes from the last
// attempt, and the run asks only those, keeps its answers in the page, and calls neither the progress nor the attempt API.
// Area: family
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const require = createRequire(import.meta.url);
const React = require('react');
const { act, create } = require('react-test-renderer');
const { MemoryRouter } = require('react-router-dom');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
// The browser parts the quiz reaches for: the window, with reduced motion so the score shows at once, and frames.
globalThis.window = { matchMedia: () => ({ matches: true }), addEventListener() {}, removeEventListener() {} };
globalThis.requestAnimationFrame = (callback) => setTimeout(() => callback(performance.now()), 0);
globalThis.cancelAnimationFrame = (frame) => clearTimeout(frame);

// The quiz's packages: React and React Router as they are, and MUI as plain elements, as in
// familySourceRecovery.test.cjs. Stand-ins: the family service, which records every request it gets, MUI's icons,
// maths text as plain text, and the query cache.
const mui = { useMediaQuery: () => false };
for (const name of ['Box', 'Button', 'CircularProgress', 'Collapse', 'Typography']) mui[name] = name;
const packages = {
  react: React,
  'react/jsx-runtime': require('react/jsx-runtime'),
  'react-router-dom': require('react-router-dom'),
  '@mui/material': mui,
};
const standIns = {
  familyApi:
    'export const calls = []; export const familyApi = {' +
    " progress: async (...args) => (calls.push(['progress', ...args]), { revision: 1, data: {} })," +
    " saveProgress: async (...args) => (calls.push(['saveProgress', ...args]), { revision: 2 }) };",
  MathTextDisplay: 'export default function MathText({ text }) { return text ?? null; }',
  queryCache:
    'export const sessionGeneration = () => 0;' +
    ' export const queryClient = { getQueryData: () => undefined, setQueryData: () => {} };',
  icon: 'export default function Icon() { return null; }',
};
const bundle = await build({
  stdin: {
    contents: `export { default as Quiz, missedQuestions } from './src/areas/family/results/QuizResult';
export { calls } from './src/areas/family/familyApi';`,
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
        build.onResolve(
          { filter: /(^|\/)(familyApi|MathTextDisplay|queryCache)$|^@mui\/icons-material\// },
          (args) => ({
            path: args.path.startsWith('@mui/') ? 'icon' : args.path.split('/').pop(),
            namespace: 'stand-in',
          })
        );
        build.onLoad({ filter: /.*/, namespace: 'stand-in' }, (args) => ({ contents: standIns[args.path] }));
      },
    },
  ],
});
const quiz = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)((id) => packages[id], quiz, quiz.exports);
const { Quiz, missedQuestions, calls } = quiz.exports;

const options = ['First option', 'Second option', 'Third option', 'Fourth option'];
const questions = [
  { id: 'q1', text: 'Question one', options, correctIndex: 0, explanation: 'Because.' },
  { id: 'q2', text: 'Question two', options, correctIndex: 1, explanation: 'Because.' },
  { id: 'q3', text: 'Question three', options, correctIndex: 2, explanation: 'Because.' },
];
const activity = { id: 'quiz-1', childId: 'child-1', kind: 'quiz', title: 'Fractions', result: { questions } };
// The notebook home's attempts, newest first: the last missed q1 and q3, and the one before missed only q3.
const attempt = (id, answers, createdAt) => ({ id, activityId: 'quiz-1', answers, total: 3, createdAt });
const latest = { ...attempt('attempt-2', { q1: 3, q2: 1, q3: 0 }, '2026-11-08T10:00:00+00:00'), score: 1 };
const older = { ...attempt('attempt-1', { q1: 0, q2: 1, q3: 1 }, '2026-11-07T10:00:00+00:00'), score: 2 };

const textOf = (node) => (typeof node === 'string' ? node : node.children.map(textOf).join(''));
const button = (view, label) => view.root.find((node) => node.type === 'Button' && textOf(node) === label);
const settle = (ms) => act(async () => new Promise((resolve) => setTimeout(resolve, ms)));

test('the missed set is the questions the attempt got wrong, in the quiz’s order', () => {
  assert.deepEqual(
    missedQuestions(questions, latest).map((question) => question.id),
    ['q1', 'q3']
  );
  assert.deepEqual(
    missedQuestions(questions, older).map((question) => question.id),
    ['q3']
  );
  assert.deepEqual(missedQuestions(questions, attempt('all', { q1: 0, q2: 1, q3: 2 })), []);
});

test('the run asks only the last attempt’s missed questions, and calls neither the progress nor the attempt API', async () => {
  const recorded = [];
  const progress = [];
  let view;
  await act(async () => {
    view = create(
      React.createElement(
        MemoryRouter,
        {
          initialEntries: ['/family/children/child-1/quizzes/quiz-1'],
          // React Router 7's behaviour now, which also keeps its notices out of the test's output.
          future: { v7_startTransition: true, v7_relativeSplatPath: true },
        },
        React.createElement(Quiz, {
          activity,
          result: activity.result,
          childName: 'Sam',
          onRecord: async (...args) => (recorded.push(args), true),
          busy: false,
          attempts: [latest, older],
          draftKey: ['family', 0, 'parent-1', 'child-1', 'quizDraft', 'quiz-1'],
          onAsk() {},
          onNewVersion() {},
          onProgress: (text) => progress.push(text),
          backLabel: 'Back to Quizzes',
          onClose() {},
        })
      )
    );
  });
  await settle(10); // the saved place loads, and the score shows
  // Phase 1.38 design §6.5: one score, a word without "!", the last try, and each answer said as Sam's.
  assert.match(textOf(view.root), /Worth another go/);
  assert.match(textOf(view.root), /1 of 3 right/);
  assert.match(textOf(view.root), /Last time( \([^)]+\))?: 2 of 3/);
  assert.match(textOf(view.root), /Sam answered Fourth option · The right answer is First option/);
  assert.doesNotMatch(textOf(view.root), /!|Saved ·|got 1 out of 3/);
  // One exit, the frame's Close (§6.4): no "Back to Quizzes" in the bar. Try all again, and new questions as a link.
  assert.equal(view.root.findAll((node) => node.type === 'Button' && textOf(node) === 'Back to Quizzes').length, 0);
  assert.ok(button(view, 'Try all 3 again'));
  assert.ok(button(view, 'Make 3 new ones'));
  // The last attempt missed two: its button comes first. (The attempt before missed one.)
  const practise = button(view, 'Practise the 2 missed questions');
  calls.length = 0;
  await act(async () => practise.props.onClick());
  for (const [i, question] of [questions[0], questions[2]].entries()) {
    assert.match(textOf(view.root), new RegExp(question.text));
    assert.doesNotMatch(textOf(view.root), /Question two/);
    // Each question says who answers: Sam, with the parent beside them.
    assert.match(textOf(view.root), /Read the question with Sam, then press Sam’s answer\./);
    assert.equal(progress.at(-1), `Question ${i + 1} of 2`);
    const choices = view.root.findAll((node) => node.type === 'button' && node.props.role === 'radio');
    // Check answer waits for an answer.
    assert.equal(button(view, 'Check answer').props.disabled, true);
    await act(async () => choices[question.correctIndex].props.onClick());
    await act(async () => button(view, 'Check answer').props.onClick());
    assert.match(textOf(view.root), /Right/);
    await act(async () => button(view, i === 0 ? 'Next question' : 'See the result').props.onClick());
  }
  assert.match(textOf(view.root), /2 of 2 right now/);
  assert.equal(progress.at(-1), '');
  // Past the progress hook's 250 ms save delay: nothing went to the server, and no attempt was recorded.
  await settle(300);
  assert.deepEqual(calls, []);
  assert.deepEqual(recorded, []);
  // Back to results returns to the score, which is unchanged, with the button again.
  await act(async () => button(view, 'Back to results').props.onClick());
  assert.match(textOf(view.root), /1 of 3 right/);
  assert.ok(button(view, 'Practise the 2 missed questions'));
  await act(async () => view.unmount());
});

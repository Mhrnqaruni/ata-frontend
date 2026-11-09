// A result address's rules (Phase 1.37, S3.2; C-2, design §3.10): wrong kind, unknown id, the back link, and the
// new version that replaces the address.
// Area: family
import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

// The rules and resultPath as written, bundled with MUI's icons as stand-ins (as tests/sections.test.mjs does).
const bundle = await build({
  stdin: {
    contents:
      "export * from './src/areas/family/results/resultRules.js'; export { resultPath } from './src/areas/family/sections.js';",
    resolveDir: process.cwd(),
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  logLevel: 'error',
  plugins: [
    {
      name: 'icons',
      setup(build) {
        build.onResolve({ filter: /^@mui\/icons-material\// }, (args) => ({ path: args.path, namespace: 'icon' }));
        build.onLoad({ filter: /.*/, namespace: 'icon' }, () => ({ contents: 'export default function Icon() {}' }));
      },
    },
  ],
});
const { backLink, itemLine, newVersionRequest, newVersionWords, resultState, resultPath } = await import(
  `data:text/javascript,${encodeURIComponent(bundle.outputFiles[0].text)}`
);

const story = { id: 's1', kind: 'story' };
const missing = (status) => ({ response: { status } });

test('an item opened under the wrong kind goes to its own address', () => {
  assert.deepEqual(resultState({ activity: story, segment: 'quizzes', childId: 'c1' }), {
    redirect: '/family/children/c1/stories/s1',
  });
  assert.deepEqual(resultState({ activity: { id: 'e1', kind: 'learn' }, segment: 'stories', childId: 'c1' }), {
    redirect: '/family/children/c1/notebook/explanations/e1',
  });
  assert.equal(resultState({ activity: story, segment: 'stories', childId: 'c1' }), 'show');
  assert.equal(resultState({ segment: 'stories', childId: 'c1' }), 'wait');
});

test('an unknown id and another child’s item look the same: not available', () => {
  // The server answers 404 for both, so the page can't tell them apart, and nothing leaks.
  assert.equal(resultState({ error: missing(404), segment: 'quizzes', childId: 'c1' }), 'unavailable');
  assert.equal(resultState({ error: missing(403), segment: 'quizzes', childId: 'c1' }), 'unavailable');
  // A chat reply has no result page of its own.
  assert.equal(resultState({ activity: { id: 'r1', kind: 'chat' }, segment: 'quizzes', childId: 'c1' }), 'unavailable');
  // Anything else is a failed load, which can be tried again.
  assert.equal(resultState({ error: missing(500), segment: 'quizzes', childId: 'c1' }), 'error');
});

test('the back link goes where the parent came from, else to the item’s section', () => {
  const names = { childId: 'c1', childName: 'Sam' };
  assert.deepEqual(backLink({ from: '/family/children/c1', segment: 'quizzes', ...names }), {
    to: '/family/children/c1',
    label: 'Back to Sam',
  });
  // Phase 1.38 design §1.8, §6.5: the sections keep their own names, as in the sidebar.
  assert.deepEqual(backLink({ from: '/family/children/c1/notebook?chat=k9', segment: 'quizzes', ...names }), {
    to: '/family/children/c1/notebook?chat=k9',
    label: 'Back to Assistant',
  });
  assert.deepEqual(backLink({ segment: 'quizzes', ...names }), {
    to: '/family/children/c1/quizzes',
    label: 'Back to Quizzes',
  });
  assert.deepEqual(backLink({ segment: 'mind-maps', ...names }), {
    to: '/family/children/c1/mind-maps',
    label: 'Back to Mind maps',
  });
  assert.deepEqual(backLink({ segment: 'notebook/explanations', ...names }), {
    to: '/family/children/c1/notebook',
    label: 'Back to Assistant',
  });
  // Phase 1.38: the profile's chart opens results that come back to it.
  assert.deepEqual(backLink({ from: '/family/children/c1/profile', segment: 'homework', ...names }), {
    to: '/family/children/c1/profile',
    label: 'Back to Sam’s profile',
  });
});

test('the top bar says what the item is, for whom, and its size or date (Phase 1.38 design §6.4, §5.5)', () => {
  const now = new Date(2026, 10, 9, 20, 0);
  const today = new Date(2026, 10, 9, 18, 40).toISOString();
  const earlier = new Date(2026, 10, 5, 9, 0).toISOString();
  const questions = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }];
  const done = { status: 'completed', finishedAt: earlier };
  // A quiz is done with the child; once tried, the line says when (Phase 1.38 round 3).
  assert.equal(itemLine({ ...done, kind: 'quiz', result: { questions } }, 'Sam', now), 'Quiz to do with Sam');
  assert.equal(
    itemLine({ ...done, kind: 'quiz', result: { questions } }, 'Sam', now, today),
    'Quiz · tried today at 18:40'
  );
  assert.equal(
    itemLine({ ...done, kind: 'flashcards', result: { cards: [{}] } }, 'Sam', now),
    'Flashcards to do with Sam'
  );
  // Made items say their day, without the child's name or the minute.
  assert.equal(itemLine({ ...done, kind: 'mindmap', result: {} }, 'Sam', now), 'Mind map · made 5 Nov');
  assert.equal(
    itemLine({ ...done, kind: 'story', finishedAt: today, result: {} }, 'Sam', now),
    'Story to read with Sam · made today'
  );
  // Homework names the AI's work, "marked", and doesn't name the child twice.
  assert.equal(itemLine({ ...done, kind: 'check', finishedAt: today }, 'Sam', now), 'Homework · marked today at 18:40');
  // Still being made: what it will be.
  assert.equal(itemLine({ status: 'running', kind: 'quiz', count: 10 }, 'Sam', now), 'Quiz to do with Sam');
  assert.equal(itemLine({ status: 'running', kind: 'check' }, 'Sam', now), 'Homework');
});

test('a new version asks first, says what is kept, and repeats the verb (Phase 1.38 design §10.6)', () => {
  const quiz = newVersionWords({ kind: 'quiz', status: 'completed', count: 5 });
  assert.deepEqual(quiz, {
    title: 'Make new questions?',
    sentence:
      'MySmartTeach writes 5 new questions on the same topic. It takes about a minute. This quiz and its score are kept.',
    verb: 'Make new questions',
  });
  const map = newVersionWords({ kind: 'mindmap', status: 'completed' });
  assert.equal(map.title, 'Make a new mind map?');
  assert.equal(map.sentence, 'MySmartTeach makes a new one on the same topic. This one is kept.');
  assert.equal(map.verb, 'Make a new map');
  assert.equal(newVersionWords({ kind: 'flashcards', status: 'completed' }).verb, 'Make new cards');
  // A failed item tries again; one that may have finished says so.
  assert.equal(newVersionWords({ kind: 'story', status: 'failed' }).verb, 'Try again');
  assert.match(newVersionWords({ kind: 'quiz', status: 'outcome_unknown' }).sentence, /may have finished already/);
  // Never "we", and no exclamation marks.
  for (const words of [quiz, map]) assert.doesNotMatch(Object.values(words).join(' '), /\bwe\b|!/i);
});

test('a new version is a remake of the item, at its own new address', () => {
  const quiz = {
    id: 'q1',
    kind: 'quiz',
    basis: 'materials',
    materialIds: ['m1', 'm2'],
    count: 5,
    focus: 'fractions',
    title: 'Fractions',
    tag: '',
    difficulty: 'Standard',
    quizType: 'mcq',
    settings: { madeFrom: 'section' },
  };
  const request = newVersionRequest(quiz, 'key-1');
  assert.equal(request.sourceActivityId, 'q1');
  assert.equal(request.kind, 'quiz');
  assert.deepEqual(request.materialIds, ['m1', 'm2']);
  assert.equal(request.materialId, 'm1');
  // The server keeps the original's chat and where it was made, so neither is sent.
  assert.equal(request.originConversationId, null);
  assert.equal('madeFrom' in request, false);
  assert.equal(request.newAttemptKey, 'key-1');
  const chat = newVersionRequest({ ...quiz, basis: 'conversation', settings: { conversationId: 'k9' } }, 'key-2');
  assert.equal(chat.conversationId, 'k9');
  assert.deepEqual(chat.materialIds, []);
  // The made item's address replaces this one: the same section, its own id.
  assert.equal(resultPath('c1', { kind: 'quiz', id: 'q2' }), '/family/children/c1/quizzes/q2');
});

// Parent mode's list pages' words (Phase 1.38; design §1.5, §1.7, §1.8): every list section has its sentence under
// the title and its empty state, in the child's name and never with "we", and every kind has its Outlined icon.
// Area: family
import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

// listWords.js and sections.js as written, with each MUI icon as a stand-in that is its name.
const bundle = await build({
  stdin: {
    contents: `export { KIND_ICONS, PAGE_WORDS } from './src/areas/family/lists/listWords.js';
export { SECTIONS } from './src/areas/family/sections.js';`,
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
        build.onLoad({ filter: /.*/, namespace: 'icon' }, (args) => ({
          contents: `export default ${JSON.stringify(args.path.split('/').pop())};`,
        }));
      },
    },
  ],
});
// The bundle imports nothing, so it loads straight from memory.
const { KIND_ICONS, PAGE_WORDS, SECTIONS } = await import(
  `data:text/javascript,${encodeURIComponent(bundle.outputFiles[0].text)}`
);
const lists = SECTIONS.filter((section) => section.kind);

test('every list section has its sentence and its empty state, in plain words with no "we"', () => {
  for (const section of lists) {
    const words = PAGE_WORDS[section.id];
    assert.ok(words, `${section.id} has no words`);
    for (const text of [words.subtitle('Sam'), words.emptyTitle, words.empty('Sam')]) {
      assert.match(text, /^[A-Z][^!]*$/, section.id);
      assert.doesNotMatch(text, /\bwe\b/i, section.id);
    }
  }
  assert.equal(PAGE_WORDS.activities.subtitle('Sam'), 'Things to make for Sam to practise with.');
});

test('the words name the child where they talk about the child', () => {
  assert.equal(
    PAGE_WORDS.quizzes.subtitle('Sam'),
    'Quizzes AI writes when you ask. Sam answers them here and is marked straight away.'
  );
  assert.equal(PAGE_WORDS.quizzes.empty('Sam'), 'Sam’s quizzes will show here, with each score.');
  assert.equal(
    PAGE_WORDS.homework.subtitle('Sam'),
    'Take a photo of Sam’s finished homework. AI marks it in about a minute and explains any mistakes.'
  );
  assert.equal(
    PAGE_WORDS.homework.empty('Sam'),
    'Each check will show here, with Sam’s score and what to look at together.'
  );
  assert.equal(PAGE_WORDS['mind-maps'].emptyTitle, 'No mind maps yet');
});

test("each list section's kind has its Outlined icon, as the side panel shows it", () => {
  assert.deepEqual(Object.fromEntries(lists.map((section) => [section.kind, KIND_ICONS[section.kind]])), {
    check: 'AssignmentTurnedInOutlined',
    quiz: 'QuizOutlined',
    flashcards: 'StyleOutlined',
    mindmap: 'AccountTreeOutlined',
    story: 'AutoStoriesOutlined',
  });
});

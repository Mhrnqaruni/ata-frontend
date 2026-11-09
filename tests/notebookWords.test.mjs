// The Notebook's words and rules (Phase 1.38 design §4.4–4.8): where making starts from and what the panel says about
// it, the composer's materials line, a material's lines, a new chat's ideas and the line under a thing made in a chat.
// Area: family
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAKE_TILES,
  chatIdeas,
  madeLine,
  makePreset,
  makeSource,
  materialMeta,
  materialState,
  sourceLine,
  usingLine,
} from '../src/areas/family/notebook/notebookWords.js';

test('making starts from the chat once it has an answer, then the ticked materials, then a topic', () => {
  assert.equal(makeSource({ canChat: true, ticked: 2 }), 'conversation');
  assert.equal(makeSource({ canChat: false, ticked: 2 }), 'materials');
  assert.equal(makeSource({ canChat: false, ticked: 0 }), 'topic');
  assert.equal(sourceLine('conversation', 2), 'From this chat');
  assert.equal(sourceLine('materials', 2), 'From the 2 materials you ticked');
  assert.equal(sourceLine('materials', 1), 'From the material you ticked');
  assert.equal(sourceLine('topic', 0), 'From a topic you describe');
});

test('a tile opens the make dialog with its source already chosen', () => {
  assert.deepEqual(makePreset('conversation', ['m1']), { basis: 'conversation' });
  assert.deepEqual(makePreset('materials', ['m1', 'm2']), { basis: 'materials', materialIds: ['m1', 'm2'] });
  assert.deepEqual(makePreset('topic', []), { basis: 'topic' });
});

test('the make section has four tiles, each with words on it', () => {
  assert.deepEqual(
    MAKE_TILES.map(([kind, name]) => [kind, name]),
    [
      ['quiz', 'Quiz'],
      ['flashcards', 'Flashcards'],
      ['mindmap', 'Mind map'],
      ['story', 'Story'],
    ]
  );
  assert.ok(MAKE_TILES.every(([, , line]) => line.length > 0));
});

test('the composer says how many materials the answers use, and how to change them', () => {
  assert.deepEqual(usingLine(0), ['Using no materials', 'Choose']);
  assert.deepEqual(usingLine(1), ['Using 1 material', 'Change']);
  assert.deepEqual(usingLine(2), ['Using 2 materials', 'Change']);
});

test('a material says what it is and how long', () => {
  const photo = { mime: 'image/jpeg', pages: 1 };
  const pdf = { mime: 'application/pdf', pages: 1 };
  assert.equal(materialMeta({ files: [] }), 'MySmartTeach notes');
  assert.equal(materialMeta({ files: [{ ...photo, pages: 2 }] }), 'Photo · 2 pages');
  assert.equal(materialMeta({ files: [pdf] }), 'PDF · 1 page');
  assert.equal(materialMeta({ files: [photo, photo, photo] }), '3 photos · 3 pages');
  assert.equal(materialMeta({ files: [photo, pdf] }), '2 files · 2 pages');
  assert.equal(materialState(null), '');
  assert.equal(materialState({ status: 'ready' }), '');
  assert.equal(materialState({ status: 'extracting' }), 'Reading the pages…');
  assert.equal(materialState({ status: 'partial', searchable: 2, total: 5 }), '2 of 5 pages can be read');
  assert.equal(materialState({ status: 'failed' }), 'The pages couldn’t be read');
});

test('a new chat offers three questions about the first ticked material, and none before one is ticked', () => {
  assert.deepEqual(chatIdeas([], 'Sam'), []);
  assert.deepEqual(
    chatIdeas([{ title: 'Fractions worksheet.pdf' }, { title: 'Spelling' }], 'Sam').map((idea) => idea.text),
    [
      'Explain Fractions worksheet with an example',
      'How can I help Sam with Fractions worksheet?',
      'What should Sam practise next?',
    ]
  );
});

test('a thing made in a chat says where it came from, and its size', () => {
  assert.equal(madeLine({ kind: 'quiz', count: 5 }), 'Quiz you made from this chat · 5 questions');
  assert.equal(madeLine({ kind: 'flashcards', count: 1 }), 'Flashcards you made from this chat · 1 card');
  assert.equal(madeLine({ kind: 'mindmap', count: 4 }), 'Mind map you made from this chat');
  assert.equal(madeLine({ kind: 'story' }), 'Story you made from this chat');
});

test('the Notebook never says "we"', () => {
  const words = [
    ...MAKE_TILES.flat(),
    sourceLine('conversation', 0),
    sourceLine('materials', 3),
    sourceLine('topic', 0),
    ...usingLine(0),
    ...usingLine(3),
    materialState({ status: 'failed' }),
    ...chatIdeas([{ title: 'Times tables' }], 'Sam').map((idea) => idea.text),
    madeLine({ kind: 'quiz', count: 3 }),
  ];
  for (const text of words) assert.doesNotMatch(text, /\b(we|us|our)\b/i, text);
});

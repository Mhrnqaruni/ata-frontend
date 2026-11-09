// Making things from section pages and the Notebook (Phase 1.37, S3.3a; C-14, C-24): the chat cards' filter, the
// request each mode sends, a ticked material the notebook home doesn't hold, and the make window's words (1.38 §6.3).
// Area: family
import test from 'node:test';
import assert from 'node:assert/strict';
import { chatCards } from '../src/areas/family/notebook/chatCards.js';
import { makeRequest, missingMaterialIds } from '../src/areas/family/make/makeRequest.js';
import {
  aboutOptions,
  makeButton,
  makeSentence,
  makeTitle,
  materialsNote,
  moreLine,
} from '../src/areas/family/make/makeWords.js';

const settings = {
  quizType: 'mcq',
  cardStyle: 'question_answer',
  mapDepth: 3,
  mapBreadth: 4,
  storyLength: 'short',
  storyTheme: '',
  storyTone: 'calm',
};
const fields = { kind: 'quiz', count: 5, focus: '', title: '', tag: '', difficulty: 'Standard', topic: '', settings };

test('a chat shows only what was made in it, so a new chat shows nothing old (Phase 1.38 design §4.5)', () => {
  const rows = [
    { id: 'a', conversationId: 'k1', kind: 'quiz', settings: { madeFrom: 'notebook' } },
    { id: 'b', conversationId: 'k1', kind: 'quiz', settings: { madeFrom: 'section' } },
    { id: 'c', conversationId: 'k1', kind: 'story', settings: { madeFrom: null } },
    { id: 'd', conversationId: 'k2', kind: 'quiz', settings: {} },
    { id: 'e', conversationId: null, kind: 'mindmap', settings: {} },
    { id: 'f', conversationId: 'k1', kind: 'check', settings: {} },
  ];
  // Made here: shown. Made on a section page, another chat's, or a homework check (it lives in Homework): not.
  assert.deepEqual(
    chatCards(rows, 'k1').map((row) => row.id),
    ['a', 'c']
  );
  // An older item with no chat shows in no chat, and nothing shows before the chat has loaded.
  assert.deepEqual(
    chatCards(rows, 'k3').map((row) => row.id),
    []
  );
  assert.deepEqual(chatCards(rows, null), []);
});

test('a section page’s request says so and names no chat', () => {
  const body = makeRequest({ ...fields, mode: 'section', basis: 'materials', ticks: ['m1'], chat: undefined });
  assert.equal(body.madeFrom, 'section');
  assert.equal(body.originConversationId, null);
  assert.equal(body.conversationId, null);
  assert.deepEqual(body.materialIds, ['m1']);
});

test('the Notebook’s request names the open chat, whose card it gets', () => {
  const chat = { id: 'k1', revision: 4 };
  const body = makeRequest({ ...fields, mode: 'notebook', basis: 'conversation', ticks: [], chat });
  assert.equal(body.madeFrom, 'notebook');
  assert.equal(body.originConversationId, 'k1');
  assert.equal(body.conversationId, 'k1');
  assert.equal(body.conversationRevision, 4);
  assert.deepEqual(body.materialIds, []);
});

test('a ticked material the home doesn’t hold is read by id and kept', () => {
  const home = [{ id: 'm1' }, { id: 'm2' }];
  assert.deepEqual(missingMaterialIds(home, ['m1', 'x9', 'x9']), ['x9']);
  assert.deepEqual(missingMaterialIds(home, []), []);
  assert.deepEqual(missingMaterialIds(undefined, ['m1']), ['m1']);
  // Kept: the request sends every tick, the read one included.
  const body = makeRequest({ ...fields, mode: 'section', basis: 'materials', ticks: ['m1', 'x9'] });
  assert.deepEqual(body.materialIds, ['m1', 'x9']);
});

test('the make window says who makes what for whom, and asks only what is needed (Phase 1.38 design §6.3)', () => {
  assert.equal(makeTitle('quiz', 'Sam'), 'Make a quiz for Sam');
  assert.equal(makeTitle('flashcards', 'Sam'), 'Make flashcards for Sam');
  assert.equal(makeTitle('mindmap', 'Sam'), 'Make a mind map for Sam');
  assert.equal(makeTitle('story', 'Sam'), 'Make a story for Sam');
  assert.equal(makeSentence('quiz'), 'MySmartTeach writes the questions. It takes about a minute.');
  assert.equal(makeSentence('flashcards'), 'MySmartTeach makes the cards. It takes about a minute.');
  assert.equal(makeSentence('mindmap'), 'MySmartTeach draws the map. It takes about a minute.');
  assert.equal(makeSentence('story'), 'MySmartTeach writes the story. It takes about a minute.');
  assert.equal(makeButton('quiz'), 'Make quiz');
  assert.equal(moreLine('quiz'), 'More options: question type, a focus');
  assert.equal(moreLine('flashcards'), 'More options: card style');
  assert.equal(moreLine('mindmap'), 'More options: how deep, how wide');
  assert.equal(moreLine('story'), 'More options: tone, a theme');
  // What it's about: a section page offers the child's materials or a topic; the Notebook adds its open chat.
  assert.deepEqual(aboutOptions({ name: 'Sam', hasMaterials: true, canChat: false }), [
    ['materials', 'Sam’s materials'],
    ['topic', 'Describe a topic'],
  ]);
  assert.deepEqual(
    aboutOptions({ name: 'Sam', hasMaterials: false, canChat: true }).map(([value]) => value),
    ['conversation', 'topic']
  );
  assert.equal(materialsNote(true), 'Ticked like your latest chat. Tap to change.');
  assert.equal(materialsNote(false), 'Tick the materials it should use.');
  // Never "we", and no exclamation marks.
  const words = [makeSentence('quiz'), makeTitle('story', 'Sam'), materialsNote(true), moreLine('story')].join(' ');
  assert.doesNotMatch(words, /\bwe\b|!/i);
});

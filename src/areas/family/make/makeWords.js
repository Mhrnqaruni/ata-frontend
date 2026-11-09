// The make window's words (Phase 1.38 design §6.3): its title and sentence for each kind, what it's about, the
// note under the materials, the More options line and the Make button.
// Area: family

const TITLES = { quiz: 'a quiz', flashcards: 'flashcards', mindmap: 'a mind map', story: 'a story' };
const WHO = {
  quiz: 'writes the questions',
  flashcards: 'makes the cards',
  mindmap: 'draws the map',
  story: 'writes the story',
};
const BUTTONS = { quiz: 'Make quiz', flashcards: 'Make cards', mindmap: 'Make map', story: 'Make story' };
// What More options holds, said on its closed line.
const MORE = {
  quiz: 'question type, a focus',
  flashcards: 'card style',
  mindmap: 'how deep, how wide',
  story: 'tone, a theme',
};

/** "Make a quiz for Sam", or "Make something" for no kind. */
export const makeTitle = (kind, name) => (TITLES[kind] ? `Make ${TITLES[kind]} for ${name}` : 'Make something');

/** The sentence under the title: who does the work, and how long it takes. */
export const makeSentence = (kind) => `MySmartTeach ${WHO[kind] || 'makes it'}. It takes about a minute.`;

/** The Make button: "Make quiz", "Make cards", "Make map" or "Make story". */
export const makeButton = (kind) => BUTTONS[kind] || 'Make it';

/** The closed More options line: "More options: question type, a focus". */
export const moreLine = (kind) => (MORE[kind] ? `More options: ${MORE[kind]}` : 'More options');

/** "What's it about?": the child's materials, the open chat in the Notebook, or a topic to describe. */
export function aboutOptions({ name, hasMaterials, canChat }) {
  return [
    ...(hasMaterials ? [['materials', `${name}’s materials`]] : []),
    ...(canChat ? [['conversation', 'This chat']] : []),
    ['topic', 'Describe a topic'],
  ];
}

/** The note under the materials on a section page: ticked like the latest chat, or tick them. */
export const materialsNote = (fromChat) =>
  fromChat ? 'Ticked like your latest chat. Tap to change.' : 'Tick the materials it should use.';

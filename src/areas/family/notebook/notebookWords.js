// The Notebook's words and rules (Phase 1.38 design §4.4–4.8), as plain functions its parts and tests share: where
// making starts from, the composer's materials line, a material's lines, a new chat's ideas and a made thing's line.
// Area: family

/** The make section's four tiles (design §4.8): [kind, name, line]. */
export const MAKE_TILES = [
  ['quiz', 'Quiz', 'Questions, marked straight away'],
  ['flashcards', 'Flashcards', 'Cards to flip and learn'],
  ['mindmap', 'Mind map', 'The topic as a picture'],
  ['story', 'Story', 'A short story that teaches it'],
];

/**
 * Where the make section starts (design §4.8): 'conversation' once the chat has an answer, else 'materials' when some
 * are ticked, else 'topic', so the make dialog opens on "Describe it".
 */
export function makeSource({ canChat, ticked }) {
  if (canChat) return 'conversation';
  return ticked > 0 ? 'materials' : 'topic';
}

/** The make section's source line: "From this chat", "From the 2 materials you ticked" or "From a topic you describe". */
export function sourceLine(source, ticked) {
  if (source === 'conversation') return 'From this chat';
  if (source === 'materials') {
    return ticked === 1 ? 'From the material you ticked' : `From the ${ticked} materials you ticked`;
  }
  return 'From a topic you describe';
}

/** The history state a tile opens the make dialog with: the source already chosen, and the ticks when it's materials. */
export function makePreset(source, ticks) {
  return source === 'materials' ? { basis: 'materials', materialIds: ticks } : { basis: source };
}

/** The composer's line under 1200 px (design §4.7), as [words, action]: "Using 2 materials" · "Change". */
export function usingLine(count) {
  if (!count) return ['Using no materials', 'Choose'];
  return [`Using ${count} ${count === 1 ? 'material' : 'materials'}`, 'Change'];
}

const counted = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** A material's line (design §4.8): "Photo · 2 pages", "PDF · 1 page", "3 photos · 5 pages", "MySmartTeach notes". */
export function materialMeta({ files = [] }) {
  if (!files.length) return 'MySmartTeach notes';
  const pdf = files.every((file) => file.mime === 'application/pdf');
  const photo = files.every((file) => String(file.mime || '').startsWith('image/'));
  const [one, many] = pdf ? ['PDF', 'PDFs'] : photo ? ['Photo', 'photos'] : ['File', 'files'];
  const what = files.length === 1 ? one : `${files.length} ${many}`;
  const pages = files.reduce((sum, file) => sum + (Number(file.pages) || 0), 0);
  return pages ? `${what} · ${counted(pages, 'page')}` : what;
}

/** A second line while a material is being read, or when it couldn't be (its `indexing`); '' once it's ready. */
export function materialState(indexing) {
  if (!indexing || indexing.status === 'ready') return '';
  if (indexing.status === 'queued' || indexing.status === 'extracting') return 'Reading the pages…';
  if (indexing.status === 'partial') return `${indexing.searchable} of ${counted(indexing.total, 'page')} can be read`;
  return 'The pages couldn’t be read';
}

/** The new chat's ideas (design §4.6), all questions, about the first ticked material; none until one is ticked. */
export function chatIdeas(materials, name) {
  const topic = (materials[0]?.title || '').replace(/\.(pdf|png|jpe?g|heic|webp)$/i, '');
  if (!topic) return [];
  return [
    { id: 'explain', text: `Explain ${topic} with an example` },
    { id: 'help', text: `How can I help ${name} with ${topic}?` },
    { id: 'next', text: `What should ${name} practise next?` },
  ];
}

const MADE = {
  quiz: ['Quiz', 'question'],
  flashcards: ['Flashcards', 'card'],
  mindmap: ['Mind map'],
  story: ['Story'],
  learn: ['Explanation'],
};

/** The line under something made in a chat (design §4.5): "Quiz you made from this chat · 5 questions". */
export function madeLine({ kind, count }) {
  const [name, unit] = MADE[kind] || ['Something'];
  const line = `${name} you made from this chat`;
  return unit && count > 0 ? `${line} · ${counted(count, unit)}` : line;
}

// The make dialog's rules (design §3.6, §3.9; C-14, C-24): the materials it reads by id, and the request that makes
// the item, which says where it was made.
// Area: family

/** The ticked ids the notebook home's materials don't hold. They're read one by one, so a tick is never dropped. */
export function missingMaterialIds(materials, ticks) {
  const known = new Set((materials || []).map((item) => item.id));
  return [...new Set(ticks || [])].filter((id) => !known.has(id));
}

/**
 * The request that makes a new item. From a section page it says so and names no chat, so it gets no chat card
 * (C-14); from the Notebook it names the open chat, whose card it then gets, as today.
 * `chat` is the open chat in the Notebook ({ id, revision }); `settings` holds the kind's own choices.
 */
export function makeRequest({ kind, mode, basis, ticks, topic, count, focus, title, tag, difficulty, settings, chat }) {
  const notebook = mode === 'notebook';
  const fromMaterials = basis === 'materials';
  const fromChat = basis === 'conversation';
  return {
    materialId: fromMaterials ? ticks[0] : null,
    materialIds: fromMaterials ? ticks : [],
    kind,
    count,
    focus,
    basis,
    topic,
    conversationId: fromChat ? chat?.id : null,
    conversationRevision: fromChat ? chat?.revision : null,
    sourceActivityId: null,
    originConversationId: notebook ? chat?.id || null : null,
    madeFrom: notebook ? 'notebook' : 'section',
    cardStyle: settings.cardStyle,
    mapDepth: settings.mapDepth,
    mapBreadth: settings.mapBreadth,
    storyLength: settings.storyLength,
    storyTheme: settings.storyTheme,
    storyTone: settings.storyTone,
    title,
    tag,
    difficulty,
    quizType: settings.quizType,
  };
}

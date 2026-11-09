// The things a chat shows where they were made (Phase 1.38 design §4.5; C-14): only what was made in that chat, so a
// new chat shows nothing old. Homework checks live in Homework, and a section page's items only in their sections.
// Area: family

/** The newest 12 of `activities` (the notebook home's) made in chat `chatId`; none before the chat has loaded. */
export function chatCards(activities, chatId) {
  if (!chatId) return [];
  return activities
    .filter((row) => row.conversationId === chatId && row.kind !== 'check' && row.settings?.madeFrom !== 'section')
    .slice(0, 12);
}

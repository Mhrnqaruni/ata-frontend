// Where a result's actions go (C-14, C-24; design §3.10): Ask about this to the item's own chat, or a new one with its
// materials; Explain in chat to the chat the parent came from, or the latest; Practise to the Quizzes page's dialog.
// Area: family

import { familyPath } from '../familyPaths';

/** An item's materials: its list, or its one material. */
export const itemMaterials = (activity) =>
  activity.materialIds?.length ? activity.materialIds : activity.materialId ? [activity.materialId] : [];

/**
 * Ask about this: the Notebook at the item's own chat, with today's drafted question, and that chat's materials left
 * as they are. An item with no chat gets a new one holding its materials, under `newId` when given, so a retry after a
 * failure makes only one. `go(to, options)` navigates; `api` is familyApi. Returns the chat's id.
 */
export async function askAbout({ api, activity, child, label, go, newId }) {
  const suggestion = {
    text: `Help me explain ${label} to ${child.displayName} in a simple way.`,
    id: crypto.randomUUID(),
  };
  let chat = activity.conversationId;
  if (!chat) {
    chat = newId || crypto.randomUUID();
    await api.newChat(child.id, chat);
    const ids = itemMaterials(activity);
    if (ids.length) {
      const made = await api.chat(child.id, chat);
      await api.updateChat(child.id, chat, { revision: made.revision, materialIds: ids });
    }
  }
  go(familyPath(child.id, 'notebook', '', { chat }), { state: { suggestion } });
  return chat;
}

/** Explain in chat: sent into the chat the parent came from (a chat card's address), otherwise the latest chat. */
export async function explainInChat({ api, child, from, text, go }) {
  let chat = from ? new URLSearchParams(from.split('?')[1] || '').get('chat') : '';
  if (!chat) chat = (await api.chats(child.id)).items?.[0]?.id || '';
  const suggestion = { text: text.slice(0, 3900), id: crypto.randomUUID(), send: true };
  go(familyPath(child.id, 'notebook', '', { chat }), { state: { suggestion } });
}

/**
 * Practise with a quiz, Make a quiz on this: the Quizzes page's make dialog, with the item's materials ticked (a check
 * keeps its homework upload). Its topic goes in "Describe it" only when none of them can be read. No chat changes.
 * The list comes first in the history, so the dialog closes onto it.
 */
export function practise({ activity, child, go }) {
  const ids = itemMaterials(activity);
  const topic = activity.settings?.topic || '';
  go(familyPath(child.id, 'quizzes'));
  go(`${familyPath(child.id, 'quizzes')}?dialog=make-quiz`, {
    state: {
      dialog: true,
      make: {
        materialIds: ids,
        basis: ids.length ? 'materials' : 'topic',
        topic: ids.length ? '' : topic,
        fallbackTopic: topic,
      },
    },
  });
}

// Plain-English labels and helpers for the family space: activity kinds, levels, dates, status and child colours.
// Area: family

export const kindWords = {
  learn: { label: 'Explanation', making: 'Writing an explanation', ready: 'Your explanation is ready' },
  quiz: { label: 'Quiz', making: 'Making your quiz', ready: 'Your quiz is ready' },
  flashcards: { label: 'Flashcards', making: 'Making flashcards', ready: 'Your flashcards are ready' },
  check: { label: 'Homework check', making: 'Marking the homework', ready: 'The homework is marked' },
  mindmap: { label: 'Mind map', making: 'Drawing the mind map', ready: 'Your mind map is ready' },
  story: { label: 'Story', making: 'Writing the story', ready: 'Your story is ready' },
};
// The school years a child can be in (C-22).
export const YEARS = Array.from({ length: 13 }, (_, i) => `Year ${i + 1}`);
export const levelWords = [
  ['Easy', 'Easy'],
  ['Standard', 'Medium'],
  ['Challenge', 'Hard'],
];
export const ukDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
};
export const isRunning = (row) => ['queued', 'running'].includes(row?.status);
const tones = ['#3d5bd9', '#0f8a7e', '#b4458e', '#c26a12', '#6a4bd8', '#2b7bb9'];
export const childTone = (id) => {
  let h = 0;
  for (const ch of String(id || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return tones[h % tones.length];
};
/** One line a parent can act on: what state an activity is in, in plain words. */
export function statusOf(row, attempt) {
  if (isRunning(row)) return { tone: 'busy', text: 'Making…' };
  if (row.status === 'completed')
    return attempt
      ? { tone: attempt.score === attempt.total ? 'ok' : 'brand', text: `Done · ${attempt.score} of ${attempt.total}` }
      : { tone: 'brand', text: 'Ready' };
  if (row.status === 'needs_input') return { tone: 'warm', text: 'Needs more pages' };
  return { tone: 'warm', text: 'Didn’t finish' };
}
/** AI text sometimes says "your learner"; parents know their child by name. */
export const forChild = (text, name) =>
  !text || !name ? text : text.replace(/\b(your|the) learner\b/gi, name).replace(/\blearner's\b/gi, `${name}'s`);

/**
 * A chat with nothing in it yet: still called "New chat" and untouched since it was made (a message, a rename or a
 * ticked material moves `updatedAt`). The chat lists leave these out (Phase 1.38, rows 3–4): "New chat" read as a
 * button that starts one.
 */
export const emptyChat = (chat) =>
  (chat?.title || 'New chat') === 'New chat' &&
  String(chat?.updatedAt || '').slice(0, 19) === String(chat?.createdAt || '').slice(0, 19);

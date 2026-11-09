// A result address's rules (design §3.10, §5.5, Phase 1.38 §6.4; C-2): what it shows, its back link, the line under
// its name, the words that ask before a new version, and the request that makes one, which then replaces the address.
// Area: family

import { familyPath } from '../familyPaths';
import { RESULT_SEGMENTS, resultPath, sectionOf } from '../sections';
import { whenLabel } from '../whenLabel';

/**
 * What a result address shows: 'wait' while the item loads; 'unavailable' for an unknown id or another child's item
 * (the server answers 404 for both, so nothing leaks) or a kind with no result page; 'error' when it couldn't load;
 * { redirect } to the item's right address when it was opened under another kind; otherwise 'show'.
 */
export function resultState({ activity, error, segment, childId }) {
  if (error) return [403, 404].includes(error.response?.status) ? 'unavailable' : 'error';
  if (!activity) return 'wait';
  const right = RESULT_SEGMENTS[activity.kind];
  if (!right) return 'unavailable';
  return right === segment ? 'show' : { redirect: resultPath(childId, activity) };
}

/**
 * The back link: where the parent came from (`from`, a family address in the history's state), or the item's section
 * when the address was opened directly. Its words name that place as the sidebar does (Phase 1.38 design §1.8, §6.5):
 * "Back to Quizzes", "Back to Sam", "Back to Assistant".
 */
export function backLink({ from, segment, childId, childName }) {
  const to = from || familyPath(childId, segment.split('/')[0]);
  const place = sectionOf(to.split('?')[0]);
  const words = { child: childName, profile: `${childName}’s profile` }; // the profile: Phase 1.38 design §3.3
  return { to, label: `Back to ${words[place.id] ?? place.label}` };
}

const FOR = { quiz: 'Quiz', flashcards: 'Flashcards', mindmap: 'Mind map', story: 'Story', learn: 'Explanation' };

const lower = (label) => (label ? label[0].toLowerCase() + label.slice(1) : '');

/**
 * The line under an opened item's name (Phase 1.38 design §6.4, §5.5): "Quiz to do with Sam", or "Quiz · tried today
 * at 11:30" once tried (`triedAt`, its latest attempt); "Flashcards to do with Sam"; "Mind map · made 5 Nov"; "Story to
 * read with Sam · made today"; "Homework · marked today at 16:20". "Quiz for Sam · 5 questions" made a tester think
 * the child does it alone. `now` is there for tests.
 */
export function itemLine(activity, childName, now = new Date(), triedAt = null) {
  if (!activity) return '';
  const done = activity.status === 'completed';
  const at = lower(whenLabel(activity.finishedAt || activity.createdAt, now));
  if (activity.kind === 'check') return done && at ? `Homework · marked ${at}` : 'Homework';
  if (activity.kind === 'quiz') {
    const tried = triedAt && lower(whenLabel(triedAt, now));
    return tried ? `Quiz · tried ${tried}` : `Quiz to do with ${childName}`;
  }
  if (activity.kind === 'flashcards') return `Flashcards to do with ${childName}`;
  // A made item says its day, not the minute (the Designer, row 9): "made today", "made 5 Nov".
  const day = at.replace(/ at \d\d:\d\d$/, '');
  const head = activity.kind === 'story' ? `Story to read with ${childName}` : FOR[activity.kind] || 'Activity';
  return done && day ? `${head} · made ${day}` : head;
}

/**
 * What a new version asks first (Phase 1.38 design §10.6): its title, the sentence that says what's kept, and the
 * button that repeats the verb. A failed item asks to try again, and one that may have finished after all says so.
 */
export function newVersionWords(activity) {
  const unsure = activity?.status === 'outcome_unknown';
  if (activity && !unsure && activity.status !== 'completed')
    return {
      title: 'Try again?',
      sentence: 'MySmartTeach makes it again from the same choices. It takes about a minute.',
      verb: 'Try again',
    };
  const quiz = activity?.kind === 'quiz';
  const verb = {
    quiz: 'Make new questions',
    flashcards: 'Make new cards',
    mindmap: 'Make a new map',
    story: 'Make a new story',
  }[activity?.kind];
  const title = {
    quiz: 'Make new questions?',
    flashcards: 'Make new flashcards?',
    mindmap: 'Make a new mind map?',
    story: 'Make a new story?',
  }[activity?.kind];
  const count = Number(activity?.count) || activity?.result?.questions?.length || 5;
  let sentence = 'MySmartTeach makes a new one on the same topic. This one is kept.';
  if (quiz)
    sentence = `MySmartTeach writes ${count} new questions on the same topic. It takes about a minute. This quiz and its score are kept.`;
  if (unsure) sentence = 'The last one may have finished already. Making another uses AI again.';
  return { title: title || 'Make a new one?', sentence, verb: verb || 'Make a new one' };
}

/**
 * The request for a new version of an item ("New questions", "New cards", or Try again after a failure): today's
 * remake. The server copies the item's saved settings, its chat card's chat and where it was made, so no chat is sent.
 */
export function newVersionRequest(activity, newAttemptKey) {
  const settings = activity.settings || {};
  const fromMaterials = activity.basis === 'materials';
  const ids = activity.materialIds?.length ? activity.materialIds : activity.materialId ? [activity.materialId] : [];
  const fromChat = activity.basis === 'conversation';
  return {
    materialId: fromMaterials ? ids[0] : null,
    materialIds: fromMaterials ? ids : [],
    kind: activity.kind,
    count: Number(activity.count) || 5,
    focus: activity.focus || '',
    basis: activity.basis,
    topic: settings.topic,
    conversationId: fromChat ? settings.conversationId : null,
    conversationRevision: fromChat ? settings.conversationRevision : null,
    sourceActivityId: activity.id,
    originConversationId: null,
    cardStyle: settings.cardStyle || 'question_answer',
    mapDepth: settings.mapDepth || 3,
    mapBreadth: settings.mapBreadth || 4,
    storyLength: settings.storyLength || 'short',
    storyTheme: settings.storyTheme || '',
    storyTone: settings.storyTone || 'calm',
    title: activity.title,
    tag: activity.tag,
    difficulty: activity.difficulty,
    quizType: activity.quizType,
    newAttemptKey,
  };
}

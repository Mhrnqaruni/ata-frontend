// The teacher's live page calls (SOT-9): the run, who is in it, the main buttons (start, show answers, next question,
// finish), the pace before the start, and one question's answer counts once answers show (LV7).
// Area: quizzes

import api, { apiError } from '../../../services/api';
import { cacheFamilies, invalidateTeacher } from '../../../services/queryCache';

const run = (sessionId, path = '') => `/api/quiz-sessions/${encodeURIComponent(sessionId)}${path}`;

// A refusal as an Error with the server's sentence (or the fallback) and its status.
const refused = (error, fallback) =>
  Object.assign(apiError(error, fallback), { status: error?.response?.status ?? null });

async function read(path, fallback, config) {
  try {
    return (await api.get(path, config)).data;
  } catch (error) {
    throw refused(error, fallback);
  }
}

async function command(path, fallback, body, config) {
  try {
    return (await api.post(path, body, config)).data;
  } catch (error) {
    throw refused(error, fallback);
  }
}

// The run: its code, state, settings (config_snapshot), and its questions with their right answers.
export const getRun = (sessionId, { signal } = {}) => read(run(sessionId), "Couldn't load this quiz.", { signal });

// A quiz's runs, newest first, each with its classes: the header names this run's classes from it.
export const getRuns = (quizId, { signal } = {}) =>
  read(`/api/quizzes/${encodeURIComponent(quizId)}/runs`, "Couldn't load the quiz's classes.", { signal });

// Who is in the run: everyone who joined, and, for a run with a class list, the list and the walk-ins. The list and
// the walk-ins are optional: without them the page still shows who joined.
export async function getPeople(sessionId, { hasClassList, signal } = {}) {
  const optional = (path, fallback) =>
    hasClassList ? read(run(sessionId, path), '', { signal }).catch(() => fallback) : fallback;
  const [participants, roster, walkIns] = await Promise.all([
    read(run(sessionId, '/participants'), "Couldn't load who has joined.", { signal }),
    optional('/roster', null),
    optional('/outsiders', { records: [] }),
  ]);
  return { participants: participants || [], roster, walkIns: walkIns?.records || [] };
}

// One question's answers in this run (LV7): { total_responses, correct_responses, options_distribution }, where the
// distribution counts each answer by its index ("0", "1", …). The run's own read, so a quiz run again counts only
// this run's answers.
export async function getAnswerCounts(sessionId, questionId, { signal } = {}) {
  const results = await read(run(sessionId, '/analytics'), "Couldn't load the answer counts.", { signal });
  return (results?.question_analytics || []).find((item) => String(item.question_id) === String(questionId)) || null;
}

// The main buttons. Show answers closes the open question (next-question's early close); Next question moves on
// (skip-cooldown). Finishing refreshes the quiz pages' data, so the list shows the quiz as finished.
export const startQuiz = (sessionId) => command(run(sessionId, '/start'), "Couldn't start the quiz.");
export const showAnswers = (sessionId) => command(run(sessionId, '/next-question'), "Couldn't show the answers.");
export const nextQuestion = (sessionId) =>
  command(run(sessionId, '/skip-cooldown'), "Couldn't move to the next question.");
export async function finishQuiz(sessionId) {
  const result = await command(run(sessionId, '/end'), "Couldn't finish the quiz.", { reason: 'completed' });
  void invalidateTeacher(cacheFamilies.quiz);
  return result;
}

// The pace, before the start (DR-7). The quiz's own pause between questions always goes with it (QA P3-1), because
// the call resets it to 10 s when it's left out.
export const setPace = (sessionId, auto, cooldownSeconds) =>
  command(run(sessionId, '/toggle-auto-advance'), "Couldn't change the pace.", null, {
    params: { enabled: auto, cooldown_seconds: cooldownSeconds },
  });

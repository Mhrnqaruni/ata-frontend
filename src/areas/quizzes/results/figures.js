// The results page's logic, with no React (Phase 1.46 SOT-7, Phase 1.47 SOT-7 C8; design.md §3.8): points as
// teachers read them, who finished, below half the points, blanks, the hardest questions, and each review's address.
// Area: quizzes

import { reviewLink } from '../review/links';

// Live runs are open while waiting, active or paused; homework while active or paused (backend open_runs.py).
const OPEN = { live: ['waiting', 'active', 'paused'], homework: ['active', 'paused'] };

// Whether a run (or a summary, which has the same kind and status) is still open.
export const isOpen = (run) => Boolean(run && OPEN[run.kind]?.includes(run.status));

// Points without a needless ".0": 86, 86.5, 120. An average keeps one decimal place. Missing: null, never 0.
export function points(value) {
  if (value === null || value === undefined || value === '' || !Number.isFinite(Number(value))) return null;
  const rounded = Math.round(Number(value) * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

// "86 / 120", or null when there's no score yet.
export function scoreOutOf(score, max) {
  const shown = points(score);
  return shown === null ? null : `${shown} / ${points(max) ?? '?'}`;
}

// A pupil's score as a result: only once they've finished, because a score so far isn't a result (as the homework
// page shows it). Null otherwise, and while a short answer waits for its mark.
export const resultScore = (pupil) => (pupil.status === 'done' ? (pupil.score ?? null) : null);

// The pupils the summary's average covers: those who finished with a score (runs.py's _average).
export const finished = (pupils) => (pupils || []).filter((pupil) => resultScore(pupil) !== null);

// Below half the points (Q3): the summary's needs_help for class pupils; worked out the same way for walk-ins.
export const isBelowHalf = (pupil, max) =>
  pupil.needs_help ?? (resultScore(pupil) !== null && Number(pupil.score) < Number(max) / 2);

export const belowHalf = (pupils, max) => (pupils || []).filter((pupil) => isBelowHalf(pupil, max));

// A finished pupil who answered nothing (C8's `answered`); unknown until the summary says.
export const answeredNothing = (pupil) => pupil.status === 'done' && pupil.answered === 0;

const isPoll = (question) => question.correct === null || question.correct === undefined;

// How many got a question wrong: answers marked, less those right. A poll has no wrong answers.
export const wrongCount = (question) => (isPoll(question) ? 0 : Math.max(0, question.answered - question.correct));

// How many finished pupils left it blank (C8's `no_answer`, finished attempts only).
export const blankCount = (question) => Math.max(0, Number(question.no_answer) || 0);

// Everyone who finished and met the question: its marked answers and its blanks.
export const attemptsAt = (question) => (Number(question.answered) || 0) + blankCount(question);

// Who it tripped up: wrong or blank, since a blank counts as not right (design.md §3.8). Polls trip nobody up.
export const missedCount = (question) => (isPoll(question) ? 0 : wrongCount(question) + blankCount(question));

// The hardest question that tripped someone up; the summary lists questions hardest first, blanks counted.
export const hardest = (questions) => (questions || []).find((question) => missedCount(question) > 0) ?? null;

// The questions fewer than half got right, of all who met them, hardest first: where the sentence says to start.
export const tricky = (questions) =>
  (questions || []).filter((q) => !isPoll(q) && attemptsAt(q) > 0 && q.correct / attemptsAt(q) < 0.5);

// Whether anyone answered any question.
export const answeredAny = (questions) => (questions || []).some((question) => question.answered > 0);

// Every answer the finished pupils gave or left blank, and how many of them were blank.
export const blanksOf = (questions) => ({
  blank: (questions || []).reduce((sum, question) => sum + blankCount(question), 0),
  total: (questions || []).reduce((sum, question) => sum + attemptsAt(question), 0),
});

// The pupils a question filter keeps: those who got it wrong or left it blank (C8's `missed_by`, by pupil id).
export const missedBy = (question, pupils) => {
  const ids = new Set((question?.missed_by || []).map(String));
  return (pupils || []).filter((pupil) => ids.has(String(pupil.id)));
};

const byNameOrder = (a, b) => String(a.name).localeCompare(String(b.name), 'en-GB', { sensitivity: 'base' });

// Where pupils with no result go, after those with one: waiting for a mark, working, not started, then absent.
const NO_RESULT_ORDER = { done: 0, working: 1, not_started: 2, absent: 3 };

// Lowest score first (design.md §3.8), or highest with order 'desc'; pupils with no result always follow, by
// NO_RESULT_ORDER, then by name.
export function byScore(pupils, order = 'asc') {
  const sign = order === 'desc' ? -1 : 1;
  return [...(pupils || [])].sort((a, b) => {
    const left = resultScore(a);
    const right = resultScore(b);
    if (left !== null && right !== null) return sign * (left - right) || byNameOrder(a, b);
    if (left !== null || right !== null) return left === null ? 1 : -1;
    return (NO_RESULT_ORDER[a.status] ?? 9) - (NO_RESULT_ORDER[b.status] ?? 9) || byNameOrder(a, b);
  });
}

// A to Z, or Z to A with order 'desc'.
export const byName = (pupils, order = 'asc') =>
  [...(pupils || [])].sort((a, b) => (order === 'desc' ? -1 : 1) * byNameOrder(a, b));

// Whether a pupil has a report in the run's ZIP: they finished, and their score is in.
export const hasReport = (pupil) => resultScore(pupil) !== null;

// A pupil's review page (Lane 4's reviewLink, design.md §3.9), by their attempt (C8's `attempt_id`: a live participant
// or a homework progress row). Null for a pupil who never started, who has nothing to review.
export const reviewPath = (quizId, runId, pupil) =>
  pupil?.attempt_id ? reviewLink(quizId, runId, pupil.attempt_id) : null;

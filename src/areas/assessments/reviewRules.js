// The assessment review page's rules (Phase 1.47 S4.3; SOT-6, QA N-1): each question's mark and feedback, when a mark
// may be saved, its square on the map, the student's total, and what a refused save means.
// Area: assessments

import { validMark } from '../../components/review/cardSaver';
import { REVIEW } from '../../components/review/words';

// The map's legend in assessment words, matching the cards' chips ("Pending review", "Teacher graded").
export const LEGEND = {
  right: 'Full marks',
  wrong: 'No marks',
  part: 'Part marks',
  none: 'Not marked',
  waiting: 'Pending review',
  changed: 'Teacher graded',
};

export const idOf = (q) => String(q.questionId);
export const isHeld = (q) => q.status === 'PENDING_REVIEW'; // no AI mark: the teacher types one (design §3.5)
const maxOf = (q) => Number(q.maxScore ?? 100);
// A saved grade as a number, or null: a held answer has none, and none is never 0.
export const gradeOf = (q) => (q.grade === null || q.grade === undefined || q.grade === '' ? null : Number(q.grade));

// A card's values: the mark as text ('' when there's none) and the feedback.
export const valuesOf = (q) => ({ mark: gradeOf(q) === null ? '' : String(gradeOf(q)), comment: q.feedback ?? '' });
// A mark is saved only when it's a number from 0 to the question's maximum (N-1): a comment alone sends nothing.
export const isValid = (values, q) => validMark(values.mark, maxOf(q));
// Undo sends the earlier mark again, and the save needs a number, so a held answer's first mark has no Undo.
export const canUndo = (before) => isValid(valuesOf(before), before);

// The card's title: "Question 4", or with the paper's own label, "Question 1.1".
export function titleOf(q, number) {
  const label = q.printedLabel || String(number);
  return /^q/i.test(label) ? label : REVIEW.question(label);
}

// A question's square: full, part or no marks once it has a mark, held answers pending review, and a dot once the
// teacher has marked it. "Needs a look" shows what today's "Needs review" showed: the held answers.
export function mapItem(q, number) {
  const grade = gradeOf(q);
  let state = 'part';
  if (grade === null) state = isHeld(q) ? 'waiting' : 'none';
  else if (grade >= maxOf(q)) state = 'right';
  else if (grade <= 0) state = 'wrong';
  const label = q.printedLabel || String(number);
  return { id: idOf(q), label, state, changed: q.status === 'TEACHER_GRADED', needsLook: isHeld(q) };
}

// The header's total and maximum. The total stays null ("—") until every question has a mark.
export function totals(questions) {
  const grades = questions.map(gradeOf);
  const maximum = questions.reduce((sum, q) => sum + maxOf(q), 0);
  const total = grades.every((grade) => grade !== null) ? grades.reduce((sum, grade) => sum + grade, 0) : null;
  return { total, maximum };
}

// The save, as the server takes it: the mark as a number, the feedback, and the revision the card last saw.
export const saveBody = (values, record) => ({
  grade: Number(values.mark),
  feedback: values.comment ?? '',
  expectedRevision: record.revisionHash,
});

// The record after a save: Teacher graded, with its new revision. The server keeps no earlier state (SOT-6), so an
// Undo is a save of the earlier values and stays Teacher graded.
export const afterSave = (record, body, confirmation) => ({
  ...record,
  grade: body.grade,
  feedback: body.feedback,
  status: 'TEACHER_GRADED',
  revisionHash: confirmation?.resultRevision ?? record.revisionHash,
});

// A refused save, for the card. The service keeps the server's sentence but not its status: the stale-revision
// sentence (sent with 422) means "Changed somewhere else"; any other sentence of the server's says why it failed.
const STALE = /changed after you opened it/i;
const FALLBACK = 'Could not save changes.'; // reviewService's words when the server gave none
export function refusal(error) {
  const failure = error instanceof Error ? error : new Error(FALLBACK);
  const message = failure.message ?? '';
  return Object.assign(failure, {
    status: STALE.test(message) ? 409 : null,
    reason: message && message !== FALLBACK ? message : null,
  });
}

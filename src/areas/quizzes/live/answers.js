// A live question's answers as rows to draw (design.md §3.7; LV7): each one's letter and words, whether it's the right
// answer, and how many chose it, filled in only once answers show; and the line of how many got it right (C9).
// Area: quizzes

import { LIVE } from './words';

const LETTERS = 'ABCDEFGH';

// "2 of 2 right · 1 with part points" (C9's part_points: right with fewer than full points). While some answers still
// wait for a mark (C9's waiting, after a failed marking), how many wait instead, so the count is never a wrong one.
export function rightLine(counts, answered) {
  const waiting = Number(counts?.waiting) || 0;
  if (waiting > 0) return LIVE.toMarkLater(waiting);
  const part = Number(counts?.part_points) || 0;
  const right = LIVE.rightOf(Number(counts?.correct_responses) || 0, answered);
  return part > 0 ? `${right} · ${LIVE.partPoints(part)}` : right;
}

// The answers' words: True and False for a true-or-false question, whose options can be empty.
export function answerTexts(question) {
  return question?.type === 'true_false' ? ['True', 'False'] : (question?.options || []).map(String);
}

// The indexes of the right answers, from the run's copy of the question: an option index for multiple choice, or
// true (0) and false (1). A poll and a short answer have none.
export function rightIndexes(question, keyQuestion) {
  const answers = keyQuestion?.correct_answer || [];
  if (question?.type === 'multiple_choice') return new Set(answers.map(Number).filter(Number.isInteger));
  if (question?.type === 'true_false' && answers.length) {
    return new Set([answers[0] === true || String(answers[0]).toLowerCase() === 'true' ? 0 : 1]);
  }
  return new Set();
}

// [{ index, letter, text, right, count, share }]. Until revealed, nothing gives the answer away: no right mark and no
// counts. counts: the question's answer counts (LV7); count and share stay null without them.
export function answerRows(question, keyQuestion, { revealed = false, counts = null } = {}) {
  const right = revealed ? rightIndexes(question, keyQuestion) : new Set();
  const spread = (revealed && counts?.options_distribution) || null;
  const chose = spread ? Object.values(spread).reduce((sum, value) => sum + (Number(value) || 0), 0) : 0;
  return answerTexts(question).map((text, index) => {
    const count = spread ? Number(spread[String(index)]) || 0 : null;
    return {
      index,
      letter: LETTERS[index] || String(index + 1),
      text,
      right: right.has(index),
      count,
      share: spread ? (chose ? count / chose : 0) : null,
    };
  });
}

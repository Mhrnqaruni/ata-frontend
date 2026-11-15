// The quiz review page's logic, with no React (Phase 1.47 S4.2; SOT-1 C3, SOT-4; design.md §3.9): each answer's state
// for the map and its chip, what needs a look, the answers in words, a card's values, and the pupils' order for ‹ ›.
// Area: quizzes

import { validMark } from '../../../components/review/cardSaver';
import { formatDate } from '../../../utils/dates';
import { byScore } from '../results/figures';
import { classList } from '../words';
import { PUPIL_REVIEW } from './words';

const blank = { state: 'no_answer', points: null, comment: null, value: null };
const answerOf = (question) => question.answer ?? blank;
const given = (item) => item !== null && item !== undefined && item !== '';

// What a pupil chose or typed, as a list. Live answers are lists ([1], [true], ["text"]) and homework answers objects
// ({ selected_index: 1 }, { selected_value: true }, { text: "…" }); a blank is [] or {}.
export function chosen(value) {
  let item = value;
  if (item && typeof item === 'object' && !Array.isArray(item)) item = Object.values(item)[0];
  if (!given(item)) return [];
  return (Array.isArray(item) ? item : [item]).filter(given);
}

// A question's state on the map and on its chip, by points: full points are right, none wrong, anything between part
// marks; also no answer, waiting for a mark, and plain for a poll, which has no right answer.
export function stateOf(question) {
  const answer = answerOf(question);
  if (question.type === 'poll') return 'plain';
  if (answer.state === 'waiting_for_mark') return 'waiting';
  const points = Number(answer.points) || 0;
  if (answer.state === 'no_answer' && points <= 0) return 'none';
  const max = Number(question.points) || 0;
  if (max <= 0) return answer.is_correct ? 'right' : 'wrong';
  if (points >= max) return 'right';
  return points <= 0 ? 'wrong' : 'part';
}

export const changedByTeacher = (question) => answerOf(question).marked_by === 'teacher';

// "Needs a look" (design.md §3.9): wrong, part marks, no answer or waiting for a mark. Quizzes have no "AI unsure".
export const needsLook = (question) => ['wrong', 'part', 'none', 'waiting'].includes(stateOf(question));

// The chip's key in PUPIL_REVIEW.chips: "Marked by you" once a teacher has marked it, else its state; none for a poll.
export function chipOf(question) {
  if (changedByTeacher(question)) return 'teacher';
  const state = stateOf(question);
  return state === 'plain' ? null : state;
}

export const mapItem = (question) => ({
  id: String(question.question_id),
  label: String(question.number),
  state: stateOf(question),
  changed: changedByTeacher(question),
  needsLook: needsLook(question),
});

// A poll has no mark (C4 refuses one), so it has no fields to save.
export const markable = (question) => question.type !== 'poll';

export const questionId = (question) => String(question.question_id);

// A card's values: the mark as typed text, '' while it waits for one (never a made-up 0), and the comment.
export function valuesOf(question) {
  const answer = answerOf(question);
  const none = answer.state === 'waiting_for_mark' || answer.points === null || answer.points === undefined;
  return { mark: none ? '' : String(answer.points), comment: answer.comment ?? '' };
}

// A quiz mark is a whole number from 0 to the question's points (C4).
export const isValid = (values, question) => validMark(values.mark, question.points, { whole: true });

const truth = (item) => {
  const word = String(item).toLowerCase();
  if (item === true || word === 'true') return true;
  return item === false || word === 'false' ? false : null;
};

// An option's place: an index, or the option's own words.
const placeOf = (item, options) => {
  if (typeof item === 'number') return item;
  const at = options.indexOf(String(item));
  return at >= 0 || !/^\d+$/.test(String(item)) ? at : Number(item);
};

// The options as rows, { key, letter, text, chosen, right }, for multiple choice, true or false, and polls.
export function optionRows(question) {
  const picked = chosen(answerOf(question).value);
  const right = question.type === 'poll' ? [] : (question.correct_answer ?? []);
  if (question.type === 'true_false') {
    return [true, false].map((value) => ({
      key: String(value),
      letter: null,
      text: value ? PUPIL_REVIEW.trueWord : PUPIL_REVIEW.falseWord,
      chosen: picked.some((item) => truth(item) === value),
      right: right.some((item) => truth(item) === value),
    }));
  }
  const options = (question.options ?? []).map(String);
  const pickedAt = picked.map((item) => placeOf(item, options));
  const rightAt = right.map((item) => placeOf(item, options));
  return options.map((text, index) => ({
    key: String(index),
    letter: String.fromCharCode(65 + index),
    text,
    chosen: pickedAt.includes(index),
    right: rightAt.includes(index),
  }));
}

// A typed answer's words, or null when there's none.
export const typedAnswer = (question) => chosen(answerOf(question).value).map(String).join(', ') || null;

// "Accepted: Iran, Persia · Same meaning". Questions written before Phase 1.47 are Same meaning (OQ3).
export function acceptedLine(question) {
  const answers = (question.correct_answer ?? []).map(String).filter(Boolean);
  const level = PUPIL_REVIEW.levels[question.match_level] ?? PUPIL_REVIEW.levels.meaning;
  return `${PUPIL_REVIEW.accepted}: ${answers.join(', ') || '—'} · ${level}`;
}

// Whether the pupil left every question blank.
export const allBlank = (questions) => questions.length > 0 && questions.every((q) => stateOf(q) === 'none');

// The header's context line: "Year 9 Cells · 14 Nov · 8B".
export function contextLine(run) {
  const classes = (run?.classes ?? []).map((item) => (typeof item === 'string' ? { name: item } : item));
  const day = formatDate(run?.date, { year: 'auto' });
  return [run?.quiz_title, day, classes.length ? classList(classes) : null].filter(Boolean).join(' · ');
}

// The pupils with answers to review, in the results page's order: class pupils lowest score first, then those not on
// the class list. Each is { id, name }, by attempt_id, the id C3 takes; rows with none (absent, not started) are skipped.
export function reviewOrder(summary) {
  const rows = [...byScore(summary?.pupils ?? []), ...byScore(summary?.not_on_class_list ?? [])];
  return rows.filter((row) => row.attempt_id).map((row) => ({ id: String(row.attempt_id), name: row.name }));
}

// The pupils before and after this one in that order, or null at either end.
export function neighboursOf(order, pupilId) {
  const at = order.findIndex((row) => row.id === String(pupilId));
  return at < 0 ? { previous: null, next: null } : { previous: order[at - 1] ?? null, next: order[at + 1] ?? null };
}

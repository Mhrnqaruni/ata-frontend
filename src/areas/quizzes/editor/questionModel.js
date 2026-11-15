// The quiz editor's question helpers (Phase 1.46, SOT-12; design.md §3.4): a new question of each type, changing the
// type while keeping what fits, the answers' edits, what a closed card shows, and the questions as the API takes them.
// Area: quizzes

import { draftQuestion, editableQuestion } from './draft';
import { levelOf, NEW_LEVEL } from './matchLevels';
import { MATCH } from './words';

export const MAX_QUESTIONS = 100; // the server refuses a 101st (live_commands.py)
export const MAX_ANSWERS = { multiple_choice: 6, poll: 10 }; // models/quiz_model.py's limits
export const POINTS = { min: 0, max: 100, start: 10 };
export const SECONDS = { min: 5, max: 300, start: 30 };

const filled = (text) => String(text ?? '').trim() !== '';
const BOXES = { multiple_choice: 4, poll: 2 }; // empty answer boxes a new question starts with

let made = 0;
// Each question's key in the editor. It stays the same across saves, while the server gives a saved question a new id.
export const newKey = () => `q${Date.now().toString(36)}-${(made += 1)}`;

export const letter = (index) => String.fromCharCode(65 + index);

export function blankQuestion(type = 'multiple_choice') {
  return {
    key: newKey(),
    question_type: type,
    question_text: '',
    options: Array(BOXES[type] || 0).fill(''),
    correct_answer: [],
    points: type === 'poll' ? 0 : POINTS.start,
    time_limit_seconds: SECONDS.start,
    explanation: null,
    media_url: null,
    match_level: NEW_LEVEL, // Close for a question written now (Phase 1.47 C1); it counts once it's a typed answer
  };
}

// An AI-imported question as the editor keeps it: a new question, so Close unless the import says otherwise (C1).
export function importedQuestion(question) {
  return {
    ...blankQuestion(question.question_type),
    question_text: question.question_text ?? '',
    options: question.options ?? [],
    correct_answer: question.correct_answer ?? [],
    points: question.points ?? (question.question_type === 'poll' ? 0 : POINTS.start),
    time_limit_seconds: question.time_limit_seconds ?? SECONDS.start,
    explanation: question.explanation ?? null,
    match_level: levelOf(question, NEW_LEVEL),
  };
}

// A loaded quiz's questions in their order, each with a key, its level (a question saved before the levels keeps
// "meaning", C1) and at least 2 answer boxes on a choice question.
export function editableQuestions(questions) {
  return [...(questions || [])]
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    .map((question) => ({ ...editableQuestion(question), match_level: levelOf(question), key: newKey() }));
}

// The questions as POST and PUT /api/quizzes take them, in their order: empty answer boxes and empty accepted answers
// dropped, with a multiple-choice right answer moved along (SOT-1.3). Every question sends its level (C1).
export function savedQuestions(questions) {
  return questions.map((question, index) => {
    const saved = draftQuestion(question);
    const short = saved.question_type === 'short_answer';
    return {
      question_type: saved.question_type,
      question_text: saved.question_text ?? '',
      options: short ? [] : (saved.options ?? []),
      correct_answer: short ? (saved.correct_answer ?? []).filter(filled) : (saved.correct_answer ?? []),
      points: saved.points ?? (saved.question_type === 'poll' ? 0 : POINTS.start),
      time_limit_seconds: saved.time_limit_seconds ?? SECONDS.start,
      explanation: filled(saved.explanation) ? saved.explanation : null,
      media_url: saved.media_url || null,
      match_level: levelOf(saved),
      order_index: index,
    };
  });
}

// "Answer C", "Answers C and D", "Answers B, C and D".
function answersPhrase(positions) {
  const letters = positions.map(letter);
  if (letters.length === 1) return `Answer ${letters[0]}`;
  return `Answers ${letters.slice(0, -1).join(', ')} and ${letters[letters.length - 1]}`;
}

const filledPositions = (options, from = 0) =>
  (options || []).flatMap((text, position) => (position >= from && filled(text) ? [position] : []));
const truth = (text) =>
  ({ true: true, false: false })[
    String(text ?? '')
      .trim()
      .toLowerCase()
  ];

// The question as another type, keeping what fits, and what had to go ("Answers C and D removed"), or null when
// nothing typed was lost: the words for the Undo message (design.md §3.4).
export function changeType(question, type) {
  if (question.question_type === type) return { question, removed: null };
  const from = question.question_type;
  const options = question.options || [];
  const right = question.correct_answer || [];
  const rightText = from === 'multiple_choice' && Number.isInteger(right[0]) ? options[right[0]] : null;
  const next = { ...question, question_type: type };
  let removed = null;
  if (type === 'poll') next.points = 0;
  else if (from === 'poll' && !question.points) next.points = POINTS.start;

  if (type === 'multiple_choice' || type === 'poll') {
    const max = MAX_ANSWERS[type];
    if (from === 'true_false') {
      next.options = ['True', 'False'];
      next.correct_answer = type === 'poll' || typeof right[0] !== 'boolean' ? [] : [right[0] ? 0 : 1];
    } else if (from === 'short_answer') {
      // The first accepted answer becomes the right answer A; a poll has no right answer, so they all go.
      const accepted = right.filter(filled);
      next.options = type === 'poll' ? ['', ''] : [accepted[0] ?? '', '', '', ''];
      next.correct_answer = type === 'multiple_choice' && accepted.length ? [0] : [];
      if (type === 'poll' && accepted.length) removed = 'Accepted answers';
      else if (accepted.length > 1) removed = 'Other accepted answers';
    } else {
      const cut = filledPositions(options, max);
      next.options = options.slice(0, max);
      next.correct_answer = type === 'poll' ? [] : right.filter((position) => position < max);
      if (cut.length) removed = answersPhrase(cut);
      else if (type === 'poll' && rightText && filled(rightText)) removed = 'The right answer';
    }
    while (next.options.length < 2) next.options = [...next.options, ''];
  } else if (type === 'true_false') {
    // Answers that say True or False aren't lost: the question has those two buttons.
    const gone = filledPositions(options).filter((position) => truth(options[position]) === undefined);
    next.options = [];
    next.correct_answer = [truth(rightText ?? (from === 'short_answer' ? right[0] : null))].filter(
      (value) => typeof value === 'boolean'
    );
    if (gone.length) removed = answersPhrase(gone);
    else if (from === 'short_answer' && right.some(filled) && !next.correct_answer.length) removed = 'Accepted answers';
  } else {
    // short_answer: the right answer's words become the accepted answer; the other answers go.
    const keep = from === 'true_false' && typeof right[0] === 'boolean' ? (right[0] ? 'True' : 'False') : rightText;
    const gone = filledPositions(options).filter((position) => position !== right[0] || !filled(rightText));
    next.options = [];
    next.correct_answer = filled(keep) ? [String(keep).trim()] : [];
    if (gone.length) removed = answersPhrase(gone);
  }
  return { question: next, removed: removed && `${removed} removed` };
}

// One answer box's words.
export function setOption(question, position, text) {
  const options = [...(question.options || [])];
  options[position] = text;
  return { ...question, options };
}

export function addOption(question) {
  const max = MAX_ANSWERS[question.question_type] ?? 0;
  const options = question.options || [];
  return options.length >= max ? question : { ...question, options: [...options, ''] };
}

// Removes an answer box. A multiple-choice right answer is its box's position, so it moves up, or goes with its box.
export function removeOption(question, position) {
  const options = (question.options || []).filter((_, index) => index !== position);
  const correct =
    question.question_type === 'multiple_choice'
      ? (question.correct_answer || []).flatMap((answer) =>
          answer === position ? [] : [Number.isInteger(answer) && answer > position ? answer - 1 : answer]
        )
      : question.correct_answer;
  return { ...question, options, correct_answer: correct };
}

// Marks the right answer: a box's position for multiple choice, true or false for true or false. One only.
export function markRight(question, value) {
  return { ...question, correct_answer: [value] };
}

// What a closed card shows under the question: each answer, with ✓ on the right one (design.md §3.4); a typed answer's
// accepted answers, then its level ("Accepted: carbon dioxide, CO2 · Close", Phase 1.47 §3.7).
export function answerParts(question) {
  const right = question.correct_answer || [];
  if (question.question_type === 'true_false')
    return [
      { text: 'True', right: right[0] === true },
      { text: 'False', right: right[0] === false },
    ];
  if (question.question_type === 'short_answer') {
    const accepted = right.filter(filled);
    if (!accepted.length) return [];
    return [
      { text: `Accepted: ${accepted.join(', ')}`, right: false },
      { text: MATCH.levels[levelOf(question)].label, right: false },
    ];
  }
  return (question.options || []).flatMap((text, position) =>
    filled(text) ? [{ text, right: question.question_type === 'multiple_choice' && right.includes(position) }] : []
  );
}

// "10 pts · 30 s" on a live quiz, "10 pts" on homework, which has no question timer; a poll gives no points.
export function factsOf(question, live) {
  const points = question.question_type === 'poll' ? 'No points' : `${question.points ?? POINTS.start} pts`;
  return live ? `${points} · ${question.time_limit_seconds ?? SECONDS.start} s` : points;
}

// The questions that a Find or Go to text picks, as their places: "57" is question 57, a word is every question
// with it in its words or answers. An empty text picks every question.
export function questionMatches(questions, text) {
  const wanted = String(text ?? '')
    .trim()
    .toLowerCase();
  const all = questions.map((_, index) => index);
  if (!wanted) return all;
  if (/^\d+$/.test(wanted))
    return Number(wanted) >= 1 && Number(wanted) <= questions.length ? [Number(wanted) - 1] : [];
  return all.filter((index) => {
    const question = questions[index];
    const words = [question.question_text, ...(question.options || []), ...(question.correct_answer || [])];
    return words.some((each) => typeof each === 'string' && each.toLowerCase().includes(wanted));
  });
}

// The list with one item moved from one place to another.
export function moveItem(list, from, to) {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

// A copy of a question, which the server saves as a new one.
export function copyOf(question) {
  const copy = { ...question, key: newKey() };
  delete copy.id;
  return copy;
}

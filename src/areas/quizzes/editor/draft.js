// The quiz editor's save rules (Phase 1.46, SOT-1.3, copied from pages/quizzes/quizDraft.js): a draft saves
// unfinished work with empty answer boxes dropped, and Finish editing lists everything unfinished, each with Go to.
// Area: quizzes

const CHOICES = ['multiple_choice', 'poll'];
const filled = (text) => String(text ?? '').trim() !== '';

// The question as it's saved. A choice question keeps only the answer boxes that have text, and a multiple-choice
// right answer, stored as its box's position, moves with them; one whose box was empty goes. Polls have none.
export function draftQuestion(question) {
  if (!CHOICES.includes(question.question_type)) return question;
  const kept = [];
  const moved = {}; // each kept box's old position -> its new one
  (question.options || []).forEach((text, position) => {
    if (filled(text)) moved[position] = kept.push(text) - 1;
  });
  const correct =
    question.question_type === 'poll'
      ? []
      : (question.correct_answer || []).flatMap((answer) =>
          !Number.isInteger(answer) ? [answer] : answer in moved ? [moved[answer]] : []
        );
  return { ...question, options: kept, correct_answer: correct };
}

// The question as the editor shows it: a choice question has at least 2 boxes to type in, since a saved draft keeps
// only the boxes that had text.
export function editableQuestion(question) {
  const options = question.options || [];
  if (!CHOICES.includes(question.question_type) || options.length >= 2) return question;
  return { ...question, options: [...options, ...Array(2 - options.length).fill('')] };
}

// What a question still needs before pupils can have it, as a key of ISSUES, or null when it's finished. The first
// one counts: no text, fewer than 2 answers, no right answer, or a short answer that can't be marked.
export function issueOf(question) {
  const saved = draftQuestion(question);
  if (!filled(saved.question_text)) return 'text';
  if (CHOICES.includes(saved.question_type) && saved.options.length < 2) return 'answers';
  if (['multiple_choice', 'true_false'].includes(saved.question_type) && !saved.correct_answer?.length) return 'right';
  if (saved.question_type === 'short_answer' && !saved.correct_answer?.some(filled)) return 'accepted';
  return null;
}

// Each issue on a closed card, in its tooltip, and as a checklist line ("Question 4 needs a right answer").
export const ISSUES = {
  text: { card: 'Needs its text', tip: 'Write the question', line: 'needs its text', many: 'need their text' },
  answers: {
    card: 'Needs 2 answers',
    tip: 'Give it at least 2 answers',
    line: 'needs at least 2 answers',
    many: 'need at least 2 answers',
  },
  right: {
    card: 'Needs a right answer',
    tip: 'Mark the right answer',
    line: 'needs a right answer',
    many: 'need a right answer',
  },
  accepted: {
    card: 'Needs an accepted answer',
    tip: "Add an accepted answer: it can't be marked without one",
    line: 'needs an accepted answer',
    many: 'need an accepted answer',
  },
};

// What stops a save or Finish editing, as one list of { text, index }, where index is the question to go to. A draft
// is held only by what the server refuses on every save: no title, or a pre/post link that doesn't fit. Anything
// else, and Finish editing, also needs every question finished.
export function quizProblems({ title, quizPhase, linkedQuizId, questions }, { draft = false } = {}) {
  const problems = [];
  if (!filled(title)) problems.push({ text: 'Give the quiz a title', field: 'title' });
  if (quizPhase === 'post' && !linkedQuizId) problems.push({ text: "Choose the 'before' quiz this one follows" });
  if (draft) return problems;
  if (!questions?.length) problems.push({ text: 'Add at least one question', field: 'questions' });
  (questions || []).forEach((question, index) => {
    const issue = issueOf(question);
    if (issue) problems.push({ text: `Question ${index + 1} ${ISSUES[issue].line}`, index });
  });
  return problems;
}

// The header's warning: "2 need a right answer" when every unfinished question needs the same thing, else
// "3 questions to finish"; with the first one to go to. Null when every question is finished.
export function unfinished(questions) {
  const issues = (questions || []).map(issueOf);
  const first = issues.findIndex(Boolean);
  if (first < 0) return null;
  const found = issues.filter(Boolean);
  const same = found.every((issue) => issue === found[0]);
  const count = found.length;
  const text = same
    ? `${count} ${count === 1 ? ISSUES[found[0]].line : ISSUES[found[0]].many}`
    : `${count} questions to finish`;
  return { count, text, first };
}

// About how long a live quiz takes: its questions' times added up, in whole minutes, at least 1.
export function minutesOf(questions) {
  const seconds = (questions || []).reduce((sum, question) => sum + (Number(question.time_limit_seconds) || 30), 0);
  return Math.max(1, Math.round(seconds / 60));
}

// The question number a server message names ("Question 4 has no correct answer set"), as an index, or null.
export function questionIndexIn(message) {
  const match = /question\s+(\d+)/i.exec(String(message ?? ''));
  return match ? Number(match[1]) - 1 : null;
}

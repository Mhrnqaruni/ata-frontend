// The homework list's rows (SOT-10; design.md §3.10): each class pupil once, with their state, answers so far, points
// and time once handed in, and walk-ins apart, from the run's summary and progress read, matched by school number.
// Area: quizzes

// The summary's statuses as the page's three states: handed in, working, not started (a closed run's "absent" too).
export const STATE_OF = { done: 'handedIn', working: 'working', not_started: 'notStarted', absent: 'notStarted' };

const number = (value) =>
  String(value ?? '')
    .trim()
    .toUpperCase();

// { pupils, walkIns, total }: rows of { id, name, number, state, answered, total, score, max, seconds, studentId }.
// score and seconds are null until handed in; studentId (the stored id) opens their answers once they've started.
export function homeworkRows(summary, progress = []) {
  if (!summary) return { pupils: [], walkIns: [], total: 0 };
  const total = summary.questions?.length || 0;
  const opened = new Map();
  for (const attempt of progress) opened.set(number(attempt.display_student_id || attempt.student_id), attempt);
  const row = (pupil) => {
    const attempt = pupil.display_id ? opened.get(number(pupil.display_id)) : undefined;
    const state = STATE_OF[pupil.status] || 'notStarted';
    const handedIn = state === 'handedIn';
    return {
      id: String(pupil.id),
      name: pupil.name,
      number: pupil.display_id || '',
      state,
      answered: attempt ? Math.round(((attempt.progress_percentage || 0) / 100) * total) : 0,
      total,
      score: handedIn ? (pupil.score ?? null) : null,
      max: summary.max_points,
      seconds: handedIn && attempt ? attempt.time_spent_seconds : null,
      studentId: attempt?.student_id || null,
    };
  };
  return {
    pupils: (summary.pupils || []).map(row),
    walkIns: (summary.not_on_class_list || []).map(row),
    total,
  };
}

const LETTERS = 'ABCDEFGH';

// What a pupil answered, in words (their answers window): the option's text for a choice, True or False, or what
// they typed. options: the question's options, when the quiz still has the question; else the answer's letter.
export function answerWords(result, options, noAnswer = 'No answer') {
  const answer = result.student_answer;
  if (answer === null || answer === undefined || answer === '') return noAnswer;
  if (result.question_type === 'true_false') return answer === true || String(answer) === 'true' ? 'True' : 'False';
  if (result.question_type === 'multiple_choice' || result.question_type === 'poll') {
    const index = Number(answer);
    return options?.[index] ?? (LETTERS[index] || String(index + 1));
  }
  return String(answer);
}

// The three counters: from the summary, which counts class pupils only (walk-ins are left out).
export function counters(summary) {
  return {
    handedIn: summary?.handed_in ?? null,
    working: summary?.working ?? null,
    notStarted: summary?.not_started ?? null,
  };
}

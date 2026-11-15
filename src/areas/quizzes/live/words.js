// The teacher's live page words (design.md §3.7, §3.8, §5): the main buttons, who's here, answering, the pace, the
// finish window and the errors. Words more than one quiz page says are in ../words.js.
// Area: quizzes

export const LIVE = {
  start: 'Start quiz',
  starting: 'Starting…',
  reveal: 'Show answers',
  next: 'Next question',
  finish: 'Finish and see results',
  finishQuiz: 'Finish quiz',
  working: 'One moment…',
  backToQuizzes: 'Back to quizzes',
  questionOf: (number, total) => `Question ${number} of ${total}`,
  questions: (count) => `${count} question${count === 1 ? '' : 's'}`,
  here: (count, expected) => (expected == null ? `${count} here` : `${count} of ${expected} here`),
  more: (count) => `+${count} more`,
  missing: 'Missing',
  waitingForPupils: 'Waiting for pupils…',
  canStillJoin: 'Pupils can still join until you finish.',
  // The lobby only shows the pace chosen in the Start window, with Change (Phase 1.47 R1); the choices' words are the
  // Start window's (../editor/words.js START).
  paceLine: (choice) => `Pace: ${choice}`,
  change: 'Change',
  paceFailed: "Couldn't change the pace. Try again.",
  secondsLeft: 's left',
  timerLabel: (seconds) => `${seconds} seconds left`,
  answeredOf: (count, total) => `${count} of ${total} answered`,
  answeredBare: (count) => `${count} answered`,
  stillToAnswer: (count) => `Still to answer (${count})`,
  // At phone width, one line under the question card that a tap opens (design.md §3.6): "Still to answer: Lee, Sam +6".
  stillLine: (names) => {
    const list = [].concat(names);
    return `Still to answer: ${list.slice(0, 2).join(', ')}${list.length > 2 ? ` +${list.length - 2}` : ''}`;
  },
  answeredList: (count) => `Answered (${count})`,
  everyoneAnswered: 'Everyone has answered',
  namesLater: 'Who has answered shows again from the next question.',
  // A timed run while its question is open (Phase 1.47 R2, design.md §3.2): no big button, a small one instead.
  showAnswersNow: 'Show answers now',
  everyoneMoveOn: "Everyone's answered · Move on",
  everyoneFinish: "Everyone's answered · Finish",
  nextIn: (seconds) => `Next question in ${seconds} s`,
  // Typed answers waiting for the AI's marks (C2, C9; design.md §3.4).
  marking: 'Marking typed answers…',
  markingWait: 'Marking… one moment',
  partPoints: (count) => `${count} with part points`,
  toMarkLater: (count) => `${count} answer${count === 1 ? '' : 's'} to mark after the quiz`,
  waitingForYou: 'Pupils wait for you to move on.',
  reconnecting: 'Reconnecting…',
  rightAnswer: 'Right answer',
  typeAnswer: 'Pupils type their answer',
  accepted: (answers) => `Accepted: ${answers}`,
  rightOf: (correct, answered) => (answered ? `${correct} of ${answered} right` : `${correct} right`),
  chose: (count) => `${count} chose this`,
  pollNote: 'A poll has no right answer.',
  top5: 'Top 5',
  points: (score) => `${score ?? 0} points`,
  finishTitle: 'Finish the quiz?',
  finishConfirm: 'Finish',
  keepGoing: 'Keep going',
  finished: 'Quiz finished · results saved',
  loadFailed: "Couldn't load this quiz.",
  tryAgain: 'Try again',
  busy: 'Still finishing the last step. Try again in a moment.',
  movedOn: 'The quiz had already moved on.',
};

// The finish window's line (design.md §3.7): what has happened so far, and that results are kept.
export function finishLine({ started, question, closed, last, answered, total }) {
  if (!started || !question) return "No questions have been asked yet. Pupils can't join after this.";
  if (!closed) return `${answered} of ${total} answered this question. Results so far are saved.`;
  return last
    ? `${answered} of ${total} answered the last question. Results are saved.`
    : 'Results so far are saved. The questions not asked yet are left out.';
}

// The words for a main button's failure: the server's sentence when it says why, else what to do.
export function actionError(error) {
  if (error?.status === 503) return LIVE.busy;
  if (error?.status === 409) return LIVE.movedOn;
  return error?.message || `${LIVE.tryAgain}.`;
}

// "1st", "2nd", "3rd", "11th": a leaderboard place. Equal scores share one (SOT-9, ST14).
export function ordinal(place) {
  const tens = place % 100;
  if (tens >= 11 && tens <= 13) return `${place}th`;
  return `${place}${['th', 'st', 'nd', 'rd'][place % 10] || 'th'}`;
}

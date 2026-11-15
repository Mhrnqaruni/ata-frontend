// The quiz review page's words (Phase 1.47, design.md §3.9, §5): its header, the cards' types, chips and evidence,
// the comment box's AI states, the read-only banners and the refusals. The shared layout says the rest.
// Area: quizzes

export const PUPIL_REVIEW = {
  quizzes: 'Quizzes',
  results: 'Results',
  review: 'Review',
  backToResults: 'Back to results',
  types: {
    multiple_choice: 'Multiple choice',
    true_false: 'True or false',
    short_answer: 'Typed answer',
    poll: 'Poll',
  },
  // The chip at a card's top right, by its state.
  chips: {
    right: 'Right',
    wrong: 'Wrong',
    part: 'Part marks',
    none: 'No answer',
    waiting: 'Waiting for a mark',
    teacher: 'Marked by you',
  },
  theirAnswer: 'Their answer',
  rightAnswer: 'The right answer',
  noAnswer: 'No answer',
  trueWord: 'True',
  falseWord: 'False',
  accepted: 'Accepted',
  levels: { exact: 'Exact', close: 'Close', meaning: 'Same meaning' },
  pollNoMark: 'A poll has no right answer, so it has no mark.',
  picture: (number) => `The picture for question ${number}`,
  comment: 'Comment for the pupil',
  fromAi: 'From the AI · edit or keep',
  addComment: 'Add a comment, if you like',
  aiWriting: 'The AI is writing a comment…',
  aiFailed: 'No AI comment. Write one if you like.',
  stillWorking: (name) => `${name} is still working. You can change marks once they hand in.`,
  stillRunning: 'The quiz is still running. You can change marks when it finishes.',
  noAnswers: (name) => `${name} didn't answer any questions.`,
  loading: 'Loading the answers',
  loadFailed: "Couldn't load these answers.",
  missing: "These answers can't be found. The run or the pupil may have been removed.",
  tryAgain: 'Try again',
  markNotSaved: "Couldn't save the mark.",
  reportFailed: (format) =>
    format === 'pdf' ? "Couldn't make the PDF. Try again, or download Word." : "Couldn't make the report. Try again.",
};

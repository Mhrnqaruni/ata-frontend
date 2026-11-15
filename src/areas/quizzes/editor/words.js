// The quiz editor's words (Phase 1.46, design.md §3.2–§3.6, §5; Phase 1.47 §3.7): its steps, buttons, saving words,
// question types, question tools and match levels. The words other quiz pages say too are in ../words.js.
// Area: quizzes

export const STEPS = ['Details', 'Questions', 'Settings'];

// Each question type with what pupils do (design.md §3.4).
export const TYPE_WORDS = {
  multiple_choice: { label: 'Multiple choice', hint: 'Pupils pick one answer' },
  true_false: { label: 'True or false', hint: 'Pupils pick one' },
  short_answer: { label: 'Short answer', hint: 'Pupils type it' },
  poll: { label: 'Poll', hint: 'Opinions, with no right answer and no points' },
};

const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;

// Names in a sentence: "8B", "8B and 9C", "8B, 9C and 10A", "8B, 9C and 3 more".
export function joinNames(names) {
  if (names.length <= 1) return names[0] ?? '';
  if (names.length <= 3) return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`;
}

export const EDITOR = {
  newQuiz: 'New quiz',
  back: 'Back',
  backToQuizzes: 'Back to quizzes',
  nextQuestions: 'Next: questions',
  nextSettings: 'Next: settings',
  finishEditing: 'Finish editing',
  questions: (count) => plural(count, 'question', 'questions'),
  aboutMinutes: (minutes) => `about ${minutes} min`,
  noClassYet: 'No class yet',
  loadFailed: "Couldn't open the quiz.",
  tryAgain: 'Try again',
};

// Step 1, Details (design.md §3.2).
export const DETAILS = {
  title: 'Title',
  titlePlaceholder: 'e.g. Cells and tissues · check-in',
  titleMissing: 'Give the quiz a title',
  addDescription: 'Add description',
  description: 'Description',
  descriptionPlaceholder: 'What is this quiz about?',
  classes: 'Classes',
  chooseClasses: 'Choose classes',
  anyone: 'Anyone with the join code can join',
  onlyPupils: (names) => `Only pupils in ${names} can join`,
  pupils: (count) => plural(count, 'pupil', 'pupils'),
  nobody: 'No pupils are in them yet',
  keepClasses: 'A saved quiz keeps at least one class. Choose the classes it’s for.',
  combine: 'Who in them',
  combineAny: 'Everyone in any chosen class or group',
  combineFilter: 'Only the chosen groups, within the chosen classes',
  pairLocked: 'Its classes, and how pupils take it, follow its ‘before’ quiz.',
  tags: 'Tags',
  addTag: 'Add tag',
  tagPlaceholder: 'Type a tag',
  makeTag: (name) => `Make “${name}”`,
  tagsFailed: "Couldn't load the quiz's tags.",
  tagsFull: 'Up to 20 tags',
  how: 'How they take it',
  live: 'Live',
  liveHint: 'in class, together',
  liveLine: 'You run it from the board, one question at a time.',
  homework: 'Homework',
  homeworkHint: 'on their own, with a due date',
  homeworkLine: 'Pupils do it in their own time, until the due date.',
};

// Leaving the editor with unsaved work.
export const LEAVE = {
  failedTitle: 'Your last changes aren’t saved',
  failedText: 'If you leave now, they’re lost.',
  tryAgain: 'Try again',
  leave: 'Leave anyway',
  readyTitle: 'Save your changes?',
  readyText: 'This quiz is ready, so changes are kept only when you save them.',
  save: 'Save changes',
  dontSave: 'Leave without saving',
  stay: 'Keep editing',
  untitledTitle: 'Leave without saving?',
  untitledText: 'The quiz needs a title before it can be saved, so its questions would be lost.',
};

// The header's saving words (design.md §5).
export const SAVING = {
  saving: 'Saving…',
  saved: (at, now = Date.now()) => {
    const minutes = Math.floor((now - at) / 60000);
    return minutes < 1 ? 'Saved · just now' : `Saved · ${minutes} min ago`;
  },
  failed: 'Not saved',
  tryAgain: 'Try again',
  unsaved: 'Changes not saved',
  saveChanges: 'Save changes',
};

export const QUESTIONS = {
  preview: 'Preview',
  importWithAI: 'Import with AI',
  addQuestion: 'Add question',
  addQuestionCard: 'Add question',
  full: 'A quiz can have up to 100 questions',
  more: 'More',
  exportCsv: 'Export CSV',
  everyTime: 'Set every time to…',
  everyScore: 'Set every score to…',
  openAll: 'Open all',
  closeAll: 'Close all',
  goTo: 'Go to question',
  goToPlaceholder: 'Go to question: number or word',
  outline: 'Outline',
  hideOutline: 'Hide outline',
  showOutline: 'Show outline',
  find: 'Find a number or word',
  noneFound: (text) => `No question has ‘${text}’`,
  addFirst: 'Add your first question',
  firstQuestion: 'Write your first question',
  firstQuestionHint: 'Multiple choice, true or false, short answer or a poll',
  fromWorksheet: 'Import from a worksheet',
  fromWorksheetHint: 'AI reads it and writes the questions for you to check',
  untitled: 'Write your question',
  deleted: 'Question deleted',
  undo: 'Undo',
  moved: (from, to) => `Question ${from} moved to ${to}`,
  moveHint: 'Drag to move it, or press Alt and an arrow key',
};

// The open question card (design.md §3.4).
export const CARD = {
  type: 'Question type',
  points: 'Points',
  pointsTip: 'Points for a right answer',
  pointsUnit: 'pts',
  time: 'Time',
  timeTip: 'Seconds to answer',
  timeUnit: 's',
  copy: 'Make a copy',
  delete: 'Delete question',
  close: 'Close',
  question: 'Question',
  questionPlaceholder: 'Write your question',
  picture: 'Add a picture',
  maths: 'Add maths: type it between the $ signs',
  answer: (letter) => `Answer ${letter}`,
  markRight: 'Mark as the right answer',
  isRight: 'The right answer',
  removeAnswer: 'Remove answer',
  addAnswer: 'Add answer',
  addExplanation: 'Add an explanation (pupils see it after answering)',
  explanation: 'Explanation',
  explanationPlaceholder: 'Why the right answer is right',
  removeExplanation: 'Remove the explanation',
  trueWord: 'True',
  falseWord: 'False',
  tapRight: 'Tap the right answer',
  accepted: 'Accepted answers',
  acceptedPlaceholder: 'Type an answer, then press Enter',
  acceptedAdd: 'Add',
  poll: 'No right answer, no points',
  pictureAlt: 'The question’s picture',
  replacePicture: 'Replace',
  removePicture: 'Remove picture',
};

// How close a typed answer must be (Phase 1.47 design.md §3.7): each level's name, its line, and how it's marked.
// Exact is checked by code, so only Close and Same meaning say AI.
export const MATCH = {
  title: 'How close must it be?',
  levels: {
    exact: {
      label: 'Exact',
      line: 'The spelling must match one of your answers. Capitals, spaces and punctuation don’t matter.',
      marking: 'Full points or none, marked straight away.',
    },
    close: {
      label: 'Close',
      line: 'Small typos and other ways of writing it count, like “6 months” for “six months” or “H2O” for “water”.',
      marking: 'Marked by AI. Part points are possible.',
    },
    meaning: {
      label: 'Same meaning',
      line: 'Any answer that means the same counts, in the pupil’s own words.',
      marking: 'Marked by AI. Part points are possible.',
    },
  },
};

// The picture window.
export const PICTURE = {
  title: 'Add a picture',
  hint: 'PNG, JPG or GIF, up to 5 MB',
  choose: 'Choose a picture',
  adding: 'Adding the picture…',
  added: 'Picture added',
  cancel: 'Cancel',
};

// Setting every question's time or points at once (Q9).
export const EVERY = {
  timeTitle: 'Set every time',
  timeLabel: 'Seconds for each question',
  scoreTitle: 'Set every score',
  scoreLabel: 'Points for each right answer',
  scoreNote: 'Polls keep no points.',
  apply: 'Set for all',
  cancel: 'Cancel',
  timeDone: (seconds) => `Every question now has ${seconds} s`,
  scoreDone: (points) => `Every question now gives ${points} points`,
};

// Preview: the pupil's question screen with this draft (design.md §3.4, §3.12).
export const PREVIEW = {
  title: 'Preview',
  of: (number, total) => `Question ${number} of ${total}`,
  // the points line pupils see (Phase 1.47 design.md §3.5): "Up to" where part points are possible
  points: (points) => plural(points, 'point', 'points'),
  upTo: (points) => `Up to ${plural(points, 'point', 'points')}`,
  poll: 'A poll · no points',
  typeAnswer: 'Type your answer',
  send: 'Send',
  previous: 'Previous question',
  next: 'Next question',
  close: 'Close',
  empty: 'Add a question to preview it.',
  note: 'What pupils see on a phone. Nothing is sent.',
};

// Import with AI: the existing import, with clearer words (R6).
export const IMPORT = {
  title: 'Import with AI',
  startFrom: 'What is it?',
  kinds: {
    questions_and_answers: 'Questions with their answers',
    questions_only: 'Questions only: I’ll add the answers',
    lecture_material: 'Teaching material: AI writes the questions',
  },
  fileHint: 'PDF, picture, Word, Excel, CSV or text',
  choose: 'Choose a file',
  chooseAnother: 'Choose a different file',
  pasted: 'Or paste text, or tell AI what to focus on (optional)',
  pastedPlaceholder: 'Paste a worksheet here, or say what to focus on',
  grade: 'Year or level (optional)',
  gradePlaceholder: 'e.g. Year 9',
  howMany: 'How many questions',
  types: 'Question types',
  difficulty: 'How hard',
  levels: { easy: 'Easy', medium: 'Medium', hard: 'Hard' },
  reading: 'AI is reading it. This can take a minute: keep this window open.',
  check: 'You check every question before pupils get it.',
  run: 'Import questions',
  cancel: 'Cancel',
  none: 'AI found no questions in it. Try another file, or paste the text.',
  busy: 'AI is busy just now. Try again in a minute.',
  added: (count) => `${plural(count, 'question', 'questions')} added`,
};

// Settings, step 3: the tiles and More options (design.md §3.5; SOT-13). Each tile's line says what pupils get.
export const SETTINGS = {
  heading: 'What pupils see',
  on: 'On',
  off: 'Off',
  tiles: {
    feedback: {
      label: 'Right or wrong after each question',
      on: 'Pupils see ✓ or ✗ after each question',
      off: 'Pupils see nothing until the end',
    },
    review: {
      label: 'Review answers at the end',
      on: 'Pupils can look back at their answers when it ends',
      off: 'Pupils see only their score',
    },
    leaderboard: {
      label: 'Leaderboard',
      on: 'The top 5 show between questions',
      off: 'No rankings. Pupils see only their own score',
    },
    score: {
      label: 'Show their score',
      on: 'Pupils see their score when they hand in',
      off: 'Pupils see \u2018Handed in\u2019 only',
    },
    wrong: {
      label: 'Show what they got wrong',
      on: 'After handing in, pupils see each answer, right or wrong',
      off: 'Pupils don\u2019t see which answers were wrong',
    },
  },
  more: 'More options',
  moreSummary: 'shuffle, before-and-after quizzes',
  shuffleQuestions: 'Shuffle questions',
  shuffleAnswers: 'Shuffle answers',
  pair: 'Before and after a topic',
  pairs: {
    normal: { label: 'Just this quiz', line: 'A quiz on its own.' },
    pre: { label: 'Before a topic', line: 'Run it before you teach, then compare an \u2018after\u2019 quiz with it.' },
    post: { label: 'After a topic', line: 'Pick its \u2018before\u2019 quiz, to see how far pupils have come.' },
  },
  follows: (title) => `Follows \u2018${title}\u2019`,
  pickBefore: 'Pick the \u2018before\u2019 quiz',
  changeBefore: 'Change',
  beforeTitle: 'Which \u2018before\u2019 quiz does this follow?',
  beforeNone: 'No \u2018before\u2019 quiz has been run yet with this mode. Run one first, then come back.',
  beforeRule: 'It takes the \u2018before\u2019 quiz\u2019s classes and how pupils take it, so the two compare.',
  beforeQuestions: (count) => plural(count, 'question', 'questions'),
  choose: 'Choose',
  cancel: 'Cancel',
  pairLocked: 'A saved \u2018after\u2019 quiz stays linked to its \u2018before\u2019 quiz.',
};

// Finish editing: the checklist, or the Ready panel (design.md §3.5).
export const FINISH = {
  toFinish: (count) => `${plural(count, 'thing', 'things')} to finish first`,
  goTo: 'Go to',
  more: (count) => `and ${count} more`,
  ready: 'Ready',
  nobodyYet: 'Nobody has it yet.',
  runAgain: 'Run it again, for any class.',
  startWith: (names) => (names ? `Start now with ${names}` : 'Start now'),
  sendTo: (names) => (names ? `Send to ${names}` : 'Send'),
  changeClasses: 'Change classes',
  liveLine: 'Pupils get it when you start it.',
  homeworkLine: 'Pupils get it when you send it.',
  editQuestions: 'Edit questions',
  finishing: 'Finishing…',
};

// The Start window (design.md §3.6; SOT-6): the classes, the pace or the due date, then Start now or Send. Each pace
// has its own line under it (Phase 1.47 design.md §3.1), and the live lobby's Change shows the same two.
export const START = {
  classes: 'Classes',
  change: 'Change',
  anyone: 'Anyone with the join code',
  pairLocked: 'A before-and-after quiz runs for the classes it was made for.',
  pace: 'Pace',
  byHand: 'I\u2019ll press Next',
  byHandLine: 'You show the answers, then move to the next question.',
  byItself: 'Move on by itself',
  byItselfLine: (seconds) =>
    `Each question ends when its time is up, shows the answers for ${seconds} s, then moves on.`,
  due: 'Due',
  date: 'Date',
  time: 'Time',
  dueLine: 'Pupils can\u2019t open it after this.',
  dueBefore: 'Choose a time after now',
  start: 'Start now',
  starting: 'Starting…',
  send: 'Send',
  sending: 'Sending…',
  startFailed: 'Couldn\u2019t start the homework. Try again',
  tryAgain: 'Try again',
  cancel: 'Cancel',
  needClasses: 'Choose at least one class: a quiz that has classes can\u2019t run for anyone yet.',
  sent: (names, due) => `Sent${names ? ` to ${names}` : ''} · due ${due}`,
  loading: 'Getting the quiz…',
};

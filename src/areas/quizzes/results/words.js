// The results page's words (Phase 1.46 SOT-7, Phase 1.47 SOT-7; design.md §3.8, §5): the run picker, the summary's
// four facts and its plain sentence, blanks, each pupil's Result, each question's lines, the downloads, the messages.
// Area: quizzes

import { formatDate, formatTime } from '../../../utils/dates';
import { STATES, WORDS, classList } from '../words';
import {
  answeredAny,
  answeredNothing,
  attemptsAt,
  belowHalf,
  blankCount,
  blanksOf,
  finished,
  hardest,
  isOpen,
  missedCount,
  points,
  tricky,
  wrongCount,
} from './figures';

export const RESULTS = {
  title: 'Results',
  quizzes: 'Quizzes',
  run: 'Run',
  classFilter: 'Class',
  allClasses: 'All classes',
  anyone: 'Anyone with the code',
  notStarted: 'Not started yet',
  live: 'Live',
  homework: 'Homework',
  open: 'Open',
  download: 'Download',
  preparingShort: 'Preparing…',
  eachReportPdf: "Each pupil's report · PDF",
  eachReportPdfHint: 'PDF files, in one ZIP',
  eachReportWord: "Each pupil's report · Word",
  eachReportWordHint: 'Word files, in one ZIP',
  // "Preparing 28 PDFs…" while a ZIP is made; format 'pdf' or 'docx'.
  preparing: (count, format) => {
    const [one, many] = format === 'pdf' ? ['PDF', 'PDFs'] : ['Word file', 'Word files'];
    return count ? `Preparing ${count} ${count === 1 ? one : many}…` : `Preparing the ${many}…`;
  },
  spreadsheet: 'Spreadsheet',
  spreadsheetHint: 'A CSV file for Excel',
  askAi: 'Ask AI about these results',
  tookPart: 'took part',
  handedIn: 'handed in',
  averagePoints: 'average points',
  noScoresYet: 'No scores yet',
  hardest: 'hardest question',
  noWrong: 'No wrong answers',
  noAnswers: 'No answers yet',
  nobodyAnswered: 'nobody answered',
  belowHalf: 'below half the points',
  pupils: 'Pupils',
  questions: 'Questions',
  hardestFirst: 'Hardest first',
  name: 'Name',
  score: 'Score',
  result: 'Result',
  poll: 'Poll · no right answer',
  markedByAi: 'Marked by AI',
  review: 'Review',
  reviewOf: (name) => `Review ${name}'s answers`,
  wrongOrBlank: (number) => `Q${number} · wrong or blank`,
  showWrongOrBlank: (number) => `Show the pupils who got Q${number} wrong or left it blank`,
  nobodyMissed: (number) => `Everyone who took part got Q${number} right.`,
  showingMissed: 'Showing who missed it',
  clear: 'Clear',
  noScore: 'No score',
  showEveryone: 'Show every pupil',
  showThem: 'Show them',
  showOnlyBelow: (count) => `Show only the ${count === 1 ? 'pupil' : `${count} pupils`} below half the points`,
  typedId: 'ID they typed',
  notOnListNote:
    "They joined with the code, but they aren't on the class list, so they're left out of the figures above.",
  match: 'Match to a pupil…',
  matchTitle: (name) => `Match ${name} to a pupil?`,
  matchNote: 'Their answers and score move to the pupil you choose, and the figures above count them.',
  pupilOnList: 'Pupil on the class list',
  choosePupil: 'Choose the pupil first.',
  choosePupilHint: 'Choose a pupil',
  matchVerb: 'Match',
  matching: 'Matching…',
  matched: (walkIn, pupil) => `${walkIn} matched to ${pupil}`,
  picture: "See the question's picture",
  beforeAfter: 'Before and after',
  before: 'Before',
  after: 'After',
  change: 'Change',
  nothingToCompare: "The before quiz hasn't finished a run yet, so there's nothing to compare.",
  noRuns: 'No results yet',
  noRunsText: 'They show here once pupils have taken this quiz.',
  backToQuizzes: 'Back to quizzes',
  tryAgain: 'Try again',
  loading: 'Loading results',
  theseResults: 'these results',
  loadFailed: "Couldn't load the results. Check the connection, then try again.",
  quizMissing: "This quiz isn't in your quizzes. It may have been deleted.",
  runFailed: "Couldn't load this run's results. Check the connection, then try again.",
  runUnreadable: "This run's results can't be shown, because its questions couldn't be read.",
  otherRuns: 'Your other runs are in the run picker.',
  reportsDone: 'Reports downloaded',
  reportsFailed: "Couldn't make the reports. Try again.",
  pdfsFailed: "Couldn't make the PDFs. Try again, or download Word.",
  spreadsheetFailed: "Couldn't make the spreadsheet. Try again.",
  csvHead: ['Name', 'School ID', 'On the class list', 'Status', 'Score', 'Out of', 'Below half the points'],
  waitingForMark: (count) =>
    `${count === 1 ? '1 answer is' : `${count} answers are`} waiting for your mark. Those pupils' scores show once you've marked them.`,
  markThem: 'Mark them',
  marksTitle: 'Answers waiting for your mark',
  marksIntro: "AI marking couldn't decide these answers. Give each one a mark; nothing is sent to AI again.",
  answerToMark: 'Answer to mark',
  theirAnswer: 'Their answer',
  acceptedAnswer: 'Accepted answer',
  feedback: 'Feedback (optional)',
  saveMark: 'Save mark',
  saving: 'Saving…',
  close: 'Close',
  done: 'Done',
  loadAgain: 'Load the answers again',
  markSaved: (left) => `Mark saved. ${left === 1 ? '1 answer' : `${left} answers`} still to mark.`,
  allMarked: 'All the answers are marked.',
  markLanded: 'This answer is now marked.',
  matchFailed: "Couldn't match them. Check the pupil, then try again.",
  marksFailed: "Couldn't load the answers to mark. Try again.",
  markNotSaved: "The save couldn't be confirmed. Your mark is still here.",
};

// Each pupil's Result (design.md §3.8): only the exceptions. A pupil who finished above half shows just the score.
const RESULT_WORDS = {
  absent: { word: 'Absent', tone: 'muted' },
  nothing: { word: 'No answers', tone: 'muted' },
  not_started: { word: 'Not started', tone: 'muted' },
  working: { word: 'Working', tone: 'muted' },
  unfinished: { word: "Didn't hand in", tone: 'muted' },
  unstarted: { word: "Didn't start", tone: 'muted' },
  marking: { word: 'Waiting for your mark', tone: 'neutral' },
  below: { word: WORDS.belowHalf, tone: 'warn' },
};

// run: the summary (its kind and status). Closed homework says what didn't happen, since nobody is working now. A
// pupil who finished with no answers says so, rather than only "below half".
export function resultOf(pupil, belowHalfPoints, run = {}) {
  if (pupil.status === 'done') {
    if (pupil.score === null || pupil.score === undefined) return RESULT_WORDS.marking;
    if (answeredNothing(pupil)) return RESULT_WORDS.nothing;
    return belowHalfPoints ? RESULT_WORDS.below : null;
  }
  if (run.kind === 'homework' && !isOpen(run))
    return RESULT_WORDS[pupil.status === 'working' ? 'unfinished' : 'unstarted'];
  return RESULT_WORDS[pupil.status] ?? null;
}

// A status for the spreadsheet, where every row says one.
export const statusWord = (pupil, run) =>
  pupil.status === 'done'
    ? run.kind === 'homework'
      ? 'Handed in'
      : 'Finished'
    : resultOf(pupil, false, run)?.word || '';

// Homework's first fact's detail: open, who's working and who hasn't started; closed, who didn't hand in or start.
function homeworkDetail(summary) {
  const working = summary.working ?? 0;
  const notStarted = summary.not_started ?? 0;
  if (isOpen(summary)) return `${working} working · ${notStarted} not started`;
  const parts = [working && `${working} didn't hand in`, notStarted && `${notStarted} didn't start`];
  return parts.filter(Boolean).join(' · ') || 'Everyone handed in';
}

const plural = (count, one, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;
const when = (run) => run.started_at ?? run.ended_at ?? null;

// A run on one line: "14 Nov · 8B", with the time when another run started the same day ("14 Nov, 10:05 · 8B").
export function runTitle(run, runs = [], { now } = {}) {
  const day = formatDate(when(run), { year: 'auto', now });
  const twin =
    day && runs.some((other) => other.id !== run.id && formatDate(when(other), { year: 'auto', now }) === day);
  const date = twin ? `${day}, ${formatTime(when(run))}` : day || RESULTS.notStarted;
  return `${date} · ${run.classes?.length ? classList(run.classes) : RESULTS.anyone}`;
}

// Each kind of run in words: finished, then open ("Live now", "Homework open").
const KINDS = { live: [RESULTS.live, STATES.live.label], homework: [RESULTS.homework, STATES.homework.label] };

// A run's facts under its title in the picker: "Live · 26 of 28 took part · average 72%".
export function runFacts(run) {
  const kind = KINDS[run.kind]?.[isOpen(run) ? 1 : 0];
  const count =
    run.kind === 'homework'
      ? `${run.handed_in ?? 0} of ${run.expected} ${RESULTS.handedIn}`
      : `${run.took_part} of ${run.expected} ${RESULTS.tookPart}`;
  const average =
    run.average_percent === null || run.average_percent === undefined
      ? null
      : `average ${Math.round(run.average_percent)}%`;
  return [kind, count, average].filter(Boolean).join(' · ');
}

// An answer's words, cut short for a one-line fact.
const short = (text, length = 40) => (text.length > length ? `${text.slice(0, length - 1).trimEnd()}…` : text);

// What tripped pupils up on a question: "12 wrong, 2 no answer"; "nobody answered" when every attempt is blank.
function missedWords(question) {
  const wrong = wrongCount(question);
  const blank = blankCount(question);
  if (blank && !question.answered) return RESULTS.nobodyAnswered;
  return [wrong && `${wrong} wrong`, blank && `${blank} no answer`].filter(Boolean).join(', ');
}

// The hardest question's detail: "12 wrong, 2 no answer · most chose ‘Cell wall’" (design.md §3.8).
function hardestDetail(question) {
  const wrong = question.top_wrong_answer ? ` · most chose ‘${short(question.top_wrong_answer.text)}’` : '';
  return `${missedWords(question)}${wrong}`;
}

// With no question that tripped anyone up: blanks only on polls, no wrong answers, or no answers yet. Never "No
// wrong answers" while an answer is blank.
function noHardestDetail(questions) {
  const { blank } = blanksOf(questions);
  if (blank) return `${blank} no answer`;
  return answeredAny(questions) ? RESULTS.noWrong : RESULTS.noAnswers;
}

// The summary's four facts (design.md §3.11), each { key, value, label, detail }. Live opens with who took part,
// homework with who handed in; the average says whom it covers ("of the 24 who finished"); missing is "—", never 0.
export function summaryFacts(summary) {
  const homework = summary.kind === 'homework';
  const done = finished(summary.pupils).length;
  const who = homework ? RESULTS.handedIn : 'finished';
  const top = hardest(summary.questions);
  const below = belowHalf(summary.pupils, summary.max_points).length;
  const first = homework
    ? { key: 'handed', value: String(summary.handed_in ?? 0), label: RESULTS.handedIn, detail: homeworkDetail(summary) }
    : { key: 'took', value: `${summary.took_part} of ${summary.expected}`, label: RESULTS.tookPart };
  const average =
    summary.average === null || summary.average === undefined
      ? { key: 'average', value: '—', label: RESULTS.averagePoints, detail: RESULTS.noScoresYet }
      : {
          key: 'average',
          value: `${points(summary.average)} / ${points(summary.max_points)}`,
          label: RESULTS.averagePoints,
          detail: done === 1 ? `of the one pupil who ${who}` : `of the ${done} who ${who}`,
        };
  const hard = top
    ? { key: 'hardest', value: `Q${top.number}`, label: RESULTS.hardest, detail: hardestDetail(top) }
    : { key: 'hardest', value: '—', label: RESULTS.hardest, detail: noHardestDetail(summary.questions) };
  return [first, average, hard, { key: 'below', value: String(below), label: RESULTS.belowHalf, count: below }];
}

// How the class did, in words, by the share of finishers below half the points.
function howTheyDid(below, done, homework) {
  if (below === 0) return `Everyone who ${homework ? 'handed in' : 'finished'} scored at least half the points.`;
  const share = below / done;
  if (share < 0.25) return 'Most of the class did well.';
  if (share < 0.4) return 'Some of the class found it hard.';
  if (share <= 0.6) return 'About half the class is below half the points.';
  return 'Most of the class is below half the points.';
}

// Where to start, from the questions, hardest first.
function whereToStart(questions) {
  const hard = tricky(questions);
  if (hard.length >= 2) return `Start with questions ${hard[0].number} and ${hard[1].number}.`;
  const top = hard[0] ?? hardest(questions);
  return top ? `Question ${top.number} tripped up ${plural(missedCount(top), 'pupil')}.` : '';
}

// Blanks, when they're at least a quarter of the answers: "4 of 6 answers were left blank." (design.md §3.8).
function blanksSentence(questions) {
  const { blank, total } = blanksOf(questions);
  if (!blank || blank / total < 0.25) return '';
  return `${blank} of ${plural(total, 'answer')} ${blank === 1 ? 'was' : 'were'} left blank.`;
}

// The one plain sentence under the facts (design.md §3.11): "Most of the class did well. Question 4 tripped up 12
// pupils." It covers the class pupils only, like the facts.
export function summarySentence(summary) {
  const homework = summary.kind === 'homework';
  if (!summary.took_part) {
    if (summary.not_on_class_list?.length) return 'Nobody on the class list took part.';
    return isOpen(summary) ? 'Nobody has started yet.' : 'Nobody took part in this run.';
  }
  const done = finished(summary.pupils).length;
  if (!done) {
    if (homework) return isOpen(summary) ? 'Nobody has handed in yet.' : 'Nobody handed in.';
    return isOpen(summary) ? 'The quiz is still running.' : `${RESULTS.noScoresYet}.`;
  }
  const below = belowHalf(summary.pupils, summary.max_points).length;
  return [howTheyDid(below, done, homework), blanksSentence(summary.questions), whereToStart(summary.questions)]
    .filter(Boolean)
    .join(' ');
}

// A question's figure: "14 of 28 right", of everyone who finished and met it (a blank counts as not right).
export const rightWords = (question) => `${question.correct} of ${attemptsAt(question)} right`;

// A question's second line: "12 wrong · most chose ‘Cell wall’ · 2 no answer", then "Marked by AI" for a typed
// answer the AI marks (design.md §3.8).
export function questionLine(question, { markedByAi = false } = {}) {
  const top = question.top_wrong_answer;
  return [
    wrongCount(question) && `${wrongCount(question)} wrong`,
    top && `most chose ‘${short(top.text)}’`,
    blankCount(question) && `${blankCount(question)} no answer`,
    markedByAi && RESULTS.markedByAi,
  ]
    .filter(Boolean)
    .join(' · ');
}

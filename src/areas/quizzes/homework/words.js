// The teacher's homework page words (design.md §3.10, §4, §5): the three states, the list, the due line, Close
// homework and the errors. Words more than one quiz page says are in ../words.js.
// Area: quizzes

import { formatDateTime } from '../../../utils/dates';

export const HOMEWORK = {
  handedIn: 'Handed in',
  working: 'Working',
  notStarted: 'Not started',
  results: 'Results',
  more: 'More',
  close: 'Close homework',
  closeTitle: 'Close the homework?',
  closeLine: "Pupils' work so far is kept, and nobody can open it after.",
  keepOpen: 'Keep it open',
  closed: 'Homework closed',
  closeFailed: "Couldn't close the homework. Try again.",
  notSent: "This homework hasn't been sent yet. Pupils can't open it until you send it.",
  sendNow: 'Send now',
  sendFailed: "Couldn't send the homework. Try again.",
  loadFailed: "Couldn't load this homework.",
  listFailed: "Couldn't load who has handed in.",
  tryAgain: 'Try again',
  updatedNow: 'Updated just now',
  updatedAgo: (minutes) => `Updated ${minutes} min ago`,
  // Who the average covers (honest numbers): everyone who handed in, or those marked so far while some wait for marks.
  average: ({ count, all, average, max }) =>
    `Average of the ${count} ${all ? 'who handed in' : 'marked so far'}: ${formatPoints(average)} / ${formatPoints(max)} points`,
  answeredOf: (count, total) => `${count} of ${total} answered`,
  score: (score, max) => `${formatPoints(score)} / ${formatPoints(max)}`,
  marking: 'Being marked',
  name: 'Name',
  status: 'Status',
  progress: 'Answered',
  points: 'Points',
  time: 'Time',
  showMore: (count) => `Show ${count} more`,
  nobodyYet: 'Nobody has opened it yet. Share it with your class.',
  noClassList: 'Pupils who open it show here.',
  answersOf: (name) => `${name}'s answers`,
  answersFailed: "Couldn't load these answers.",
  noAnswer: 'No answer',
  right: 'Right',
  wrong: 'Wrong',
  notMarked: 'Not marked yet',
  pointsOf: (earned, possible) => `${formatPoints(earned)} of ${formatPoints(possible)} points`,
  done: 'Done',
};

// "8B · Due Fri 20 Nov, 17:00", "8B · No due date" or "8B · Closed 20 Nov, 17:00" (design.md §3.10, §4).
export function dueLine({ classes, deadline, closed, closedAt, now }) {
  const due = closed
    ? `Closed${closedAt ? ` ${formatDateTime(closedAt, { weekday: false, now })}` : ''}`
    : deadline
      ? `Due ${formatDateTime(deadline, { now })}`
      : 'No due date';
  return [classes, due].filter(Boolean).join(' · ');
}

// "12 min", "45 s" or "1 h 5 min": the time a pupil took.
export function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '';
  if (seconds < 60) return `${Math.round(seconds)} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

// Points as people write them: 16, or 16.5, never 16.00.
export const formatPoints = (value) => (Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10));

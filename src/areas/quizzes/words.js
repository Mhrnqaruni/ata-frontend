// The quiz area's shared words (Phase 1.46, SOT-14 W1; design.md §5): each quiz state's word, dot, tooltip and
// row button, and the words more than one quiz page says. Each page folder keeps its own words.js for the rest.
// Area: quizzes

import { formatDate } from '../../utils/dates';

// The states the library works out (SOT-2). `tone` is StatusDot's colour; only Live now pulses (design.md §6).
export const STATES = {
  draft: { label: 'Draft', tone: 'neutral', tip: 'Still being written' },
  ready: { label: 'Ready', tone: 'accent', tip: 'Finished editing, never run' },
  live: { label: 'Live now', tone: 'ok', pulse: true, tip: 'Running now' },
  homework: { label: 'Homework open', tone: 'ok', tip: 'Pupils can hand it in now' },
  finished: { label: 'Finished', tone: 'muted', tip: 'Has been run' },
  archived: { label: 'Archived', tone: 'muted', tip: 'Put away; only the Archived filter shows it' },
};

// The order states are listed in, for the Status filter and its counts.
export const STATE_ORDER = ['draft', 'ready', 'live', 'homework', 'finished', 'archived'];

// A quiz's state in words. Open homework adds its due date: "Homework open · due Fri 21 Nov", or "· no due date".
export function stateLabel(state, { deadline, now } = {}) {
  const label = STATES[state]?.label ?? '';
  if (state !== 'homework') return label;
  return `${label} · ${deadline ? `due ${formatDate(deadline, { year: 'auto', weekday: true, now })}` : 'no due date'}`;
}

// The buttons a quiz row shows in its state (Phase 1.47 R12; design.md §3.10): only Open, filled, while the quiz runs
// live or as open homework. `action` is what the page does; `variant` is the MUI button's. Starting, sending, running
// again and results moved to the row's click and its ⋯ menu, so the list stays calm.
export function stateActions(state) {
  return state === 'live' || state === 'homework' ? [{ action: 'open', label: 'Open', variant: 'contained' }] : [];
}

// A quiz's classes on one short line: "8B, 9C +1" (design.md §3.1), or "No class yet" (§10, M2).
export function classList(classes, { max = 2 } = {}) {
  const names = (classes || []).map((item) => item?.name).filter(Boolean);
  if (!names.length) return WORDS.noClassYet;
  const more = names.length - max;
  return more > 0 ? `${names.slice(0, max).join(', ')} +${more}` : names.join(', ');
}

// Words that more than one quiz page shows, and the shared parts' own words.
export const WORDS = {
  noClassYet: 'No class yet',
  notOnClassList: 'Not on your class list',
  belowHalf: 'Below half the points',
  copied: 'Copied ✓',
  notCopied: "Couldn't copy",
  joinAt: 'Join at',
  typeTheCode: 'Type the code',
  present: 'Present',
  exitPresent: 'Exit Present',
  share: 'Share',
  copyInvite: 'Copy invite',
  copyLink: 'Copy link',
  copyQr: 'Copy QR image',
  downloadQr: 'Download QR (PNG)',
  moreShare: 'More…',
  enlargeQr: 'Show the QR code bigger',
  cancel: 'Cancel',
  tooManyTries: 'Too many tries. Wait a minute, then try again.',
  codeNotChecked: "Couldn't check the code. Check your connection, then try again.",
};

// Words that never show on a quiz page (design.md §5): the screens say quiz, run, Results, "Not on your class list",
// "who takes it", Show answers and Finish quiz instead. A bare "Finish" button in the editor is also out.
export const NEVER_ON_SCREEN = ['session', 'publish', 'host', 'analytics', 'outsider', 'audience', 'cooldown'];
const NEVER = new RegExp(`\\b(${NEVER_ON_SCREEN.join('|')})(?:s|es|ed|ing)?\\b`, 'gi');

// The never-shown words in a text, lower case, once each: for a page's tests.
export const neverShownIn = (text) => [...new Set([...String(text).matchAll(NEVER)].map((m) => m[1].toLowerCase()))];

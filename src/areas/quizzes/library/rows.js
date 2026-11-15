// What a quiz list row shows and where it leads (design.md §3.1, §3.10): Last used, Average, status words, line 2, the
// ⋯ menu, the tags that fit, the page a click opens, the count and the layout. No React, so tests read it.
// Area: quizzes

import { formatDate, formatDay } from '../../../utils/dates';
import { STATES, classList } from '../words';
import { LIBRARY } from './words';

// The table's layout for the list's own width (design.md §3.0, item 7): one line a row when there's room for every
// column, two lines a row below that (1024 with the sidebar open), and the fewest columns on a phone.
export const WIDE = 1040;
export const NARROW = 600;
export const layoutFor = (width) => (width === null || width >= WIDE ? 'wide' : width >= NARROW ? 'narrow' : 'phone');

// The title as the server shows it, with a before-and-after quiz's prefix (services/quiz/helpers.py).
export function displayTitle(quiz) {
  if (quiz.quiz_phase === 'pre') return `Pre - ${quiz.title}`;
  if (quiz.quiz_phase === 'post') return `Post - ${quiz.title}`;
  return quiz.title;
}

// An open run's own page: the live page, or the homework page.
export const runPath = (run) =>
  run.kind === 'live' ? `/quizzes/sessions/${run.id}/host` : `/quizzes/sp-sessions/${run.id}/host`;

// The page a click on the row opens, by state (design.md §3.10): a running quiz's live or homework page, a draft in
// the editor, a ready quiz in the editor's Ready panel (its Start now or Send), and a quiz with runs in its results.
export function openPath(quiz) {
  if ((quiz.state === 'live' || quiz.state === 'homework') && quiz.open_run) return runPath(quiz.open_run);
  if (quiz.state === 'ready') return `/quizzes/${quiz.id}/edit?step=ready`;
  if (quiz.state === 'draft' || !quiz.run_count) return `/quizzes/${quiz.id}/edit`;
  return `/quizzes/${quiz.id}/results`;
}

// A day after another word: "today" and "yesterday" in lower case, other days as formatDay writes them.
const dayAfterWord = (value, now) => {
  const text = formatDay(value, { now });
  return text === 'Today' || text === 'Yesterday' ? text.toLowerCase() : text;
};

// The Last used cell: the latest run's day, or "Edited 3 Oct" in ink-3 for a quiz that has never run (§10, C1-6).
export function lastUsed(quiz, now = new Date()) {
  if (quiz.run_count) return { text: formatDay(quiz.last_used_at, { now }), edited: false };
  return { text: LIBRARY.editedOn(dayAfterWord(quiz.updated_at, now)), edited: true };
}

// The Average cell (R12, C7): the latest run's average, rounded as the results page rounds it, "72%"; "—" when the
// quiz has never run or nobody has finished.
const averageOf = (quiz) => {
  const average = quiz.latest_run?.average_percent;
  return typeof average === 'number' && Number.isFinite(average) ? `${Math.round(average)}%` : null;
};
export const averageText = (quiz) => averageOf(quiz) ?? '—';

// A run's class names, whether the API gives { id, name } or plain names.
const classNames = (classes) =>
  (classes || []).map((item) => (typeof item === 'string' ? item : item?.name)).filter(Boolean);

// The Average's tooltip (OQ5): "Latest run · 14 Nov · 8B · 26 pupils", or "… · 12 pupils so far" while that run is
// still open, as its average covers only the pupils who have finished.
export function averageTip(quiz, now = new Date()) {
  const run = quiz.latest_run;
  if (!run) return LIBRARY.notRunYet;
  const names = classNames(run.classes);
  let pupils = run.open ? LIBRARY.nobodyYet : LIBRARY.nobodyFinished;
  if (run.finished) pupils = run.open ? LIBRARY.soFar(LIBRARY.pupils(run.finished)) : LIBRARY.pupils(run.finished);
  const classes = names.length ? classList(names.map((name) => ({ name }))) : '';
  return [LIBRARY.latestRun, formatDay(run.date, { now }), classes, pupils].filter(Boolean).join(' · ');
}

// The Status column's words, only where the teacher must act (R12, design.md §3.10): Live now, open homework with its
// due date ("Homework · due Fri 20 Nov", or "Homework · open"), and Draft. Ready, finished and archived say nothing.
// Returns { state, text } (the state gives the dot and the tooltip), or null.
export function rowStatus(quiz, now = new Date()) {
  if (quiz.state === 'live' || quiz.state === 'draft') return { state: quiz.state, text: STATES[quiz.state].label };
  if (quiz.state !== 'homework') return null;
  const due = quiz.open_run?.deadline;
  const text = due ? LIBRARY.homeworkDue(formatDate(due, { year: 'auto', weekday: true, now })) : LIBRARY.homeworkOpen;
  return { state: 'homework', text };
}

// The second line of a two-line row: "Average 72% · Last used 3 Oct · 8B, 9C +1", or "Edited 1 Oct · No class yet" for
// a quiz that has never run. The Average comes first and the classes last, so long class names never cut the Average
// off (the Designer's C9 check, L1). A phone leaves the classes out (L2).
export function metaLine(quiz, now = new Date(), { classes = true } = {}) {
  const used = quiz.run_count
    ? LIBRARY.usedOn(dayAfterWord(quiz.last_used_at, now))
    : LIBRARY.editedOn(dayAfterWord(quiz.updated_at, now));
  const average = averageOf(quiz);
  return [average && LIBRARY.averageLine(average, quiz.latest_run.open), used, classes && classList(quiz.classes)]
    .filter(Boolean)
    .join(' · ');
}

// A row's ⋯ menu, in order (design.md §3.10): first what its state invites (Unarchive for an archived quiz, Run
// again… once it has run, Start… or Send… when ready, Continue editing for a draft), then Results once it has runs,
// Edit questions (a draft's first item already edits), Change name, Make a copy, Add tag and Archive. RowMenu adds
// the divider and Delete.
const FIRST = { finished: 'again', ready: 'start', draft: 'continue' };
export function menuItems(quiz) {
  const running = quiz.state === 'live' || quiz.state === 'homework';
  const putAway = Boolean(quiz.archived_at);
  const first = putAway && !running ? 'unarchive' : FIRST[quiz.state];
  const items = [first, quiz.run_count ? 'results' : null, first === 'continue' ? null : 'edit', 'rename', 'copy'];
  items.push('tags', first === 'unarchive' ? null : putAway ? 'unarchive' : 'archive');
  return items.filter(Boolean);
}

// How many tag chips show beside the title (R14, design.md §3.10): the title comes first, then up to `max` chips in
// the room left, and the rest in "+n". A title too long for its room drops every chip into "+n", so a title is never
// cut while its tags show. `title` and `tags` are widths in px; `room` is the Quiz cell's inside width.
export const TITLE_GAP = 8;
export const CHIP_GAP = 4;
export const PLUS_WIDTH = 36;
export function tagsThatFit({ title, tags, room, max = 2 }) {
  for (let shown = Math.min(max, tags.length); shown > 0; shown -= 1) {
    const chips = tags.slice(0, shown).reduce((sum, width) => sum + width, 0) + CHIP_GAP * (shown - 1);
    const plus = shown < tags.length ? CHIP_GAP + PLUS_WIDTH : 0;
    if (title + TITLE_GAP + chips + plus <= room) return shown;
  }
  return 0;
}

// The count at the end of the filter row: "135 quizzes", or "23 of 135" while a filter is set. The 135 is the plain
// list, which leaves archived quizzes out, so the Archived view says "3 archived quizzes".
export function countText({ shown, all, filtered, archived }) {
  if (archived) return LIBRARY.archivedCount(shown);
  return filtered && all !== undefined ? LIBRARY.count(shown, all) : LIBRARY.count(shown);
}

// The "Live now" strip's quizzes: shown while one of them isn't already among the first 5 rows (design.md §3.1).
export function liveToShow(liveNow, rows) {
  const top = new Set(rows.slice(0, 5).map((quiz) => quiz.id));
  return (liveNow || []).some((quiz) => !top.has(quiz.id)) ? liveNow : [];
}

// A tag on the chosen quizzes: on 'all' of them, 'some' or 'none', for the tag menu's ticks (SOT-3, SOT-5). A click
// on a tag every chosen quiz has takes it off them all; any other click adds it to those without it.
export function tagState(tagId, quizzes) {
  const carrying = quizzes.filter((quiz) => (quiz.tags || []).some((tag) => String(tag.id) === String(tagId))).length;
  if (!quizzes.length || !carrying) return 'none';
  return carrying === quizzes.length ? 'all' : 'some';
}

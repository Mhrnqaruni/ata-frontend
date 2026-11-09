// The words on a parent-mode list row (design §1.6, §5.3): the line under the title with its verb, and the status at
// the right. Plain functions, so the row, its tests and any announcement of a change say the same thing.
// Area: family

import { materialName } from '../familyPresentation.js';
import { whenLabel } from '../whenLabel.js';

const RUNNING = ['queued', 'running'];
const JUST_NOW = 2 * 60 * 1000; // a check sent in the last two minutes was "sent just now"

const outOf = (score, total) => `${score} of ${total} right`;

/**
 * What a list item's row says at its right (an item of SOT B4's list): { state, text, look }, where text is '' when
 * the row says nothing there, and `look` counts a marked check's answers to look at (design §5.3).
 * - making: still being made, "Making… about a minute" ("Marking… about a minute" for a check), beside a spinner;
 * - scored: a marked check, or a quiz's latest try, as "4 of 6 right";
 * - untried: a quiz not tried yet, as the chip "Not tried yet";
 * - done: any other finished item, which needs no word ("Ready" is gone, as every finished item would say it);
 * - pages: a check that needs more pages, which its line says, beside Add the missing pages;
 * - failed: any other status, "Didn’t finish"; a check says it in its line instead ("Couldn’t be marked").
 */
export function rowStatus({ kind, status, summary }) {
  const check = kind === 'check';
  if (RUNNING.includes(status)) {
    return { state: 'making', text: check ? 'Marking… about a minute' : 'Making… about a minute' };
  }
  if (status === 'needs_input') return { state: 'pages', text: '' };
  if (status !== 'completed') return { state: 'failed', text: check ? '' : 'Didn’t finish' };
  if (check && summary?.total > 0) {
    // "Not quite" and "AI isn't sure" are both for the parent to look at (design §5.3).
    const look = (summary.notQuite || 0) + (summary.toCheck || 0);
    return { state: 'scored', text: outOf(summary.right, summary.total), look };
  }
  if (kind === 'quiz') {
    const latest = summary?.latest;
    return latest
      ? { state: 'scored', text: outOf(latest.score, latest.total) }
      : { state: 'untried', text: 'Not tried yet' };
  }
  return { state: 'done', text: '' };
}

/** The warning chip beside a marked check's score, when it has answers to look at: "2 to look at". */
export const lookWords = (count) => `${count} to look at`;

// Each kind's name before the date line, in a list that mixes kinds (design §2.3): "Homework · marked today at 16:20".
const KIND_NAMES = {
  check: 'Homework',
  quiz: 'Quiz',
  flashcards: 'Flashcards',
  mindmap: 'Mind map',
  story: 'Story',
  learn: 'Explanation',
};

// After a verb or a word, "Today at 10:15" reads "today at 10:15"; a date such as "3 Nov" stays as it is.
const lowerDay = (label) => label.replace(/^(Today|Yesterday)/, (word) => word.toLowerCase());
// A verb and a time, or '' with no time.
const withVerb = (verb, label) => label && `${verb} ${lowerDay(label)}`;

// A homework check's line, in the one verb for the AI's work, "mark" (design §5.3).
function checkLine({ status, createdAt, finishedAt }, now) {
  if (RUNNING.includes(status)) {
    const sent = now - new Date(createdAt);
    return sent < JUST_NOW ? 'Sent just now' : withVerb('Sent', whenLabel(createdAt, now));
  }
  if (status === 'needs_input') return 'Needs more pages';
  if (status !== 'completed') return 'Couldn’t be marked';
  return withVerb('Marked', whenLabel(finishedAt || createdAt, now));
}

// Any other kind's line: "Made" once it's finished, and "Started" while it's being made or when it didn't finish.
function madeLine({ status, createdAt, finishedAt }, now) {
  const finished = status === 'completed' || status === 'needs_input';
  return withVerb(finished ? 'Made' : 'Started', whenLabel(finished ? finishedAt || createdAt : createdAt, now));
}

/**
 * The line under a row's title (design §1.6, §5.3): its time with a verb, so a parent knows what the time means. A
 * check was "Sent" while it's marking, then "Marked", or says what went wrong; anything else was "Made" or "Started".
 * `withKind`, for a list that mixes kinds, puts the kind first: "Quiz · made today at 10:15". `now` is for tests.
 */
export function dateLine(item, { withKind = false, now = new Date() } = {}) {
  const line = item.kind === 'check' ? checkLine(item, now) : madeLine(item, now);
  const name = withKind ? KIND_NAMES[item.kind] : '';
  if (!name) return line;
  return [name, line && line[0].toLowerCase() + line.slice(1)].filter(Boolean).join(' · ');
}

// A saved file is a photo by its type, or by its name when the type is missing.
const isPhoto = (file) =>
  file.mime ? file.mime.startsWith('image/') : /\.(jpe?g|png|heic|webp)$/i.test(file.name || '');

/**
 * A saved homework upload's title (design §5.3): "Photos from 28 Oct" for photos, which a camera names only by number,
 * and otherwise the upload's own name, such as a PDF's.
 */
export function savedTitle(material, now = new Date()) {
  const files = material.files || [];
  const when = whenLabel(material.createdAt, now);
  if (!when || !files.length || !files.every(isPhoto)) return materialName(material);
  return `${files.length === 1 ? 'Photo' : 'Photos'} from ${lowerDay(when)}`;
}

/** The line under a saved homework upload's title (design §5.3): "2 photos, saved but not marked". */
export function savedLine({ files = [] }) {
  const noun = files.length && files.every(isPhoto) ? 'photo' : 'file';
  return `${files.length} ${noun}${files.length === 1 ? '' : 's'}, saved but not marked`;
}

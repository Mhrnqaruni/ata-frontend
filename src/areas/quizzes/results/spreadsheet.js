// A run's results as a spreadsheet (CSV) where the server makes none (homework): the class list, then those not on
// it, each with their status and score. Excel reads the byte-order mark as UTF-8, so names keep their accents.
// Area: quizzes

import { saveBlob } from './files';
import { byName, isBelowHalf, points, resultScore } from './figures';
import { RESULTS, statusWord } from './words';

export const BYTE_ORDER_MARK = String.fromCharCode(0xfeff);

// One cell: quoted when it holds a comma, quote or line break. Text a spreadsheet would run as a formula (=, +, -,
// @) gets a leading apostrophe, because walk-ins type their own names.
function cell(value, { text = false } = {}) {
  let shown = value === null || value === undefined ? '' : String(value);
  if (text && /^[=+\-@\t\r]/.test(shown)) shown = `'${shown}`;
  return /[",\n\r]/.test(shown) ? `"${shown.replace(/"/g, '""')}"` : shown;
}

export function resultsCsv(summary) {
  const row = (pupil, onList) => [
    cell(pupil.name, { text: true }),
    cell(pupil.display_id, { text: true }),
    cell(onList ? 'Yes' : 'No'),
    cell(statusWord(pupil, summary)),
    cell(points(resultScore(pupil))),
    cell(points(summary.max_points)),
    cell(isBelowHalf(pupil, summary.max_points) ? 'Yes' : ''),
  ];
  const lines = [
    RESULTS.csvHead.map((head) => cell(head)),
    ...byName(summary.pupils).map((pupil) => row(pupil, true)),
    ...byName(summary.not_on_class_list).map((pupil) => row(pupil, false)),
  ];
  return `${BYTE_ORDER_MARK}${lines.map((line) => line.join(',')).join('\r\n')}\r\n`;
}

// "Fractions homework results 14 Nov.csv", with the characters a file name can't hold left out.
export const csvName = (title, day) =>
  `${`${title} results ${day}`
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()}.csv`;

// Saves the text as a file, as the services' downloads do.
export const saveCsv = (text, fileName) => saveBlob(new Blob([text], { type: 'text/csv;charset=utf-8' }), fileName);

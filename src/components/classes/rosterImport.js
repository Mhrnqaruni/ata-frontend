// The class-list import's rules, with no UI (Phase 1.42, SOT-7 and SOT-8): the types and limits checked before any
// upload, each reason's words, the join of several files' students into one list, and the list's own counts.
// Area: academics

export const MAX_FILES = 10;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
export const MAX_STUDENTS = 1000;

// What the file picker offers. .xls and .doc come through too, so they get their own words instead of a refusal.
export const ROSTER_ACCEPT = {
  'text/csv': ['.csv'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/heic': ['.heic'],
  'image/heif': ['.heif'],
  'application/vnd.ms-excel': ['.xls'],
  'application/msword': ['.doc'],
};
const READABLE = ['.csv', '.xlsx', '.docx', '.pdf', '.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'];
const OLD = ['.xls', '.doc'];

const extension = (name = '') => {
  const dot = name.lastIndexOf('.');
  return dot < 0 ? '' : name.slice(dot).toLowerCase();
};

/**
 * Each new file's reason it can't be sent, or null, before any upload (SOT-8): the type by its extension, 10 MB a
 * file, and 10 files and 20 MB in all with the files already in the window.
 * @param {File[]} files - the files just dropped
 * @param {{size: number}[]} [kept] - the files already sent or waiting
 * @returns {{file: File, reason: string|null}[]}
 */
export function checkLimits(files, kept = []) {
  let count = kept.length;
  let bytes = kept.reduce((sum, file) => sum + file.size, 0);
  return files.map((file) => {
    const type = extension(file.name);
    let reason = null;
    if (OLD.includes(type)) reason = 'old_format';
    else if (!READABLE.includes(type)) reason = 'wrong_type';
    else if (file.size > MAX_FILE_BYTES) reason = 'too_large';
    else if (count >= MAX_FILES) reason = 'too_many_files';
    else if (bytes + file.size > MAX_UPLOAD_BYTES) reason = 'too_much_in_all';
    if (!reason) {
      count += 1;
      bytes += file.size;
    }
    return { file, reason };
  });
}

const bold = (text) => ({ bold: text });

// Each reason's pill and the line under the file's name (design §3.4), and the sentence naming the file (§5), as
// parts where {bold} parts are shown bold. ai_failed alone can be read again.
const WORDS = {
  no_students: {
    pill: 'No students',
    tone: 'warn',
    line: "Check it's a class list, or try a clearer photo.",
    message: (file) => ['No students found in ', bold(file), ". Check it's a class list, or try a clearer photo."],
  },
  unreadable: {
    pill: "Couldn't read",
    line: 'Try a clearer photo or scan.',
    message: (file) => [
      bold(file),
      " couldn't be read. Add a clearer photo with ",
      bold('Add or remove files'),
      ', or type its students with ',
      bold('Add a student'),
      '.',
    ],
  },
  ai_failed: {
    pill: "Couldn't read",
    line: "Couldn't read it just now.",
    again: true,
    message: (file) => [bold(file), " couldn't be read just now."],
  },
  old_format: {
    line: 'An old Excel or Word file: save it as .xlsx or .docx.',
    message: (file) => [bold(file), ' is an old Excel or Word file. Save it as .xlsx or .docx.'],
  },
  too_large: {
    line: 'Over 10 MB: make it smaller.',
    message: (file) => [bold(file), ' is over 10 MB. Make it smaller.'],
  },
  too_many_pages: {
    line: 'More than 5 pages: split it into smaller files.',
    message: (file) => [bold(file), ' has more than 5 pages. Split it into smaller files.'],
  },
  too_many_rows: {
    line: 'More than 200 rows: split the list.',
    message: (file) => [bold(file), ' has more than 200 rows. Split the list.'],
  },
  // A Word file counts its lines, not rows (QA S1-P3-2).
  too_many_lines: {
    line: 'More than 200 lines: split the list.',
    message: (file) => [bold(file), ' has more than 200 lines. Split the list.'],
  },
  too_much_text: {
    line: 'Too much text: split it into smaller files.',
    message: (file) => [bold(file), ' has too much text. Split it into smaller files.'],
  },
  wrong_type: {
    line: 'Use CSV, Excel, Word, PDF or a photo.',
    message: (file) => [bold(file), " can't be read. Use CSV, Excel, Word, PDF or a photo."],
  },
  too_many_files: {
    line: 'Up to 10 files at a time: remove one first.',
    message: (file) => [bold(file), " wasn't read: up to 10 files at a time."],
  },
  too_much_in_all: {
    line: 'Over 20 MB in all: remove a file first.',
    message: (file) => [bold(file), " wasn't read: over 20 MB in all."],
  },
};

/**
 * A reason's words for one file; an unknown reason reads as a failed read, which can be read again.
 * @returns {{pill: string, tone: string, line: string, again: boolean, message: Array}}
 */
export function reasonWords(reason, fileName) {
  const lines = reason === 'too_many_rows' && extension(fileName) === '.docx';
  const words = WORDS[lines ? 'too_many_lines' : reason] || WORDS.ai_failed;
  return {
    pill: words.pill || "Can't use",
    tone: words.tone || 'bad',
    line: words.line,
    again: Boolean(words.again),
    message: words.message(fileName),
  };
}

/** A message's parts as plain text. */
export const plainText = (parts) => parts.map((part) => (typeof part === 'string' ? part : part.bold)).join('');

// The key a name is joined by: NFC, straight quotes and hyphens, single spaces, lower case. The twin of the
// backend's roster_import.name_key; both run the same cases. ß is casefold's one common difference from lower case.
const MARKS = { '’': "'", '‘': "'", ʼ: "'", '´': "'", '“': '"', '”': '"', '–': '-', '—': '-' };

export function nameKey(name) {
  const normal = String(name ?? '')
    .normalize('NFC')
    .replace(/[’‘ʼ´“”–—]/g, (mark) => MARKS[mark]);
  return normal.split(/\s+/).filter(Boolean).join(' ').toLowerCase().replace(/ß/g, 'ss');
}

/** Whether two spellings are one name, differing only in presentation; a dropped accent is a real difference. */
export const sameName = (first, second) => nameKey(first) === nameKey(second);

const note = (row, file, text) => {
  if (!row.notes.some((item) => item.file === file.key && item.text === text)) row.notes.push({ file: file.key, text });
};
const addSource = (row, file) => {
  if (!row.sources.includes(file.key)) row.sources.push(file.key);
};

/**
 * Joins one file's students into the current list (SOT-7). The current list wins, so the teacher's edits stay:
 * - a real ID already in the list adds the file to that row, noting a different name;
 * - an ID MST made is joined by name: dropped under a row of that name (noted when its ID was made too), and a
 *   real ID takes the place of a made one for the same name, so no file order makes one student twice;
 * - one file's rows are never joined with each other: the check flags a repeated ID.
 * @param {object[]} current - the list's rows
 * @param {{key: string, name: string, rows: object[]}} file - one read: its key, name and students
 * @returns {object[]} a new list
 */
export function mergeRows(current, file) {
  const rows = current.map((row) => ({ ...row, sources: [...row.sources], notes: [...row.notes] }));
  const byId = new Map();
  const byName = new Map();
  for (const row of rows) {
    if (!row.madeId && row.studentId.trim() && !byId.has(row.studentId)) byId.set(row.studentId, row);
    if (row.name.trim() && !byName.has(nameKey(row.name))) byName.set(nameKey(row.name), row);
  }
  let seq = rows.reduce((last, row) => Math.max(last, row.seq), 0);
  const added = [];
  file.rows.forEach((read, index) => {
    const known = read.madeId ? undefined : byId.get(read.studentId);
    if (known) {
      addSource(known, file);
      if (!sameName(known.name, read.name)) note(known, file, `Named differently in ${file.name}: ${read.name}`);
      return;
    }
    const named = byName.get(nameKey(read.name));
    if (named && read.madeId) {
      addSource(named, file);
      if (named.madeId) note(named, file, `Also in ${file.name}`);
      return;
    }
    if (named && named.madeId) {
      Object.assign(named, { studentId: read.studentId, madeId: false });
      addSource(named, file);
      return;
    }
    seq += 1;
    added.push({
      key: `${file.key}:${index}`,
      seq,
      name: read.name,
      studentId: read.studentId,
      madeId: Boolean(read.madeId),
      unclear: Boolean(read.unclear),
      section: read.section || null,
      file: file.key,
      sources: [file.key],
      notes: [],
      removed: false,
    });
  });
  return [...rows, ...added];
}

/** Takes a removed file out of each row's sources and notes, and drops the rows left with no file. */
export function removeFile(rows, fileKey) {
  return rows.flatMap((row) => {
    if (!row.sources.includes(fileKey)) return [row];
    const sources = row.sources.filter((key) => key !== fileKey);
    if (!sources.length) return [];
    const notes = row.notes.filter((item) => item.file !== fileKey);
    return [{ ...row, sources, notes, file: sources.includes(row.file) ? row.file : sources[0] }];
  });
}

/** An empty row the teacher adds, for a student the files missed. */
export const emptyRow = (seq) => ({
  key: `new:${seq}`,
  seq,
  name: '',
  studentId: '',
  madeId: false,
  unclear: false,
  section: null,
  file: null,
  sources: [],
  notes: [],
  removed: false,
});

/** What a row needs before it can be checked: the backend's Row wants a name of 2 or more letters and an ID. */
export function rowProblem(row) {
  if (row.name.trim().length < 2) return 'Add a name.';
  if (!row.studentId.trim()) return 'Add an ID.';
  return null;
}

/**
 * The rows the check and the add receive: those still in the list, in the order they came, numbered from 1
 * (SOT-7). Only row, name, studentId and madeId go, with the key kept beside them to read the answer.
 * @returns {{key: string, body: {row: number, name: string, studentId: string, madeId: boolean}}[]}
 */
export function rowsToSend(rows) {
  return rows
    .filter((row) => !row.removed && !rowProblem(row))
    .sort((a, b) => a.seq - b.seq)
    .map((row, index) => ({
      key: row.key,
      body: { row: index + 1, name: row.name.trim(), studentId: row.studentId.trim(), madeId: row.madeId },
    }));
}

const groupOf = (row) => `${row.file ?? ''}\u0000${row.section ?? ''}`;

/** Whether the list shows a sub-head per sheet or heading: rows from more than one, with at least one named. */
export function hasSections(rows) {
  return rows.some((row) => row.section) && new Set(rows.map(groupOf)).size > 1;
}

/** The list's groups in order, each {key, file, section, rows}; one group, with no sub-head, without sections. */
export function groupRows(rows) {
  if (!hasSections(rows)) return [{ key: 'all', file: null, section: null, rows }];
  const groups = [];
  for (const row of rows) {
    const last = groups[groups.length - 1];
    if (last && last.key === groupOf(row)) last.rows.push(row);
    else groups.push({ key: groupOf(row), file: row.file, section: row.section, rows: [row] });
  }
  return groups;
}

/**
 * Rows that need a fix first, then "Check spelling" rows, then the rest as they were (design §3.4); with sections,
 * inside each sheet or heading, which keep their order.
 * @param {(row: object) => boolean} needsFix
 */
export function sortRows(rows, needsFix) {
  const grouped = hasSections(rows);
  const order = new Map();
  for (const row of rows) if (!order.has(groupOf(row))) order.set(groupOf(row), order.size);
  const rank = (row) => (needsFix(row) ? 0 : row.unclear ? 1 : 2);
  return rows
    .map((row, index) => ({ row, index }))
    .sort(
      (a, b) =>
        (grouped ? order.get(groupOf(a.row)) - order.get(groupOf(b.row)) : 0) ||
        rank(a.row) - rank(b.row) ||
        a.index - b.index
    )
    .map((item) => item.row);
}

/** "1 student", "3 students". */
export const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

/** A link row's chip: "Also in 7A", "Also in 7A and 2 more". */
export function alsoIn(classes = []) {
  if (!classes.length) return null;
  return classes.length === 1 ? `Also in ${classes[0]}` : `Also in ${classes[0]} and ${classes.length - 1} more`;
}

/** The skipped students' line: up to 3 names, a differently saved one with its saved spelling, then "and {n} more". */
export function skippedLine(skipped) {
  const names = skipped
    .slice(0, 3)
    .map((item) => (item.savedName ? `${item.name} (saved as ${item.savedName})` : item.name));
  const more = skipped.length > 3 ? ` and ${skipped.length - 3} more` : '';
  return `Already in this class, so not added: ${names.join(', ')}${more}`;
}

/** The notice after adding, from the add's counts, with only the parts that apply (design §3.6). */
export function addedNotice({ created = 0, linked = 0, skipped = 0 }) {
  const parts = [];
  if (created) parts.push(`Added ${plural(created, 'student')}`);
  if (linked) parts.push(`${linked} linked from your other classes`);
  if (skipped) parts.push(`${skipped} already in this class`);
  return parts.length ? `${parts.join(' · ')}.` : 'No students were added.';
}

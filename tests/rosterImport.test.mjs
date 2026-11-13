// The class-list import's rules (Phase 1.42, SOT-7 and SOT-8): the limits before any upload, the join of several
// files, the rows sent to the check, and the list's words. The name cases are the backend's test_roster_rules.py's.
// Area: academics
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addedNotice,
  alsoIn,
  checkLimits,
  emptyRow,
  groupRows,
  mergeRows,
  plainText,
  reasonWords,
  removeFile,
  rowProblem,
  rowsToSend,
  sameName,
  skippedLine,
  sortRows,
} from '../src/components/classes/rosterImport.js';

// The same pairs as the backend's SAME and DIFFERENT lists.
const SAME = [
  ["Liam O'Brien", 'Liam O’Brien'], // Word's curly apostrophe
  ['Zoë Brontë', 'Zoë Brontë'], // NFC and NFD
  ['Amelia  Patel', ' Amelia Patel '], // doubled and outer spaces
  ['Amelia PATEL', 'amelia patel'], // case
  ['Anne-Marie Lee', 'Anne–Marie Lee'], // an en dash
];
const DIFFERENT = [
  ['Zoe Brontë', 'Zoë Brontë'],
  ['Mohammed', 'Muhammad'],
];

test('names differing only in presentation are the same name, and real differences are not', () => {
  for (const [first, second] of SAME) assert.ok(sameName(first, second) && sameName(second, first), first);
  for (const [first, second] of DIFFERENT) assert.ok(!sameName(first, second), first);
});

const MB = 1024 * 1024;
const file = (name, size = 1000) => ({ name, size });

test('the limits name each refused file before any upload, and the others still go', () => {
  const reasons = checkLimits([
    file('7B.csv'),
    file('old.xls'),
    file('notes.doc'),
    file('scan.txt'),
    file('photo.HEIC', 3 * MB),
    file('huge.pdf', 11 * MB),
  ]).map((item) => item.reason);
  assert.deepEqual(reasons, [null, 'old_format', 'old_format', 'wrong_type', null, 'too_large']);
  // 10 files and 20 MB in all, counting the files already in the window; a refused file doesn't count.
  const kept = Array.from({ length: 9 }, () => ({ size: MB }));
  assert.deepEqual(
    checkLimits([file('a.png', MB), file('b.png', MB)], kept).map((item) => item.reason),
    [null, 'too_many_files']
  );
  assert.deepEqual(
    checkLimits([file('a.jpg', 9 * MB), file('bad.txt'), file('b.jpg', 9 * MB), file('c.jpg', 3 * MB)]).map(
      (item) => item.reason
    ),
    [null, 'wrong_type', null, 'too_much_in_all']
  );
});

test("each reason has the design's words, and only a failed read can be read again", () => {
  assert.equal(
    plainText(reasonWords('old_format', 'a.xls').message),
    'a.xls is an old Excel or Word file. Save it as .xlsx or .docx.'
  );
  assert.equal(
    plainText(reasonWords('unreadable', 'photo.jpg').message),
    "photo.jpg couldn't be read. Add a clearer photo with Add or remove files, or type its students with Add a student."
  );
  assert.equal(reasonWords('no_students', 'x.pdf').pill, 'No students');
  assert.equal(reasonWords('too_many_rows', 'x.xlsx').pill, "Can't use");
  assert.equal(reasonWords('too_many_rows', 'list.docx').line, 'More than 200 lines: split the list.');
  assert.equal(reasonWords('ai_failed', 'x.pdf').again, true);
  assert.equal(reasonWords('too_large', 'x.pdf').again, false);
  assert.deepEqual(reasonWords('something new', 'x.pdf'), reasonWords('ai_failed', 'x.pdf'));
  for (const reason of ['old_format', 'too_large', 'too_many_pages', 'too_much_text', 'wrong_type', 'unreadable'])
    assert.doesNotMatch(plainText(reasonWords(reason, 'f').message), /\bwe\b/i);
});

const read = (name, studentId, more = {}) => ({
  name,
  studentId,
  madeId: false,
  unclear: false,
  section: null,
  ...more,
});
const made = (name, studentId) => read(name, studentId, { madeId: true });
const join = (...files) => files.reduce((rows, item) => mergeRows(rows, item), []);

test('a real ID joins across files, and a different name is noted on the first file’s row', () => {
  const rows = join(
    { key: 'f1', name: 'register.csv', rows: [read('Amara Okafor', 'S1'), read('Ben Hughes', 'S2')] },
    {
      key: 'f2',
      name: 'late.docx',
      rows: [read('Amara Okafor', 'S1'), read('Benjamin Hughes', 'S2'), read('Cal Ito', 'S3')],
    }
  );
  assert.deepEqual(
    rows.map((row) => [row.name, row.studentId, row.sources]),
    [
      ['Amara Okafor', 'S1', ['f1', 'f2']],
      ['Ben Hughes', 'S2', ['f1', 'f2']],
      ['Cal Ito', 'S3', ['f2']],
    ]
  );
  assert.deepEqual(rows[0].notes, []);
  assert.deepEqual(rows[1].notes, [{ file: 'f2', text: 'Named differently in late.docx: Benjamin Hughes' }]);
});

test('an ID MST made joins by name, a real ID takes its place, and one file’s rows stay apart', () => {
  const rows = join(
    { key: 'p', name: 'photo.jpg', rows: [made('Sam Lee', 'MST-AAAA2222'), made('Zoë Brontë', 'MST-BBBB3333')] },
    { key: 'q', name: 'sheet.pdf', rows: [made('Zoë  Brontë', 'MST-CCCC4444'), read('sam lee', 'S9')] },
    { key: 'r', name: 'twins.csv', rows: [made('Kai Doe', 'MST-DDDD5555'), made('Kai Doe', 'MST-EEEE6666')] }
  );
  assert.deepEqual(
    rows.map((row) => [row.name, row.studentId, row.madeId, row.notes.map((item) => item.text)]),
    [
      ['Sam Lee', 'S9', false, []],
      ['Zoë Brontë', 'MST-BBBB3333', true, ['Also in sheet.pdf']],
      ['Kai Doe', 'MST-DDDD5555', true, []],
      ['Kai Doe', 'MST-EEEE6666', true, []],
    ]
  );
  // An MST row under a real ID's name is dropped, and the teacher's edits win over a later file.
  const edited = rows.map((row) => (row.studentId === 'S9' ? { ...row, name: 'Samuel Lee' } : row));
  const again = mergeRows(edited, {
    key: 's',
    name: 'again.csv',
    rows: [made('Samuel Lee', 'MST-FFFF7777'), read('Sam Lee', 'S9')],
  });
  assert.equal(again.length, 4);
  assert.equal(again[0].name, 'Samuel Lee');
});

test('removing a file drops the rows only it had, and its notes; added rows stay', () => {
  const rows = [
    ...join(
      { key: 'f1', name: 'a.csv', rows: [read('Amara Okafor', 'S1'), read('Ben Hughes', 'S2')] },
      { key: 'f2', name: 'b.csv', rows: [read('Ben Hughes', 'S2'), read('Amara O.', 'S1')] }
    ),
    emptyRow(9),
  ];
  const left = removeFile(rows, 'f1');
  assert.deepEqual(
    left.map((row) => [row.name, row.sources, row.file, row.notes.length]),
    [
      ['Amara Okafor', ['f2'], 'f2', 1],
      ['Ben Hughes', ['f2'], 'f2', 0],
      ['', [], null, 0],
    ]
  );
  assert.deepEqual(
    removeFile(left, 'f2').map((row) => row.key),
    ['new:9']
  );
});

test('only rows in the list with a name and an ID are sent, in the order they came, with four fields', () => {
  const rows = join({
    key: 'f',
    name: 'a.csv',
    rows: [read(' Amara Okafor ', 'S1 '), made('Ben Hughes', 'MST-2'), read('Cal', 'S3')],
  });
  rows[2].removed = true;
  const added = { ...emptyRow(7), name: 'Dee Rao', studentId: 'S4' };
  const sent = rowsToSend([added, ...rows, emptyRow(8)]);
  assert.deepEqual(
    sent.map((item) => item.body),
    [
      { row: 1, name: 'Amara Okafor', studentId: 'S1', madeId: false },
      { row: 2, name: 'Ben Hughes', studentId: 'MST-2', madeId: true },
      { row: 3, name: 'Dee Rao', studentId: 'S4', madeId: false },
    ]
  );
  assert.equal(rowProblem(emptyRow(1)), 'Add a name.');
  assert.equal(rowProblem({ ...emptyRow(1), name: 'Al' }), 'Add an ID.');
});

test('rows needing a fix come first, then the unclear ones, inside each sheet', () => {
  const rows = join({
    key: 'w',
    name: 'school.xlsx',
    rows: [
      read('A One', '1', { section: '7A' }),
      read('B Two', '2', { section: '7A', unclear: true }),
      read('C Three', '', { section: '7A' }),
      read('D Four', '4', { section: '7B' }),
      read('E Five', '', { section: '7B' }),
    ],
  });
  const sorted = sortRows(rows, (row) => Boolean(rowProblem(row)));
  assert.deepEqual(
    sorted.map((row) => row.name),
    ['C Three', 'B Two', 'A One', 'E Five', 'D Four']
  );
  assert.deepEqual(
    groupRows(sorted).map((group) => [group.section, group.rows.length]),
    [
      ['7A', 3],
      ['7B', 2],
    ]
  );
  // One sheet, or none named: no sub-heads.
  assert.equal(groupRows(rows.slice(0, 3)).length, 1);
});

test("the list's words: classes, skipped names and the notice after adding", () => {
  assert.equal(alsoIn(['7A']), 'Also in 7A');
  assert.equal(alsoIn(['7A', '8C', '9D']), 'Also in 7A and 2 more');
  assert.equal(alsoIn([]), null);
  assert.equal(
    skippedLine([{ name: 'Zara Ahmed' }, { name: 'Leo Novak', savedName: 'Leo Novák' }]),
    'Already in this class, so not added: Zara Ahmed, Leo Novak (saved as Leo Novák)'
  );
  assert.equal(
    skippedLine(['A', 'B', 'C', 'D', 'E'].map((name) => ({ name }))),
    'Already in this class, so not added: A, B, C and 2 more'
  );
  assert.equal(
    addedNotice({ created: 20, linked: 2, skipped: 3 }),
    'Added 20 students · 2 linked from your other classes · 3 already in this class.'
  );
  assert.equal(addedNotice({ created: 1, linked: 0, skipped: 0 }), 'Added 1 student.');
});

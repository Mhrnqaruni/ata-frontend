// The Quick and review screens rendered to HTML from the real components: the upload panel, the one ask and the
// failed state (Phase 1.33 S2.4), the held questions and the AI-written key (S2.5), and the review notes (S3.3).
// Area: assessments
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import React from 'react';
import ReactDOMServer from 'react-dom/server';

// Bundle the components with MUI, but share this React, so the hooks see one copy.
const dir = await mkdtemp(path.join(process.cwd(), '.quick-pages-test-'));
after(() => rm(dir, { recursive: true, force: true }));
const outfile = path.join(dir, 'runtime.mjs');
await build({
  stdin: {
    contents: `export { QuickUploadPanel, QuickProgress, QuickSchemeReview } from './src/components/assessments/QuickAssessmentParts.jsx';
export { default as QuickPaperAsk, QuickPaperSkip } from './src/areas/assessments/QuickPaperAsk.jsx';
export { default as HeldQuestionsAlert } from './src/areas/assessments/HeldQuestionsAlert.jsx';
export { AnswerKeyNote } from './src/areas/assessments/QuickAnswerKey.jsx';
export { default as HeldReason, reasonFromFeedback } from './src/areas/assessments/HeldReason.jsx';
export { default as AgreementHint } from './src/areas/assessments/AgreementHint.jsx';
export { MemoryRouter } from 'react-router-dom';`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  jsx: 'automatic',
  mainFields: ['module', 'main'],
  external: ['react', 'react-dom', 'react/*', 'react-dom/*'],
  loader: { '.css': 'empty' },
  define: { 'import.meta.env.VITE_API_BASE_URL': '"http://offline.invalid"' }, // the answer key's service
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
  plugins: [
    {
      // Each icon's own file is CommonJS, which Node's rules import as an object; its ESM copy is the component.
      name: 'esm-icons',
      setup(build) {
        build.onResolve({ filter: /^@mui\/icons-material\/\w+$/ }, ({ path: icon, kind, resolveDir }) =>
          build.resolve(icon.replace('icons-material/', 'icons-material/esm/'), { kind, resolveDir })
        );
      },
    },
  ],
  outfile,
  logLevel: 'error',
});
const {
  QuickUploadPanel,
  QuickProgress,
  QuickPaperAsk,
  QuickPaperSkip,
  QuickSchemeReview,
  HeldQuestionsAlert,
  AnswerKeyNote,
  HeldReason,
  reasonFromFeedback,
  AgreementHint,
  MemoryRouter,
} = await import(pathToFileURL(outfile));

const markup = (component, props) => ReactDOMServer.renderToStaticMarkup(React.createElement(component, props));
// The page's words in reading order, without markup or the styles MUI writes inline.
const text = (html) =>
  html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');
const words = (component, props) => text(markup(component, props));
const none = { students: [], questions: [], keys: [] };
const sheets = { ...none, students: [{ name: 'sheets.pdf', size: 2048 }] };
const panel = (files, reviewBeforeGrading) => ({
  files,
  pick: () => () => {},
  settings: { assessmentName: 'Quick', classId: '', reviewBeforeGrading },
  setSettings() {},
  classes: [],
  busy: false,
  start() {},
});

test('the upload panel needs only answer sheets, with the paper and key as Optional extras under the limits', () => {
  const page = words(QuickUploadPanel, panel(none, false));
  assert.match(
    page,
    /50 files · 100 pages · 50 MB total Question paper and answer key Optional If you have them, they make the marks more accurate\./
  );
  assert.match(page, /Add answer key Answer key or mark scheme · PDF or images/);
  assert.match(page, /No class · Grade automatically Optional/);
  assert.match(page, /Check the answer key first Grading waits until you’ve checked it\./);
  assert.match(page, /Add answer sheets to get started\./);
  assert.doesNotMatch(page, /Sources added|marking scheme|pause if anything/);
  assert.doesNotMatch(markup(QuickUploadPanel, panel(none, false)), /File requirements and how grading works/);
});

test('the upload note appears only when the answer key is checked first', () => {
  assert.match(words(QuickUploadPanel, panel(sheets, true)), /You’ll check the answer key before grading\./);
  assert.doesNotMatch(words(QuickUploadPanel, panel(sheets, false)), /You’ll check|We’ll pause/);
});

test('the one ask asks for the question paper, says the sheets are kept, and offers the answer key as optional', () => {
  const ask = words(QuickPaperAsk, { files: none, pick: () => () => {}, busy: false });
  assert.match(
    ask,
    /Add the question paper The answer sheets seem to show the answers but not the questions, so they can’t be marked yet\. Your answer sheets are saved\. Choose the question paper/
  );
  assert.doesNotMatch(ask, /Marking carries on/); // choosing a file sends nothing (design review B1)
  assert.match(ask, /Choose the question paper PDF or images Browse files/);
  assert.match(ask, /Answer key \(optional\) Add answer key Answer key or mark scheme · PDF or images/);
});

test('a preparation that couldn’t finish shows its job’s reference', () => {
  const record = { id: '0a1b2c3d4e5f60718293a4b5c6d7e8f9', status: 'failed', stage: null, clock: null };
  assert.match(words(QuickProgress, { record, running: false, message: 'm' }), /Reference: 0A1B-2C3D/);
  assert.doesNotMatch(words(QuickProgress, { record: { ...record, status: 'running' }, running: true }), /Reference/);
});

// S2.5: the results page.
const heldQuestion = (n, extra = {}) => ({
  questionId: `q${n}`,
  printedLabel: `01.${n}`,
  maxScore: 1,
  reason: 'Figure 2 is missing from the question paper (copyright notice)',
  kind: 'figure',
  markedByHand: 0,
  students: 30,
  nextEntityId: `student-${n}`,
  ...extra,
});
const results = (held) =>
  markup(MemoryRouter, { children: React.createElement(HeldQuestionsAlert, { jobId: 'job-1', held }) });

test('a held question shows its label, marks and reason, and Mark by hand opens the next student on it', () => {
  const html = results([heldQuestion(7, { markedByHand: 3 })]);
  assert.match(
    text(html),
    /1 question wasn't marked 01\.7 · 1 mark — Figure 2 is missing from the question paper \(copyright notice\)\. Marked by hand for 3 of 30 students\. Mark by hand/
  );
  assert.match(html, /href="\/assessments\/job-1\/review\/student-7\?question=q7"/);
  assert.doesNotMatch(text(html), /Leave it out|Add the figure/);
  assert.equal(results([]), '');
});

test('more than 3 held questions show the first 3, then Show all', () => {
  const page = text(results([1, 2, 3, 4].map((n) => heldQuestion(n, { maxScore: 2 }))));
  assert.match(page, /4 questions weren't marked 01\.1 · 2 marks/);
  assert.match(page, /01\.3 · 2 marks/);
  assert.doesNotMatch(page, /01\.4/);
  assert.match(page, /Show all 4 questions/);
});

test('the subtitle says who wrote the answer key, with View answer key', () => {
  const note = (answerKey) => words(AnswerKeyNote, { answerKey, onView() {} });
  assert.match(note({ writtenByAI: 58, total: 58 }), /Answer key written by the AI View answer key/);
  assert.match(
    note({ writtenByAI: 12, total: 58 }),
    /Answer key for 12 of 58 questions written by the AI View answer key/
  );
});

test('the read-only answer key tags who wrote each answer, shows a held reason and offers no editing', () => {
  const question = (id, provenance, mode = 'criteria') => ({
    id,
    text: `Question ${id}`,
    maxScore: 1,
    answer: `Answer ${id}`,
    rubric: `1 marks: ${id}`,
    markingBasis: { mode, provenance, criteria: [] },
  });
  const config = {
    sections: [{ questions: [question('q7', 'generated', 'unresolved'), question('q8', 'teacher_key')] }],
  };
  const held = { q7: 'Figure 2 is missing from the question paper (copyright notice)' };
  const html = markup(QuickSchemeReview, { config, held });
  assert.match(
    text(html),
    /Question 1 Written by the AI .*Not marked: Figure 2 is missing from the question paper \(copyright notice\)\./
  );
  assert.doesNotMatch(text(html), /Edit question|Check the answer key Written/);
  const editorHtml = markup(QuickSchemeReview, { config, held: {}, changeQuestion() {} });
  const editor = text(editorHtml);
  assert.match(editor, /Check the answer key Written by the AI\. Edit anything before grading\./);
  assert.doesNotMatch(editor, /Not marked|From your answer key/);
  // Read-only, the key is text, not fields: marks in the heading, the answer and criteria under small labels
  // (design review B3). The editor keeps its fields.
  assert.match(text(html), /Question 1 Written by the AI 1 mark /);
  assert.match(text(html), /Expected answer Answer q7 .*Marking criteria 1 marks: q7/);
  assert.doesNotMatch(html, /<input|<textarea/);
  assert.match(editorHtml, /<input/);
});

// S2.4 follow-up, the SOT's decision 10.
test('without the paper, the ask offers to go on, for sheets that show the questions', () => {
  assert.match(
    words(QuickPaperSkip, { busy: false, onSkip() {} }),
    /^ ?Continue without the question paper Only if the answer sheets show the questions\. ?$/
  );
  assert.match(markup(QuickPaperSkip, { busy: true, onSkip() {} }), /disabled=""/);
});

// S3.3: the review page's notes.
test('a mark 2 of the 3 markings gave says so, with the other marking behind "Why {n}?"', () => {
  const note = (agreement, grade = 1) => words(AgreementHint, { agreement, grade });
  assert.match(
    note({ agreeing: 2, of: 3, otherMark: 3, otherReason: 'Credits the method.' }),
    /^ ?2 of the 3 AI markings gave 1\. The other gave 3\. Why 3\? ?$/
  );
  // A marking that gave no mark says so, and with no reason there's nothing to open.
  assert.match(
    note({ agreeing: 2, of: 3, otherMark: null, otherReason: '' }, 1.0),
    /^ ?2 of the 3 AI markings gave 1\. The other gave no mark\. ?$/
  );
});

test('a held answer says why it has no mark, once', () => {
  assert.match(
    words(HeldReason, { reason: 'The script describes a drawing instead of showing it.' }),
    /^ ?Not marked: The script describes a drawing instead of showing it\. ?$/
  );
});

test('a result held before Phase 1.33 shows the reason its feedback kept, without "Needs review: "', () => {
  const kept = 'Needs review: the three AI markings didn’t agree, so no mark was published.';
  assert.equal(reasonFromFeedback(kept), 'the three AI markings didn’t agree, so no mark was published.');
  assert.equal(
    reasonFromFeedback('One of the AI readings couldn’t be checked.'),
    'One of the AI readings couldn’t be checked.'
  );
  assert.equal(reasonFromFeedback(null), '');
});

test('the held alert names the question once, though its reason starts with the label', () => {
  const page = text(
    results([heldQuestion(7, { reason: '01.7: Figure 2 on page 6 is replaced by a copyright notice.' })])
  );
  assert.match(page, /01\.7 · 1 mark — Figure 2 on page 6 is replaced by a copyright notice\./);
  assert.doesNotMatch(page, /01\.7: Figure/);
});

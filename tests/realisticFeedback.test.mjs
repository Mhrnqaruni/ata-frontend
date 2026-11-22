// Realistic feedback's frontend rules (Phase 1.49 and its follow-up): the status and file name as read, the Download
// menu's items, the progress dialog's loop, Make again and prepare all, with the API stubbed.
// Area: assessments
import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({
  stdin: {
    contents: `export * from './src/areas/assessments/realisticRules.js';
export { filenameFrom, default as saveBlob } from './src/utils/saveBlob.js';`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  logLevel: 'error',
});
const r = await import(`data:text/javascript,${encodeURIComponent(bundle.outputFiles[0].text)}`);

// A status body as the route sends it (lane D's contract for step 3.2): the ready status has a null stage and counts,
// and `handwriting` says its red marks include an AI layer.
const READY = {
  status: 'ready',
  stage: null,
  done: null,
  total: null,
  reason: null,
  jobId: null,
  hasPaper: true,
  handwriting: true,
};

test('the status route is read safely: the six statuses, the stage, kept pages and AI handwriting', () => {
  const body = { status: 'preparing', stage: 'marking', done: 1, total: 3, reason: null, jobId: 'j7', hasPaper: true };
  assert.deepEqual(r.readStatus({ ...body, note: null }), {
    status: 'preparing',
    stage: 'marking',
    done: 1,
    total: 3,
    reason: '',
    hasPaper: true,
    handwriting: false,
  });
  // handwriting: true only when the route says so; missing (an older backend) or anything else reads as false.
  assert.equal(r.readStatus(READY).handwriting, true);
  assert.equal(r.readStatus({ ...READY, handwriting: undefined }).handwriting, false);
  assert.equal(r.readStatus({ ...READY, handwriting: 'yes' }).handwriting, false);
  assert.equal(r.readStatus({ status: 'odd' }).status, 'unavailable');
  assert.equal(r.readStatus(null).status, 'unavailable');
  assert.equal(r.readStatus({ status: 'preparing', stage: 'drawing' }).stage, null);
  // No kept pages: hasPaper false, or a refusal's reason 'no_script'. A body without the field has kept pages.
  assert.equal(r.readStatus({ ...READY, hasPaper: false }).hasPaper, false);
  assert.equal(r.readStatus({ status: 'unavailable', reason: 'no_script', hasPaper: false }).hasPaper, false);
  assert.equal(r.readStatus({ status: 'unavailable', reason: 'no_script' }).hasPaper, false);
  assert.equal(r.readStatus({ status: 'ready' }).hasPaper, true);
});

test('a saved file takes the name the server gives, quoted or not', () => {
  assert.equal(r.filenameFrom({ 'content-disposition': 'attachment; filename="Ana marked.pdf"' }), 'Ana marked.pdf');
  assert.equal(r.filenameFrom({ 'Content-Disposition': 'attachment; filename=report.docx' }), 'report.docx');
  assert.equal(r.filenameFrom({}), null);
  assert.equal(r.filenameFrom(undefined), null);
});

// What the server sends for a name outside ASCII (RFC 6266): the plain name first, with the letters it can't write
// dropped, then the whole name, UTF-8 and percent-encoded.
const POLISH = `attachment; filename="ukasz_Nowak_Report.pdf"; filename*=UTF-8''%C5%81ukasz_Nowak_Report.pdf`;
const CHINESE = `attachment; filename="_Report.pdf"; filename*=UTF-8''%E6%9D%8E%E9%9B%B7_Report.pdf`;
const given = (value) => ({ 'content-disposition': value });

test('a name outside ASCII is saved whole, from filename*, which is read before the plain name', () => {
  assert.equal(r.filenameFrom(given(POLISH)), 'Łukasz_Nowak_Report.pdf');
  assert.equal(r.filenameFrom(given(CHINESE)), '李雷_Report.pdf');
  assert.equal(r.filenameFrom({ 'Content-Disposition': POLISH }), 'Łukasz_Nowak_Report.pdf');
  // Whichever comes first. A space and an apostrophe are kept, and a language tag is allowed.
  const reversed = `attachment; filename*=UTF-8''Zo%C3%AB%20O%27Neil.pdf; filename="Zoe_O'Neil.pdf"`;
  assert.equal(r.filenameFrom(given(reversed)), "Zoë O'Neil.pdf");
  assert.equal(r.filenameFrom(given(`attachment; filename*=UTF-8'en'Zo%C3%AB.pdf`)), 'Zoë.pdf');
});

test('a filename* that cannot be read leaves the plain name, or none', () => {
  const broken = `filename*=UTF-8''Zo%C3%A`;
  assert.equal(r.filenameFrom(given(`attachment; filename="Zoe.pdf"; ${broken}`)), 'Zoe.pdf');
  assert.equal(r.filenameFrom(given(`attachment; ${broken}; filename="Zoe.pdf"`)), 'Zoe.pdf');
  assert.equal(r.filenameFrom(given(`attachment; ${broken}`)), null);
  assert.equal(r.filenameFrom(given(`attachment; filename*=ISO-8859-1''%A3.pdf`)), null);
  assert.equal(r.filenameFrom(given('attachment')), null);
});

test('saveBlob saves under the whole name, the plain name, or the default name when the header has neither', () => {
  const saved = (headers) => {
    const attributes = {};
    const link = { setAttribute: (name, value) => (attributes[name] = value), click() {}, remove() {} };
    globalThis.window = { URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} } };
    globalThis.document = { createElement: () => link, body: { appendChild() {} } };
    try {
      r.saveBlob({ data: 'pdf', headers }, 'report_7.pdf');
    } finally {
      delete globalThis.window;
      delete globalThis.document;
    }
    return attributes.download;
  };
  assert.equal(saved(given(POLISH)), 'Łukasz_Nowak_Report.pdf');
  assert.equal(saved(given('attachment; filename="Zoe_Hart_Report.pdf"')), 'Zoe_Hart_Report.pdf');
  assert.equal(saved(given('attachment')), 'report_7.pdf');
  assert.equal(saved({}), 'report_7.pdf');
});

// The menu's items for a status body, with only the fields that differ from a ready student with kept pages.
const items = (body) => r.menuItems(r.readStatus({ ...READY, ...body }));
const OPEN = { disabled: false, line: '', prepares: false };
const PREPARES = { disabled: false, line: '', prepares: true };
const shut = (line) => ({ disabled: true, line, prepares: false });
const AI = 'Comments on the marked paper are written by AI from your marking.';

test('ready: every item downloads at once, with the AI line and Redraw the red marks under the commented paper', () => {
  assert.deepEqual(items({}), {
    pdf: OPEN,
    docx: OPEN,
    retry: null,
    comments: { ...OPEN, line: AI },
    again: PREPARES,
    grade: OPEN,
  });
  assert.equal(r.WORDS.again, 'Redraw the red marks');
  // For every ready paper with kept pages, with an AI layer or not: a paper whose pages all fell back can be drawn
  // again too. Never while preparing, and never without kept pages.
  assert.deepEqual(items({ handwriting: false }).again, PREPARES);
  assert.deepEqual(items({ handwriting: undefined }).again, PREPARES);
  assert.equal(items({ status: 'preparing', stage: 'marking', done: 0, total: 2 }).again, null);
  assert.equal(items({ hasPaper: false }).again, null);
});

test('redrawing asks first, with the words for it', () => {
  assert.equal(r.WORDS.redrawAsk, "This redraws the marked paper's handwriting (about a minute). Continue?");
  assert.deepEqual([r.WORDS.redraw, r.WORDS.cancel], ['Redraw', 'Cancel']);
});

test('with the dialog closed, the menu reads the status every 5 s until it ends, and says when it is ready', () => {
  assert.equal(r.WATCH_MS, 5000);
  const end = (body) => r.watchEnd(r.readStatus({ ...READY, ...body }));
  assert.equal(end({ status: 'preparing', stage: 'marking', done: 1, total: 2 }), null);
  assert.equal(end({}), 'ready');
  for (const status of ['needed', 'interrupted', 'failed', 'unavailable'])
    assert.equal(end({ status }), 'stop', status);
  assert.equal(r.WORDS.ready('Ana Lopez'), 'Feedback for Ana Lopez is ready');
  assert.equal(r.WORDS.ready(''), 'Feedback is ready');
  assert.equal(r.WORDS.ready(undefined), 'Feedback is ready');
});

test('not ready yet: a click on any item, the report too, prepares first and then downloads it', () => {
  for (const status of ['needed', 'interrupted']) {
    const shown = items({ status });
    assert.deepEqual(
      shown,
      { pdf: PREPARES, docx: PREPARES, retry: null, comments: { ...PREPARES, line: AI }, again: null, grade: PREPARES },
      status
    );
  }
});

test('while preparing, every item says the stage and is disabled', () => {
  const writing = shut('Preparing · writing the feedback');
  assert.deepEqual(items({ status: 'preparing', stage: 'writing' }), {
    pdf: writing,
    docx: writing,
    retry: null,
    comments: writing,
    again: null,
    grade: writing,
  });
  assert.equal(
    items({ status: 'preparing', stage: 'marking', done: 1, total: 3 }).pdf.line,
    'Preparing · marking page 2 of 3'
  );
  assert.equal(
    items({ status: 'preparing', stage: 'marking', done: 3, total: 3 }).grade.line,
    'Preparing · marking page 3 of 3'
  );
  // A preparation that hasn't said its stage is at the first one.
  assert.equal(items({ status: 'preparing' }).comments.line, 'Preparing · writing the feedback');
});

test('after a failure the report still downloads at once, and Try again and the marked paper prepare again', () => {
  const plain = items({ status: 'failed', stage: 'writing', reason: 'The AI is busy right now.' });
  const noComments = "Personal comments couldn't be written. Try again.";
  assert.deepEqual(plain, {
    pdf: { ...OPEN, line: noComments },
    docx: { ...OPEN, line: noComments },
    retry: PREPARES,
    comments: { ...PREPARES, line: AI },
    again: null,
    grade: PREPARES,
  });
  // Failed while marking: the words were written, so the report is whole, and only the marked paper says it failed.
  const whole = items({ status: 'failed', stage: 'marking', done: 1, total: 3, reason: 'No answer.' });
  const noPaper = { ...PREPARES, line: "Couldn't prepare the marked paper. Try again." };
  assert.deepEqual(
    [whole.pdf, whole.docx, whole.retry, whole.comments, whole.again, whole.grade],
    [OPEN, OPEN, PREPARES, noPaper, null, noPaper]
  );
  assert.equal(r.WORDS.tryAgain, 'Try again');
});

test('no kept pages: the marked paper stays in the menu, disabled, the report works as usual, and Try again too', () => {
  const noPages = shut('No kept pages for this paper');
  for (const status of ['ready', 'needed', 'interrupted', 'preparing', 'failed', 'unavailable']) {
    const shown = items({
      status,
      stage: 'writing',
      reason: status === 'unavailable' ? 'not_final' : null,
      hasPaper: false,
    });
    assert.deepEqual([shown.comments, shown.again, shown.grade], [noPages, null, noPages], status);
    // Try again shows only after a failure, and works without kept pages: the words are written again.
    assert.deepEqual(shown.retry, status === 'failed' ? PREPARES : null, status);
  }
  assert.deepEqual(items({ hasPaper: false }).pdf, OPEN);
  assert.deepEqual(items({ status: 'needed', hasPaper: false }).docx, PREPARES);
  assert.deepEqual(items({ status: 'failed', stage: 'marking', hasPaper: false }).retry, PREPARES);
});

test('before the review is final the report downloads (Not final yet), the marked paper waits, and loading waits', () => {
  const notFinal = shut('Finish the review first');
  assert.deepEqual(items({ status: 'unavailable', reason: 'not_final' }), {
    pdf: OPEN,
    docx: OPEN,
    retry: null,
    comments: notFinal,
    again: null,
    grade: notFinal,
  });
  assert.deepEqual(r.menuItems(null), {
    pdf: shut('Checking…'),
    docx: shut(''),
    retry: null,
    comments: shut(''),
    again: null,
    grade: shut(''),
  });
});

test("nothing is greyed out because of a comment's length: an old body's warnings are ignored", () => {
  const old = { ...READY, warnings: [{ questionId: 'q4', label: '4', kind: 'too_long' }] };
  assert.equal('warnings' in r.readStatus(old), false);
  assert.deepEqual(r.menuItems(r.readStatus(old)), items({}));
});

// A stubbed API that answers `prepare` and then each `status` call from a list, and records the steps and the line the
// dialog shows for each, with the dialog's own withCounts.
function stubbed(first, later = [], { failDownload, report = false } = {}) {
  const log = { waits: [], states: [], downloads: 0, statusCalls: 0 };
  let closed = false;
  let last = null;
  const api = {
    prepare: async () => (first instanceof Error ? Promise.reject(first) : r.readStatus(first)),
    status: async () => r.readStatus(later[log.statusCalls++]),
    download: async () => {
      log.downloads += 1;
      if (failDownload) throw failDownload;
    },
    report,
    wait: async (ms) => log.waits.push(ms),
    onState: (state, phase) => {
      last = r.withCounts(state, last);
      const following = phase === 'preparing' || phase === 'download';
      log.states.push([phase, following ? r.stageLine(last) : r.stopLine(phase, last)]);
    },
    stopped: () => closed,
  };
  return { api, log, close: () => (closed = true) };
}

test("the dialog's words (SOT-6 frontend)", () => {
  assert.equal(r.WORDS.title, 'Preparing feedback');
  assert.equal(
    r.WORDS.aboutTime,
    "Usually 2–4 minutes for a student. Longer when the AI is busy. You can close this; it keeps going. We'll tell you here when it's ready."
  );
  assert.equal(r.stageLine({ stage: 'writing' }), 'Writing the feedback…');
  assert.equal(r.stageLine({ stage: 'marking', done: 0, total: 3 }), 'Marking page 1 of 3…');
  assert.equal(r.stageLine(null), 'Writing the feedback…');
});

test('the report: prepare, follow every 2 s through writing and each page, then download once', async () => {
  const run = stubbed(
    { status: 'preparing', stage: 'writing' },
    [
      { status: 'preparing', stage: 'marking', done: 0, total: 2 },
      { status: 'preparing', stage: 'marking', done: 1, total: 2 },
      READY,
    ],
    { report: true }
  );
  assert.equal(await r.runPreparation(run.api), 'downloaded');
  assert.deepEqual(run.log.waits, [2000, 2000, 2000]);
  assert.deepEqual(run.log.states, [
    ['preparing', 'Writing the feedback…'],
    ['preparing', 'Marking page 1 of 2…'],
    ['preparing', 'Marking page 2 of 2…'],
    ['download', 'Marking page 2 of 2…'],
  ]);
  assert.equal(run.log.downloads, 1);
});

test('a failed preparation still gives the report: the plain version, or whole when only the marked paper failed', async () => {
  const busy = 'The AI is busy right now.';
  const plain = stubbed(
    { status: 'preparing', stage: 'writing' },
    [{ status: 'failed', stage: 'writing', reason: busy }],
    {
      report: true,
    }
  );
  assert.equal(await r.runPreparation(plain.api), 'plain');
  assert.equal(plain.log.downloads, 1);
  assert.deepEqual(plain.log.states.at(-1), ['plain', `Personal comments couldn't be written. ${busy}`]);

  const whole = stubbed({ status: 'failed', stage: 'marking', done: 1, total: 2, reason: busy }, [], { report: true });
  assert.equal(await r.runPreparation(whole.api), 'downloaded');
  assert.equal(whole.log.downloads, 1);
});

test('a failure stops the marked paper, with the words for the stage it failed at', async () => {
  const words = stubbed({ status: 'preparing', stage: 'writing' }, [{ status: 'failed', stage: 'writing' }]);
  assert.equal(await r.runPreparation(words.api), 'failed');
  assert.equal(words.log.downloads, 0);
  assert.deepEqual(words.log.states.at(-1), ['failed', "Personal comments couldn't be written."]);

  const paper = stubbed({ status: 'failed', stage: 'marking', done: 1, total: 2, reason: 'No answer.' });
  assert.equal(await r.runPreparation(paper.api), 'failed');
  assert.deepEqual(paper.log.states, [['failed', "Couldn't prepare the marked paper. No answer."]]);
});

test('an interruption stops the following, for the report and the marked paper alike', async () => {
  for (const report of [false, true]) {
    const stopped = stubbed({ status: 'interrupted', stage: 'marking', done: 1, total: 3 }, [], { report });
    assert.equal(await r.runPreparation(stopped.api), 'stopped');
    assert.deepEqual([stopped.log.waits.length, stopped.log.downloads], [0, 0]);
    assert.deepEqual(stopped.log.states, [['stopped', 'Preparation stopped.']]);
  }
});

test('a refusal shows the status it carries; any other error shows its own words', async () => {
  const notFinal = Object.assign(new Error('Could not prepare the feedback.'), {
    realistic: r.readStatus({ status: 'unavailable', reason: 'not_final' }),
  });
  const refused = stubbed(notFinal);
  assert.equal(await r.runPreparation(refused.api), 'unavailable');
  assert.deepEqual(refused.log.states, [['unavailable', 'Finish the review first']]);

  const offline = stubbed(new Error('Network Error'));
  assert.equal(await r.runPreparation(offline.api), 'error');
  assert.deepEqual(offline.log.states, [['error', 'Network Error']]);

  // The commented paper's download refused because the student has no kept pages.
  const noPages = Object.assign(new Error('Could not download the marked paper.'), {
    realistic: r.readStatus({ status: 'unavailable', reason: 'no_script', hasPaper: false }),
  });
  const late = stubbed(READY, [], { failDownload: noPages });
  assert.equal(await r.runPreparation(late.api), 'unavailable');
  assert.deepEqual(late.log.states.at(-1), ['unavailable', 'No kept pages for this paper']);
});

test('closing the dialog stops the following, and the job is left to run', async () => {
  const run = stubbed({ status: 'preparing', stage: 'marking', done: 0, total: 3 }, [READY]);
  const wait = run.api.wait;
  run.api.wait = async (ms) => {
    await wait(ms);
    run.close();
  };
  assert.equal(await r.runPreparation(run.api), 'closed');
  assert.equal(run.log.statusCalls, 0);
  assert.equal(run.log.downloads, 0);
});

test('Try again: prepares, follows, and ends ready without downloading; failing again stops again', async () => {
  const run = stubbed({ status: 'preparing', stage: 'writing' }, [READY]);
  run.api.download = null; // what the dialog passes for Try again
  assert.equal(await r.runPreparation(run.api), 'ready');
  assert.equal(run.log.downloads, 0);
  assert.deepEqual(run.log.states, [
    ['preparing', 'Writing the feedback…'],
    ['download', 'Writing the feedback…'],
  ]);
  assert.equal(r.doneWords('retry'), 'Feedback ready to download.');
  assert.deepEqual(
    ['pdf', 'docx', 'comments', 'grade', 'again'].map((item) => r.doneWords(item)),
    [
      'Report downloaded.',
      'Report downloaded.',
      'Marked paper downloaded.',
      'Marked paper downloaded.',
      'Marked paper downloaded.',
    ]
  );
  // Failing again shows the words for it, and nothing downloads: Try again is not the report.
  const busy = { status: 'failed', stage: 'writing', reason: 'The AI is busy right now.' };
  const again = stubbed({ status: 'preparing', stage: 'writing' }, [busy]);
  again.api.download = null;
  assert.equal(await r.runPreparation(again.api), 'failed');
  assert.deepEqual(again.log.states.at(-1), [
    'failed',
    "Personal comments couldn't be written. The AI is busy right now.",
  ]);
});

test('make again: its own job, or a preparation when the paper is not ready yet, or the refusal', async () => {
  const again = r.readStatus({ status: 'preparing', stage: 'marking', done: 0, total: 2, jobId: 'j8' });
  const calls = [];
  const prepare = async () => {
    calls.push('prepare');
    return r.readStatus({ status: 'preparing', stage: 'writing' });
  };
  const refusing = (body) => async () => {
    throw Object.assign(new Error('Could not make the marked paper again.'), {
      status: 409,
      realistic: r.readStatus(body),
    });
  };
  assert.equal(await r.makeAgainOrPrepare(async () => again, prepare), again);
  for (const status of ['needed', 'interrupted', 'failed']) {
    assert.equal((await r.makeAgainOrPrepare(refusing({ status }), prepare)).stage, 'writing', status);
  }
  assert.deepEqual(calls, ['prepare', 'prepare', 'prepare']);
  // Not final, no kept pages, or no status at all: the refusal itself, for the dialog to show.
  const noPages = refusing({ status: 'unavailable', reason: 'no_script', hasPaper: false });
  await assert.rejects(r.makeAgainOrPrepare(noPages, prepare), (error) => error.realistic.hasPaper === false);
  await assert.rejects(r.makeAgainOrPrepare(refusing({ status: 'unavailable', reason: 'not_final' }), prepare));
  await assert.rejects(
    r.makeAgainOrPrepare(async () => Promise.reject(new Error('Network Error')), prepare),
    /Network/
  );
  assert.equal(calls.length, 3);

  // Through the dialog's loop: the commented paper is marked again, then downloaded.
  const run = stubbed(again, [READY]);
  run.api.prepare = () => r.makeAgainOrPrepare(async () => again, prepare);
  assert.equal(await r.runPreparation(run.api), 'downloaded');
  assert.deepEqual(run.log.states, [
    ['preparing', 'Marking page 1 of 2…'],
    ['download', 'Marking page 2 of 2…'],
  ]);
});

test('a refused download says why when its 409 carries the status that disables the item', () => {
  const refusal = (body) =>
    Object.assign(new Error('Could not download the marked paper.'), {
      status: 409,
      realistic: r.readStatus({ ...READY, ...body }),
    });
  const noScript = { status: 'unavailable', reason: 'no_script', hasPaper: false };
  assert.equal(r.refusalWords(refusal(noScript), 'grade'), 'No kept pages for this paper');
  assert.equal(
    r.refusalWords(refusal({ status: 'unavailable', reason: 'not_final' }), 'grade'),
    'Finish the review first'
  );
  const marking = { status: 'preparing', stage: 'marking', done: 0, total: 2 };
  assert.equal(r.refusalWords(refusal(marking), 'comments'), 'Preparing · marking page 1 of 2');
  // A status that leaves the item open (its line is no reason), an error with no status, and the report's items keep
  // the error's words.
  assert.equal(r.refusalWords(refusal({ status: 'needed' }), 'comments'), 'Could not download the marked paper.');
  assert.equal(r.refusalWords(new Error('Network Error'), 'grade'), 'Network Error');
  assert.equal(r.refusalWords(refusal(noScript), 'pdf'), 'Could not download the marked paper.');
});

test('while it downloads, the dialog keeps the last stage and page counts the ready status lacks', () => {
  const ready = r.readStatus(READY);
  assert.deepEqual([ready.stage, ready.done, ready.total], [null, 0, 0]);
  const shown = r.withCounts(ready, r.readStatus({ status: 'preparing', stage: 'marking', done: 2, total: 3 }));
  assert.deepEqual([shown.status, shown.stage, shown.done, shown.total], ['ready', 'marking', 3, 3]);
  assert.equal(r.stageLine(shown), 'Marking page 3 of 3…');
  // A student with no kept pages only ever writes, so the line stays "Writing the feedback…".
  const words = r.withCounts(ready, r.readStatus({ status: 'preparing', stage: 'writing', hasPaper: false }));
  assert.equal(r.stageLine(words), 'Writing the feedback…');
  // A status with its own stage is kept as it is, and with nothing seen before there is nothing to keep.
  const failed = r.readStatus({ status: 'failed', stage: 'marking', done: 1, total: 3, reason: 'No answer.' });
  assert.equal(r.withCounts(failed, shown), failed);
  assert.equal(r.withCounts(ready, null), ready);
});

test('prepare all: the counts are read safely, and the words say how many are queued and ready', () => {
  const counts = r.readCounts({ students: 20, queued: 12, preparing: 1, ready: 5, notFinal: 2 });
  assert.deepEqual(counts, { students: 20, queued: 12, preparing: 1, ready: 5, notFinal: 2 });
  assert.equal(
    r.preparedWords(counts),
    'Feedback queued for 13 students. 5 are ready. 2 need their review finished first.'
  );
  assert.equal(
    r.preparedWords(r.readCounts({ students: 2, queued: 1, ready: 1 })),
    'Feedback queued for 1 student. 1 is ready.'
  );
  assert.equal(r.preparedWords(r.readCounts({ students: 3, ready: 3 })), 'Nothing new to prepare. 3 are ready.');
  assert.equal(
    r.preparedWords(r.readCounts({ students: 1, notFinal: 1 })),
    'Nothing new to prepare. 1 needs its review finished first.'
  );
  assert.deepEqual(r.readCounts(null), { students: 0, queued: 0, preparing: 0, ready: 0, notFinal: 0 });
  assert.deepEqual(r.readCounts({ queued: '4', ready: -1, notFinal: 'x' }), {
    students: 0,
    queued: 4,
    preparing: 0,
    ready: 0,
    notFinal: 0,
  });
});

// Realistic feedback's rules (Phase 1.49 and its follow-up): the student's feedback status as the app reads it, what
// each status allows in the one Download menu, and the progress dialog's prepare-then-download loop (SOT-6 frontend).
// Area: assessments

// The six statuses the status route returns (SOT-6 API).
export const STATUSES = ['ready', 'needed', 'preparing', 'interrupted', 'failed', 'unavailable'];

// The Download menu's report items. The others are the marked paper's: 'comments', 'grade', and 'again' ("Redraw the
// red marks"), which redraws the commented paper's handwriting and then downloads it; and 'retry' ("Try again" after
// a failure), which prepares again and downloads nothing.
export const REPORTS = ['pdf', 'docx'];

// The download menu's and the progress dialog's words (SOT-6 frontend, SOT-2 and SOT-4).
export const WORDS = {
  download: 'Download',
  reportPdf: 'Report · PDF',
  reportWord: 'Report · Word',
  comments: 'Marked paper · with comments',
  aiNote: 'Comments on the marked paper are written by AI from your marking.',
  again: 'Redraw the red marks',
  redrawAsk: "This redraws the marked paper's handwriting (about a minute). Continue?",
  redraw: 'Redraw',
  cancel: 'Cancel',
  grade: 'Marked paper · grade only',
  checking: 'Checking…',
  noPages: 'No kept pages for this paper',
  notFinal: 'Finish the review first',
  noComments: "Personal comments couldn't be written.",
  noPaper: "Couldn't prepare the marked paper.",
  title: 'Preparing feedback',
  aboutTime:
    "Usually 2–4 minutes for a student. Longer when the AI is busy. You can close this; it keeps going. We'll tell you here when it's ready.",
  close: 'Close',
  reportDownloaded: 'Report downloaded.',
  paperDownloaded: 'Marked paper downloaded.',
  feedbackReady: 'Feedback ready to download.',
  // The message once a preparation started from the menu is ready, after its dialog was closed.
  ready: (name) => (name ? `Feedback for ${name} is ready` : 'Feedback is ready'),
  stopped: 'Preparation stopped.',
  prepareAgain: 'Prepare again',
  tryAgain: 'Try again',
  prepareAll: 'Prepare feedback for all students',
};

// The page being marked, counted from 1 ("2 of 3" once one page is done).
const pageOf = (done, total) => `${Math.min(done + 1, total)} of ${total}`;
const marking = (state) => state?.stage === 'marking' && state.total > 0;

// The progress dialog's line for the stage (SOT-6 API's `stage`): writing the feedback, then marking each page.
export function stageLine(state) {
  return marking(state) ? `Marking page ${pageOf(state.done, state.total)}…` : 'Writing the feedback…';
}

// A menu item's line while preparing: "Preparing · writing the feedback", then "Preparing · marking page 2 of 3".
export function preparingLine(state) {
  return `Preparing · ${marking(state) ? `marking page ${pageOf(state.done, state.total)}` : 'writing the feedback'}`;
}

// The progress dialog's line when it stops following. A failure while writing means no personal comments (the
// report is the plain version); while marking, the words were written and only the marked paper failed. 'error' is a
// failure that carried no status: its own words are the reason.
export function stopLine(phase, state) {
  if (phase === 'stopped') return WORDS.stopped;
  if (phase === 'error') return state?.reason || WORDS.noPaper;
  if (phase === 'failed' || phase === 'plain') {
    return `${state?.stage === 'marking' ? WORDS.noPaper : WORDS.noComments} ${state?.reason || ''}`.trim();
  }
  return state?.hasPaper === false ? WORDS.noPages : WORDS.notFinal;
}

// How often the progress dialog asks for the status (SOT "Frontend": every 2 s), and how often the menu asks once the
// dialog is closed, for a preparation it started, until it ends.
export const POLL_MS = 2000;
export const WATCH_MS = 5000;

// What the menu does with a fresh status while it watches a preparation with the dialog closed: null keeps watching
// while it prepares, 'ready' tells the teacher, and 'stop' ends quietly (the menu shows why when it next opens).
export function watchEnd(state) {
  if (state.status === 'preparing') return null;
  return state.status === 'ready' ? 'ready' : 'stop';
}

// The ready status carries no stage or page counts, so while the dialog downloads it keeps the last ones it saw,
// every page done, instead of reading as if it had started again (Phase 1.49's S6.6).
export function withCounts(state, last) {
  if (state?.status !== 'ready' || !last?.stage) return state;
  return { ...state, stage: last.stage, done: last.total, total: last.total };
}

// The progress dialog's phase for a status: keep following ('preparing'), 'download', or a stop: 'stopped'
// (interrupted), 'failed' or 'unavailable'. For the report a failure still downloads (SOT-2): 'plain' when the words
// weren't written, and the whole report when only the marked paper failed.
export function phaseOf(state, report = false) {
  if (state.status === 'ready') return 'download';
  if (state.status === 'needed' || state.status === 'preparing') return 'preparing';
  if (state.status === 'interrupted') return 'stopped';
  if (state.status !== 'failed') return 'unavailable';
  if (!report) return 'failed';
  return state.stage === 'marking' ? 'download' : 'plain';
}

// Prepares the student's feedback, follows it every POLL_MS until it's ready, then downloads the item. prepare, status
// and download are the service's calls (download is null when nothing downloads: Try again); report: whether the
// item is the report; wait(ms) pauses; onState(state, phase) shows each step; stopped() is true once the dialog has
// closed, which ends the loop (the job itself keeps going). Returns the last phase: 'downloaded', 'ready' (with no
// download), 'plain' (the report without personal comments), 'stopped', 'failed', 'unavailable', 'error' or 'closed'.
export async function runPreparation({ prepare, status, download, report = false, wait, onState, stopped }) {
  try {
    let state = await prepare();
    for (;;) {
      if (stopped()) return 'closed';
      const phase = phaseOf(state, report);
      onState(state, phase);
      if (phase === 'download' || phase === 'plain') {
        if (!download) return 'ready';
        await download();
        return phase === 'plain' ? 'plain' : 'downloaded';
      }
      if (phase !== 'preparing') return phase;
      await wait(POLL_MS);
      if (stopped()) return 'closed';
      state = await status();
    }
  } catch (error) {
    if (stopped()) return 'closed';
    // A refusal can carry the status that explains it; any other error says what went wrong in its own words.
    const refused = error?.realistic;
    const phase = refused ? phaseOf(refused, report) : 'error';
    if (phase === 'stopped' || phase === 'failed' || phase === 'unavailable') {
      onState(refused, phase);
      return phase;
    }
    onState({ ...readStatus({ status: 'failed' }), reason: error?.message || '' }, 'error');
    return 'error';
  }
}

// What the dialog says when it ends well: the report or the marked paper downloaded, or after Try again, that the
// feedback is ready to download from the menu.
export function doneWords(item) {
  if (item === 'retry') return WORDS.feedbackReady;
  return REPORTS.includes(item) ? WORDS.reportDownloaded : WORDS.paperDownloaded;
}

// "Make again" for a paper that isn't ready: the route refuses with that status (needed, interrupted or failed), and
// the paper is then prepared instead (SOT-6 API). makeAgain and prepare are the service's calls.
export async function makeAgainOrPrepare(makeAgain, prepare) {
  try {
    return await makeAgain();
  } catch (error) {
    if (['needed', 'interrupted', 'failed'].includes(error?.realistic?.status)) return prepare();
    throw error;
  }
}

const open = (prepares, line = '') => ({ disabled: false, line, prepares });
const shut = (line) => ({ disabled: true, line, prepares: false });

// What each Download menu item shows for a status (null while it loads): whether it's disabled, its second line, and
// whether a click prepares first (the progress dialog), then downloads. `retry` (Try again) and `again` (Redraw the
// red marks) are null when hidden. Redraw shows for every ready paper with kept pages, with an AI layer or not, so a
// paper whose pages all fell back to code-written marks can be drawn again (the Manager, 21 Nov). The report is never
// blocked (SOT-2): before the review is final it's the "Not final yet" version, and after a failure the plain one.
// The marked paper needs kept pages.
export function menuItems(state) {
  if (!state) {
    return { pdf: shut(WORDS.checking), docx: shut(''), retry: null, comments: shut(''), again: null, grade: shut('') };
  }
  const paper = (shown) => (state.hasPaper ? shown : shut(WORDS.noPages));
  const items = (report, comments, grade, again = null) => ({
    pdf: report,
    docx: report,
    retry: null,
    comments: paper(comments),
    again: state.hasPaper ? again : null,
    grade: paper(grade),
  });
  if (state.status === 'preparing') {
    const busy = shut(preparingLine(state));
    return items(busy, busy, busy);
  }
  if (state.status === 'unavailable') return items(open(false), shut(WORDS.notFinal), shut(WORDS.notFinal));
  if (state.status === 'ready') {
    return items(open(false), open(false, WORDS.aiNote), open(false), open(true));
  }
  if (state.status !== 'failed') return items(open(true), open(true, WORDS.aiNote), open(true));
  // Failed: the report downloads as it is, and Try again prepares again for every student, with kept pages or not
  // (the marked paper's items prepare again too). Only a failure while marking left the words written, so the report
  // is whole and only the marked paper says it failed.
  if (state.stage === 'marking') {
    const line = `${WORDS.noPaper} ${WORDS.tryAgain}.`;
    return { ...items(open(false), open(true, line), open(true, line)), retry: open(true) };
  }
  const plain = open(false, `${WORDS.noComments} ${WORDS.tryAgain}.`);
  return { ...items(plain, open(true, WORDS.aiNote), open(true)), retry: open(true) };
}

// What a refused download says: the item's own reason when the refusal carries the student's status and that status
// disables the item (it changed since the menu was read); otherwise the error's own words.
export function refusalWords(error, key) {
  const shown = error?.realistic ? menuItems(error.realistic)[key] : null;
  return shown?.disabled && shown.line ? shown.line : error?.message || '';
}

// The status route's answer, made safe to read (SOT-6 API): the stage and pages while preparing (or where a job
// stopped), the reason ('not_final', or a failure's words for users), whether the student has kept pages (a refusal's
// older reason 'no_script' also means none), and whether a ready paper's red marks include AI handwriting (false
// when the field is missing).
export function readStatus(data) {
  const reason = typeof data?.reason === 'string' ? data.reason : '';
  return {
    status: STATUSES.includes(data?.status) ? data.status : 'unavailable',
    stage: data?.stage === 'writing' || data?.stage === 'marking' ? data.stage : null,
    done: Number(data?.done) || 0,
    total: Number(data?.total) || 0,
    reason,
    hasPaper: data?.hasPaper !== false && reason !== 'no_script',
    handwriting: data?.handwriting === true,
  };
}

// The prepare-all route's counts, made safe to read (SOT-6 API): every student with marks, those this call queued,
// those already preparing or ready, and those skipped because their review isn't final.
export function readCounts(data) {
  const count = (value) => Math.max(0, Math.trunc(Number(value)) || 0);
  return {
    students: count(data?.students),
    queued: count(data?.queued),
    preparing: count(data?.preparing),
    ready: count(data?.ready),
    notFinal: count(data?.notFinal),
  };
}

// What "Prepare feedback for all students" says when it's done: how many are queued (with those already preparing),
// how many are ready, and how many wait for their review to be finished.
export function preparedWords({ queued, preparing, ready, notFinal }) {
  const coming = queued + preparing;
  const lines = [
    coming ? `Feedback queued for ${coming} student${coming === 1 ? '' : 's'}.` : 'Nothing new to prepare.',
  ];
  if (ready) lines.push(`${ready} ${ready === 1 ? 'is' : 'are'} ready.`);
  if (notFinal) lines.push(`${notFinal} ${notFinal === 1 ? 'needs its' : 'need their'} review finished first.`);
  return lines.join(' ');
}

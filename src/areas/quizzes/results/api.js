// The results page's calls (Phase 1.46 SOT-7, Phase 1.47 C6): a quiz, its runs and one run's summary; what today's
// per-run reads still own (marks waiting, a post quiz's before-and-after); the downloads; and what matching needs.
// Area: quizzes

import api, { apiError } from '../../../services/api';
import quizService from '../../../services/quizService';
import quizSPService from '../../../services/quizSPService';
import { neverShownIn } from '../words';
import { fileNameOf, saveBlob } from './files';
import { RESULTS } from './words';

// Each path is written out in its call, so the maps (docs/maps/API.md) can match it to its backend operation.
const id = (value) => encodeURIComponent(value);

// A message to show: the server's, unless it says a word quiz pages never show ("session", "outsider"…).
export const shown = (message, fallback) => (message && !neverShownIn(message).length ? message : fallback);

// A refusal as an Error with the server's sentence (or the fallback) and its status: null when offline.
function refused(error, fallback) {
  const failure = apiError(error, fallback);
  return Object.assign(failure, { message: shown(failure.message, fallback), status: error?.response?.status ?? null });
}

// A call's data, or its refusal as above.
async function answer(call, fallback) {
  try {
    return (await call).data;
  } catch (error) {
    throw refused(error, fallback);
  }
}

// The quiz: its title, mode, before-and-after phase and questions.
export const getQuiz = (quizId, { signal } = {}) =>
  answer(api.get(`/api/quizzes/${id(quizId)}`, { signal }), RESULTS.loadFailed);

// The quiz's live and homework runs, newest first, each with its classes and figures.
export const getRuns = (quizId, { signal } = {}) =>
  answer(api.get(`/api/quizzes/${id(quizId)}/runs`, { signal }), RESULTS.loadFailed);

// One run's results for its class pupils, or for one of its classes. A 409 means its questions can't be read.
export const getSummary = (quizId, runId, classId, { signal } = {}) =>
  answer(
    api.get(`/api/quizzes/${id(quizId)}/runs/${id(runId)}/summary`, {
      signal,
      params: classId ? { class_id: classId } : undefined,
    }),
    RESULTS.runFailed
  );

// What only today's per-run read knows: a live run's answers waiting for the teacher's mark, and a post quiz's
// before-and-after comparison.
export async function getExtras(kind, runId, { signal } = {}) {
  const data = await answer(
    kind === 'live'
      ? api.get(`/api/quiz-sessions/${id(runId)}/analytics`, { signal })
      : api.get(`/api/quiz-sp-sessions/${id(runId)}/analytics`, { signal }),
    RESULTS.runFailed
  );
  return { waiting: Number(data.pending_answer_count) || 0, comparison: data.pre_post_comparison ?? null };
}

// The walk-ins' records, which matching needs, by their attempt: participant (live) or progress (homework).
export async function walkInRecords(kind, runId) {
  const data = await answer(
    kind === 'live'
      ? api.get(`/api/quiz-sessions/${id(runId)}/outsiders`)
      : api.get(`/api/quiz-sp-sessions/${id(runId)}/outsiders`),
    RESULTS.matchFailed
  );
  const attempt = kind === 'live' ? 'participant_id' : 'progress_id';
  return Object.fromEntries((data.records || []).map((record) => [String(record[attempt]), String(record.id)]));
}

// Every finished pupil's report in one ZIP, as Word files or PDFs (C6: ?format=pdf; Word is the default). A pupil's
// own report is on their review page.
export async function downloadAllReports(kind, runId, format = 'docx') {
  const options = { params: format === 'pdf' ? { format: 'pdf' } : undefined, responseType: 'blob' };
  const response =
    kind === 'live'
      ? await api.get(`/api/quiz-sessions/${id(runId)}/download-all-reports`, options)
      : await api.get(`/api/quiz-sp-sessions/${id(runId)}/download-all-reports`, options);
  saveBlob(
    response.data,
    fileNameOf(response.headers, format === 'pdf' ? 'Quiz reports (PDF).zip' : 'Quiz reports.zip')
  );
}

// A live run's spreadsheet, as the server makes it today.
export const downloadLiveSpreadsheet = (runId) => quizService.exportSessionCSV(runId);

// Matches a walk-in to a pupil on the class list, by that pupil's school ID; the services refresh the results.
export const matchWalkIn = (kind, runId, recordId, schoolId) =>
  kind === 'live'
    ? quizService.assignOutsiderToStudent(runId, recordId, schoolId)
    : quizSPService.assignOutsiderToStudent(runId, recordId, schoolId);

// A live run's answers that AI marking couldn't decide, for the teacher to mark.
export const marksWaiting = (runId) =>
  answer(api.get(`/api/quiz-sessions/${id(runId)}/pending-marks`), RESULTS.marksFailed);

// Saves the teacher's mark for one of them: { points, feedback, expected_revision }.
export const saveMark = (runId, responseId, mark) =>
  answer(api.patch(`/api/quiz-sessions/${id(runId)}/pending-marks/${id(responseId)}`, mark), RESULTS.markNotSaved);

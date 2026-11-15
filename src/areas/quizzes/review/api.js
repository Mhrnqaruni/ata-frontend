// The quiz review page's calls (Phase 1.47 S4.2; SOT-1 C3, C4, C6): one pupil's answers in one run, a teacher's mark
// on one answer, the run's summary for ‹ ›, and the pupil's report as PDF or Word.
// Area: quizzes

import api, { apiError } from '../../../services/api';
import { neverShownIn } from '../words';
import { PUPIL_REVIEW } from './words';

// Each path is written out in its call, so the maps (docs/maps/API.md) can match it to its backend operation.
const id = (value) => encodeURIComponent(value);

// A refusal as an Error: the server's sentence, also kept in `reason` for the card, unless it says a word quiz pages
// never show; else the fallback. Its status is null when offline.
function refused(error, fallback) {
  const detail = error?.response?.data?.detail;
  const sentence = typeof detail === 'string' && detail && !neverShownIn(detail).length ? detail : null;
  return Object.assign(apiError(error, fallback), {
    message: sentence ?? fallback,
    reason: sentence,
    status: error?.response?.status ?? null,
  });
}

// C3: the run, the pupil, whether marks can change, and every question of the run with the pupil's answer. The time
// it was asked for goes with it, so a save made since is never undone by an older answer.
export async function getAnswers(quizId, runId, pupilId, { signal } = {}) {
  const requestedAt = Date.now();
  try {
    const { data } = await api.get(`/api/quizzes/${id(quizId)}/runs/${id(runId)}/pupils/${id(pupilId)}/answers`, {
      signal,
    });
    return { ...data, requested_at: requestedAt };
  } catch (error) {
    throw refused(error, PUPIL_REVIEW.loadFailed);
  }
}

// C4: { points, comment, expected_revision, restore? } for one answer; it answers { answer, score }.
export async function saveMark(quizId, runId, pupilId, questionId, body) {
  try {
    const { data } = await api.put(
      `/api/quizzes/${id(quizId)}/runs/${id(runId)}/pupils/${id(pupilId)}/questions/${id(questionId)}/mark`,
      body
    );
    return data;
  } catch (error) {
    throw refused(error, PUPIL_REVIEW.markNotSaved);
  }
}

// The run's summary for all its classes, as the results page reads it: its rows give ‹ › their order.
export async function getSummary(quizId, runId, { signal } = {}) {
  try {
    return (await api.get(`/api/quizzes/${id(quizId)}/runs/${id(runId)}/summary`, { signal })).data;
  } catch (error) {
    throw refused(error, PUPIL_REVIEW.loadFailed);
  }
}

// Saves a downloaded file under the server's name, or the fallback.
function saveFile(response, fallback) {
  const header = response.headers?.['content-disposition'] ?? '';
  const named = header.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  const url = URL.createObjectURL(response.data instanceof Blob ? response.data : new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.download = named ? decodeURIComponent(named[1]) : fallback;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// C6: one pupil's report, Word unless format is 'pdf': live by the participant's id, homework by the stored student id.
export async function downloadReport(kind, runId, pupil, format) {
  const config = { responseType: 'blob', params: format === 'pdf' ? { format: 'pdf' } : undefined };
  const response =
    kind === 'live'
      ? await api.get(`/api/quiz-sessions/${id(runId)}/participants/${id(pupil.id)}/report.docx`, config)
      : await api.get(`/api/quiz-sp-sessions/${id(runId)}/student/${id(pupil.student_id)}/report.docx`, config);
  const name = String(pupil.name || 'Pupil').replace(/\s+/g, '_');
  saveFile(response, `${name}_Quiz_Report.${format === 'pdf' ? 'pdf' : 'docx'}`);
}

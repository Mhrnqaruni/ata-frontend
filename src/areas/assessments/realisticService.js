// Realistic feedback, the marked paper and the report's personal comments: their status, preparing them for one
// student or all, making the commented paper again, and the Download menu's downloads (Phase 1.49 follow-up, SOT-6).
// Area: assessments

import apiClient, { apiError } from '../../services/api';
import reviewService from '../../services/reviewService';
import saveBlob from '../../utils/saveBlob';
import { readCounts, readStatus, REPORTS } from './realisticRules';

// The status a refusal carries (a 409 sends it, as JSON or, for a download, inside a blob), or null.
async function refusedStatus(error) {
  let data = error?.response?.data;
  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    try {
      data = JSON.parse(await data.text());
    } catch {
      return null;
    }
  }
  const body = data?.detail && typeof data.detail === 'object' ? data.detail : data;
  return body?.status ? readStatus(body) : null;
}

// The error to throw: the server's words or the fallback, with the HTTP status, any refused status, and `said`, the
// server's own words alone ('' when it gave none), for a message that adds them to its own.
async function failure(error, fallback) {
  const realistic = await refusedStatus(error);
  const detail = error?.response?.data?.detail;
  const said = typeof detail === 'string' ? detail : '';
  return Object.assign(apiError(error, fallback), { status: error?.response?.status, realistic, said });
}

// The React Query key of one student's status. It starts with 'assessments', so a saved mark or comment refreshes it.
export const realisticKey = (jobId, entityId) => ['assessments', String(jobId), 'realistic', String(entityId)];

const realisticService = {
  async realisticStatus(jobId, entityId) {
    try {
      return readStatus((await apiClient.get(`/api/assessments/${jobId}/students/${entityId}/realistic/status`)).data);
    } catch (error) {
      throw await failure(error, 'Could not check the feedback.');
    }
  },

  // Starts the student's preparation (202), or finds the one already running; 409 when the review isn't final.
  async prepareRealistic(jobId, entityId) {
    try {
      return readStatus(
        (await apiClient.post(`/api/assessments/${jobId}/students/${entityId}/realistic/prepare`)).data
      );
    } catch (error) {
      throw await failure(error, 'Could not prepare the feedback.');
    }
  },

  // Makes the commented paper's handwriting again (202), keeping the words and the plan, so the report doesn't
  // change; 409 with the status when it can't (not final, no kept pages, or not ready yet).
  async makeAgain(jobId, entityId) {
    try {
      return readStatus(
        (await apiClient.post(`/api/assessments/${jobId}/students/${entityId}/realistic/make-again`)).data
      );
    } catch (error) {
      throw await failure(error, 'Could not make the marked paper again.');
    }
  },

  // Queues every student of the assessment whose review is final, and returns the counts.
  async prepareAll(jobId) {
    try {
      return readCounts((await apiClient.post(`/api/assessments/${jobId}/realistic/prepare-all`)).data);
    } catch (error) {
      throw apiError(error, 'Could not prepare feedback for all students.');
    }
  },

  // version: 'comments' or 'grade'. Both need the student's feedback ready (409 with the status until it is).
  async downloadRealistic(jobId, entityId, version) {
    try {
      const response = await apiClient.get(`/api/assessments/${jobId}/students/${entityId}/realistic.pdf`, {
        responseType: 'blob',
        params: { version },
      });
      saveBlob(response, `marked_paper_${entityId}_${version}.pdf`);
    } catch (error) {
      throw await failure(error, 'Could not download the marked paper.');
    }
  },

  // One Download menu item: the report ('pdf' or 'docx'), never refused, or the marked paper ('grade', or the
  // commented one, which "Make again" also ends with).
  download(jobId, entityId, item) {
    if (REPORTS.includes(item)) return reviewService.downloadReport(jobId, entityId, item);
    return realisticService.downloadRealistic(jobId, entityId, item === 'grade' ? 'grade' : 'comments');
  },
};

export default realisticService;

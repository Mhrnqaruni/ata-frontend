// /src/services/assessmentService.js (FINAL, WITH CORRECTED V2 API PATH)

import apiClient from './api';

// This helper function is correct and remains unchanged.
function triggerBrowserDownload(blob, defaultFilename, headers) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  const contentDisposition = headers['content-disposition'];
  let filename = defaultFilename;
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (filenameMatch && filenameMatch[1]) {
      filename = filenameMatch[1].replace(/['"]/g, '').trim();
    }
  }
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
  window.URL.revokeObjectURL(url);
}

const assessmentService = {
  // --- [V2 WORKFLOW METHODS] ---

  parseDocument: async (questionFile, answerKeyFile, classId, assessmentName) => {
    const formData = new FormData();
    formData.append('question_file', questionFile);
    if (answerKeyFile) {
      formData.append('answer_key_file', answerKeyFile);
    }
    formData.append('class_id', classId);
    formData.append('assessment_name', assessmentName);
    
    try {
      const response = await apiClient.post('/api/assessments/parse-document', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      console.error("Error parsing assessment document(s):", error);
      throw new Error(error.response?.data?.detail || "Failed to analyze document(s).");
    }
  },

  createAssessmentJobV2: async (formData) => {
    try {
      // --- [THE FIX IS HERE] ---
      // The URL path has been corrected to match the backend's registered route.
      // Incorrect: '/api/v2/assessments'
      // Correct:   '/api/assessments/v2'
      const response = await apiClient.post('/api/assessments/v2', formData, {
      // --- [END OF FIX] ---
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      console.error("Error creating V2 assessment job:", error);
      throw new Error(error.response?.data?.detail || "Failed to create V2 assessment job.");
    }
  },

  manualMatchSubmissions: async (jobId, matches) => {
    try {
      const response = await apiClient.post(`/api/assessments/${jobId}/manual-match`, matches);
      return response.data;
    } catch (error) {
      console.error("Error submitting manual matches:", error);
      throw new Error(error.response?.data?.detail || "Failed to save manual matches.");
    }
  },

  // --- [EXISTING V1 & DATA FETCHING METHODS - UNCHANGED AND STABLE] ---

  getAssessments: async () => {
    try {
      const response = await apiClient.get('/api/assessments');
      return response.data.assessments || [];
    } catch (error) {
      console.error("Error fetching assessments:", error);
      throw new Error(error.response?.data?.detail || "Failed to load assessments.");
    }
  },

  createAssessmentJob: async (formData) => {
    try {
      const response = await apiClient.post('/api/assessments', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      console.error("Error creating assessment job:", error);
      throw new Error(error.response?.data?.detail || "Failed to create assessment job.");
    }
  },

  deleteAssessment: async (jobId) => {
    try {
      // A DELETE request typically doesn't have a response body on success.
      await apiClient.delete(`/api/assessments/${jobId}`);
    } catch (error) {
      console.error(`Error deleting assessment job ${jobId}:`, error);
      throw new Error(error.response?.data?.detail || "Failed to delete assessment.");
    }
  },

  getJobResults: async (jobId) => {
    try {
      const response = await apiClient.get(`/api/assessments/${jobId}/results`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching results for job ${jobId}:`, error);
      throw new Error(error.response?.data?.detail || "Failed to load job results.");
    }
  },
  
  getAssessmentConfig: async (jobId) => {
    try {
      const response = await apiClient.get(`/api/assessments/${jobId}/config`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching config for job ${jobId}:`, error);
      throw new Error(error.response?.data?.detail || "Failed to load assessment configuration.");
    }
  },

  saveOverrides: async (jobId, studentId, questionId, overrides) => {
    try {
      const response = await apiClient.patch(`/api/assessments/${jobId}/results/${studentId}/${questionId}`, overrides);
      return response.data;
    } catch (error) {
      console.error(`Error saving overrides for student ${studentId}, question ${questionId}:`, error);
      throw new Error(error.response?.data?.detail || "Could not save changes.");
    }
  },

  downloadStudentReport: async (jobId, studentId) => {
    try {
      const response = await apiClient.get(`/api/assessments/${jobId}/report/${studentId}`, { responseType: 'blob' });
      triggerBrowserDownload(response.data, `Report_${studentId}.docx`, response.headers);
    } catch (error) {
      console.error("Error downloading student report:", error);
      throw new Error(error.response?.data?.detail || "Failed to download report.");
    }
  },

  downloadAllReports: async (jobId) => {
    try {
      const response = await apiClient.get(`/api/assessments/${jobId}/reports/all`, { responseType: 'blob' });
      triggerBrowserDownload(response.data, `All_Reports_${jobId}.zip`, response.headers);
    } catch (error) {
      console.error("Error downloading all reports:", error);
      throw new Error(error.response?.data?.detail || "Failed to download all reports.");
    }
  },
};

export default assessmentService;
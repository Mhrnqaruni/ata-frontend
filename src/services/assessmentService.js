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

  distributeScoresWithAI: async (config, totalMarks) => {
    try {
      const payload = { config, totalMarks };
      const response = await apiClient.post('/api/assessments/distribute-scores', payload);
      return response.data;
    } catch (error) {
      console.error("Error distributing scores with AI:", error);
      throw new Error(error.response?.data?.detail || "Failed to distribute scores.");
    }
  },

  createAssessmentJobWithManualUploads: async ({ config, manualStudentFiles, outsiders }) => {
    const formData = new FormData();

    // Append the main configuration and the list of any new outsider students.
    formData.append('config', JSON.stringify(config));
    formData.append('outsider_names', JSON.stringify(outsiders));

    // Create a Set of outsider IDs for quick lookup.
    const outsiderIds = new Set(outsiders.map(o => o.id));

    // Iterate over the staged files and append them to FormData with dynamic keys.
    // The key format 'student_<id>_files' or 'outsider_<id>_files' matches the backend expectation.
    for (const entityId in manualStudentFiles) {
      const fileList = manualStudentFiles[entityId];
      if (fileList && fileList.length > 0) {
        const entityType = outsiderIds.has(entityId) ? 'outsider' : 'student';
        const formKey = `${entityType}_${entityId}_files`;

        fileList.forEach(file => {
          formData.append(formKey, file, file.name);
        });
      }
    }

    try {
      const response = await apiClient.post('/api/assessments/v2/manual', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      console.error("Error creating job with manual uploads:", error);
      throw new Error(error.response?.data?.detail || "Failed to create job with manual uploads.");
    }
  },

  uploadManualSubmission: async (jobId, { studentId, outsiderName, images }) => {
    const formData = new FormData();
    formData.append('job_id', jobId);
    images.forEach(image => {
      formData.append('images', image, image.name);
    });

    if (studentId) {
      formData.append('student_id', studentId);
    } else if (outsiderName) {
      formData.append('outsider_name', outsiderName);
    }

    try {
      const response = await apiClient.post('/api/assessments/manual-submission', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      console.error("Error in manual submission:", error);
      throw new Error(error.response?.data?.detail || "Failed to upload manual submission.");
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

  // --- [PAGE COUNTING FUNCTIONALITY] ---

  countPages: async (files) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await apiClient.post('/api/page-count/count-pages', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      console.error("Error counting pages:", error);
      throw new Error(error.response?.data?.detail || "Failed to count pages.");
    }
  },
};

export default assessmentService;
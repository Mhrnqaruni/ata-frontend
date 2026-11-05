// Wraps /api/assessments: list and delete assessments, create them from batch or manual uploads, and retry.
// Also wraps document parsing, AI mark splitting, mark overrides and page counting.
// Area: assessments

import { invalidateAfter, cacheFamilies } from './queryCache';

import apiClient, { apiError } from './api';

const assessmentService = {
  getRetryDraft: async (jobId) => {
    try {
      return (await apiClient.get(`/api/assessments/${encodeURIComponent(jobId)}/retry`)).data;
    } catch (error) {
      throw apiError(error, 'Could not restore this assessment.');
    }
  },
  startRetry: async (jobId, formData) => {
    try {
      return (
        await apiClient.post(`/api/assessments/${encodeURIComponent(jobId)}/retry`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      ).data;
    } catch (error) {
      throw apiError(error, 'Could not restart this assessment.');
    }
  },

  // --- [V2 WORKFLOW METHODS] ---

  parseDocument: async (questionFile, answerKeyFile, classId, assessmentName) => {
    const formData = new FormData();
    // Repeated fields preserve group order and remain compatible with single-file callers.
    const asFiles = (value) => (Array.isArray(value) ? value : value ? [value] : []);
    asFiles(questionFile).forEach((file) => formData.append('question_file', file));
    asFiles(answerKeyFile).forEach((file) => formData.append('answer_key_file', file));
    formData.append('class_id', classId);
    formData.append('assessment_name', assessmentName);

    try {
      const response = await apiClient.post('/api/assessments/parse-document', formData, {
        timeout: 630000, // The server bounds multi-reader analysis to ten minutes.
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      console.error('Error parsing assessment document(s):', error);
      throw apiError(error, 'Failed to analyze document(s).');
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
      console.error('Error creating V2 assessment job:', error);
      throw apiError(error, 'Failed to create V2 assessment job.');
    }
  },

  distributeScoresWithAI: async (config, totalMarks) => {
    try {
      const payload = { config, totalMarks };
      const response = await apiClient.post('/api/assessments/distribute-scores', payload);
      return response.data;
    } catch (error) {
      console.error('Error distributing scores with AI:', error);
      throw apiError(error, 'Failed to distribute scores.');
    }
  },

  createAssessmentJobWithManualUploads: async ({ config, manualStudentFiles, outsiders }) => {
    const formData = new FormData();

    // Append the main configuration and the list of any new outsider students.
    formData.append('config', JSON.stringify(config));
    formData.append('outsider_names', JSON.stringify(outsiders));

    // Create a Set of outsider IDs for quick lookup.
    const outsiderIds = new Set(outsiders.map((o) => o.id));

    // Iterate over the staged files and append them to FormData with dynamic keys.
    // The key format 'student_<id>_files' or 'outsider_<id>_files' matches the backend expectation.
    for (const entityId in manualStudentFiles) {
      const fileList = manualStudentFiles[entityId];
      if (fileList && fileList.length > 0) {
        const entityType = outsiderIds.has(entityId) ? 'outsider' : 'student';
        const formKey = `${entityType}_${entityId}_files`;

        fileList.forEach((file) => {
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
      console.error('Error creating job with manual uploads:', error);
      throw apiError(error, 'Failed to create job with manual uploads.');
    }
  },

  uploadManualSubmission: async (jobId, { studentId, outsiderName, images }) => {
    const formData = new FormData();
    formData.append('job_id', jobId);
    images.forEach((image) => {
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
      console.error('Error in manual submission:', error);
      throw apiError(error, 'Failed to upload manual submission.');
    }
  },

  // --- [EXISTING V1 & DATA FETCHING METHODS - UNCHANGED AND STABLE] ---

  getAssessments: async () => {
    try {
      const response = await apiClient.get('/api/assessments');
      return response.data.assessments || [];
    } catch (error) {
      console.error('Error fetching assessments:', error);
      throw apiError(error, 'Failed to load assessments.');
    }
  },

  deleteAssessment: async (jobId) => {
    try {
      // A DELETE request typically doesn't have a response body on success.
      await apiClient.delete(`/api/assessments/${jobId}`);
    } catch (error) {
      console.error(`Error deleting assessment job ${jobId}:`, error);
      throw apiError(error, 'Failed to delete assessment.');
    }
  },

  getJobResults: async (jobId) => {
    try {
      const response = await apiClient.get(`/api/assessments/${jobId}/results`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching results for job ${jobId}:`, error);
      throw apiError(error, 'Failed to load job results.');
    }
  },

  saveOverrides: async (jobId, studentId, questionId, overrides) => {
    try {
      const response = await apiClient.patch(`/api/assessments/${jobId}/results/${studentId}/${questionId}`, overrides);
      return response.data;
    } catch (error) {
      console.error(`Error saving overrides for student ${studentId}, question ${questionId}:`, error);
      throw apiError(error, 'Could not save changes.');
    }
  },

  // --- [PAGE COUNTING FUNCTIONALITY] ---

  countPages: async (files) => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    try {
      const response = await apiClient.post('/api/page-count/count-pages', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      console.error('Error counting pages:', error);
      throw apiError(error, 'Failed to count pages.');
    }
  },
};

export default invalidateAfter(
  assessmentService,
  [
    'startRetry',
    'createAssessmentJobV2',
    'createAssessmentJobWithManualUploads',
    'uploadManualSubmission',
    'deleteAssessment',
    'saveOverrides',
  ],
  cacheFamilies.assessment
);

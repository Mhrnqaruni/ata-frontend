import apiClient from './api';

const reviewService = {
  async getResultsOverview(jobId) {
    try {
      const { data } = await apiClient.get(`/api/assessments/${jobId}/overview`);
      // Corrected to use camelCase keys from the API response
      return {
        jobId: data.jobId,
        assessmentName: data.assessmentName,
        status: data.status,
        studentsAiGraded: data.studentsAiGraded ?? [],
        studentsPending:  data.studentsPending  ?? [],
        students: data.students ?? [],
      };
    } catch (error) {
      console.error(`Error fetching results overview for job ${jobId}:`, error);
      throw new Error(error.response?.data?.detail || "Failed to load results overview.");
    }
  },

  async getStudentReview(jobId, studentId) {
    try {
      const { data } = await apiClient.get(`/api/assessments/${jobId}/students/${studentId}/review`);
      // Corrected to use camelCase keys from the API response
      return {
        jobId: data.jobId,
        studentId: data.studentId,
        studentName: data.studentName,
        assessmentName: data.assessmentName,
        config: data.config ?? {},
        perQuestion: data.perQuestion ?? [],
      };
    } catch (error) {
      console.error(`Error fetching review data for student ${studentId} in job ${jobId}:`, error);
      throw new Error(error.response?.data?.detail || "Failed to load student review data.");
    }
  },

  async saveQuestion(jobId, studentId, questionId, payload) {
    try {
      const { data } = await apiClient.patch(
        `/api/assessments/${jobId}/students/${studentId}/questions/${questionId}`,
        payload
      );
      return data;
    } catch (error) {
      console.error(`Error saving question review for student ${studentId} in job ${jobId}:`, error);
      throw new Error(error.response?.data?.detail || "Could not save changes.");
    }
  },

  async downloadReport(jobId, studentId) {
    try {
      const response = await apiClient.get(
        `/api/assessments/${jobId}/students/${studentId}/report.docx`,
        { responseType: 'blob' } // Important: request the data as a blob
      );

      // Create a URL for the blob
      const url = window.URL.createObjectURL(new Blob([response.data]));

      // Create a temporary link element to trigger the download
      const link = document.createElement('a');
      link.href = url;

      // Extract filename from Content-Disposition header if available
      // Note: Axios normalizes headers to lowercase
      let filename = `report_${studentId}.docx`; // fallback
      const contentDisposition = response.headers['content-disposition'] || response.headers['Content-Disposition'];
      if (contentDisposition) {
        // Match filename with or without quotes, handles: filename="name.docx" or filename=name.docx
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, ''); // Remove quotes
        }
      }
      link.setAttribute('download', filename);

      // Append to the document, click, and then remove
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);

      // Clean up the blob URL
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(`Error downloading report for student ${studentId} in job ${jobId}:`, error);
      // Optionally, show a user-facing error message here
      throw new Error(error.response?.data?.detail || "Could not download the report.");
    }
  },
};

export default reviewService;
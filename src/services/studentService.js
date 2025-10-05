// /ata-frontend/src/services/studentService.js

import api from './api';

/**
 * Service for student-related API operations.
 */
const studentService = {
  /**
   * Fetches the complete transcript for a student.
   *
   * @param {string} studentId - The ID of the student
   * @returns {Promise<Object>} Student transcript data
   */
  async getStudentTranscript(studentId) {
    const response = await api.get(`/api/students/${studentId}/transcript`);
    return response.data;
  },
};

export default studentService;

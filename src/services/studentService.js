// Wraps the /api/students endpoints: every student in the teacher's workspace, in a class or not (the Students tab),
// editing one student's name and ID, and one student's full transcript (GET /api/students/{id}/transcript).
// Area: academics

import api, { apiError } from './api';
import { invalidateAfter, cacheFamilies } from './queryCache';

// C2's words for a duplicate ID (design §5), if the server's own are missing.
const DUPLICATE_ID = 'This student ID is already used by another student.';

/**
 * Service for student-related API operations.
 */
const studentService = {
  /**
   * Every active student in the teacher's workspace, sorted by name.
   *
   * @param {AbortSignal} [signal] - Stops the read when its page goes
   * @returns {Promise<Array<{id: string, name: string, studentId: string, classes: Array<{id: string, name: string}>}>>}
   */
  async list(signal) {
    const response = await api.get('/api/students', { signal });
    return response.data?.students || [];
  },

  /**
   * Saves a student's name and ID, whether or not they are in a class. A failure throws an Error whose message is
   * the edit window's words: the server's, or the duplicate-ID words for a 409.
   *
   * @param {string} id - The student's id in the app (not their school ID)
   * @param {{name: string, studentId: string}} changes
   * @returns {Promise<Object>} The saved student
   */
  async update(id, { name, studentId }) {
    try {
      const response = await api.put(`/api/students/${encodeURIComponent(id)}`, { name, studentId });
      return response.data;
    } catch (error) {
      throw apiError(error, error.response?.status === 409 ? DUPLICATE_ID : "Couldn't save the student. Try again.");
    }
  },

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

// An edit refreshes the Students list, the class pages and the other views that show students.
export default invalidateAfter(studentService, ['update'], cacheFamilies.roster);

// /src/services/quizSPService.js

import apiClient from './api';

/**
 * Self-Paced Quiz Service
 *
 * API client for self-paced quiz operations.
 * Provides methods for both teachers (OAuth2) and students (X-Student-Token).
 *
 * Teacher methods: Use standard JWT authentication (automatic via apiClient)
 * Student methods: Require X-Student-Token header (passed explicitly)
 */

const quizSPService = {
  // ==================== TEACHER OPERATIONS (OAuth2 Protected) ====================

  /**
   * Create a new self-paced session.
   *
   * @param {string} quizId - Quiz UUID
   * @param {Object} sessionData - Session configuration
   * @param {string} sessionData.class_id - (Optional) Class ID
   * @param {string} sessionData.deadline - (Optional) ISO 8601 deadline
   * @param {boolean} sessionData.allow_navigation - Allow back navigation
   * @param {boolean} sessionData.allow_review_before_submit - Allow review page
   * @param {boolean} sessionData.require_all_answers - Require all questions
   * @param {boolean} sessionData.show_timer - Show elapsed time
   * @param {boolean} sessionData.show_results_immediately - Show score after submit
   * @returns {Promise<Object>} Session details with access_code
   */
  createSPSession: async (quizId, sessionData) => {
    try {
      const response = await apiClient.post('/api/quiz-sp-sessions', {
        quiz_id: quizId,
        ...sessionData
      });
      return response.data;
    } catch (error) {
      console.error('Error creating SP session:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to create session';
      throw new Error(errorMessage);
    }
  },

  /**
   * Get session details.
   *
   * @param {string} sessionId - Session UUID
   * @returns {Promise<Object>} Session details
   */
  getSPSession: async (sessionId) => {
    try {
      const response = await apiClient.get(`/api/quiz-sp-sessions/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching SP session ${sessionId}:`, error);
      const errorMessage = error.response?.data?.detail || 'Failed to fetch session';
      throw new Error(errorMessage);
    }
  },

  /**
   * Start a session (make it joinable).
   *
   * @param {string} sessionId - Session UUID
   * @returns {Promise<Object>} Updated session
   */
  startSPSession: async (sessionId) => {
    try {
      const response = await apiClient.post(`/api/quiz-sp-sessions/${sessionId}/start`);
      return response.data;
    } catch (error) {
      console.error(`Error starting SP session ${sessionId}:`, error);
      const errorMessage = error.response?.data?.detail || 'Failed to start session';
      throw new Error(errorMessage);
    }
  },

  /**
   * End a session (no more submissions).
   *
   * @param {string} sessionId - Session UUID
   * @returns {Promise<Object>} Updated session
   */
  endSPSession: async (sessionId) => {
    try {
      const response = await apiClient.post(`/api/quiz-sp-sessions/${sessionId}/end`);
      return response.data;
    } catch (error) {
      console.error(`Error ending SP session ${sessionId}:`, error);
      const errorMessage = error.response?.data?.detail || 'Failed to end session';
      throw new Error(errorMessage);
    }
  },

  /**
   * Get all participants in a session.
   *
   * @param {string} sessionId - Session UUID
   * @returns {Promise<Array>} List of participant summaries
   */
  getSPParticipants: async (sessionId) => {
    try {
      const response = await apiClient.get(`/api/quiz-sp-sessions/${sessionId}/participants`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching SP participants ${sessionId}:`, error);
      const errorMessage = error.response?.data?.detail || 'Failed to fetch participants';
      throw new Error(errorMessage);
    }
  },

  /**
   * Get the latest session for a quiz.
   *
   * @param {string} quizId - Quiz UUID
   * @returns {Promise<Object>} Most recent session for this quiz
   */
  getLatestSPSession: async (quizId) => {
    try {
      const response = await apiClient.get(`/api/quiz-sp-sessions/quiz/${quizId}/latest`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      console.error(`Error fetching latest SP session for quiz ${quizId}:`, error);
      const errorMessage = error.response?.data?.detail || 'Failed to fetch latest session';
      throw new Error(errorMessage);
    }
  },

  /**
   * Get session analytics.
   *
   * @param {string} sessionId - Session UUID
   * @returns {Promise<Object>} Session analytics with question breakdown
   */
  getSPAnalytics: async (sessionId) => {
    try {
      const response = await apiClient.get(`/api/quiz-sp-sessions/${sessionId}/analytics`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching SP analytics ${sessionId}:`, error);
      const errorMessage = error.response?.data?.detail || 'Failed to fetch analytics';
      throw new Error(errorMessage);
    }
  },

  /**
   * Get individual student report.
   *
   * @param {string} sessionId - Session UUID
   * @param {string} studentId - Student's school ID
   * @returns {Promise<Object>} Student report with question-by-question results
   */
  getSPStudentReport: async (sessionId, studentId) => {
    try {
      const response = await apiClient.get(
        `/api/quiz-sp-sessions/${sessionId}/student/${studentId}/report`
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching SP student report ${studentId}:`, error);
      const errorMessage = error.response?.data?.detail || 'Failed to fetch student report';
      throw new Error(errorMessage);
    }
  },

  /**
   * Download a personalized report for a student.
   *
   * @param {string} sessionId - Session UUID
   * @param {string} studentId - Student's school ID
   * @param {string} studentName - Student display name
   * @returns {Promise<void>}
   */
  downloadStudentReport: async (sessionId, studentId, studentName) => {
    try {
      const response = await apiClient.get(
        `/api/quiz-sp-sessions/${sessionId}/student/${studentId}/report.docx`,
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const safeName = (studentName || 'Student').replace(/\s+/g, '_');
      const fileName = `${safeName}_SP_Quiz_Report.docx`;
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading SP report:', error);
      throw new Error('Failed to download SP quiz report');
    }
  },

  /**
   * Download all submitted SP quiz reports as a ZIP.
   *
   * @param {string} sessionId - Session UUID
   * @returns {Promise<void>}
   */
  downloadAllReports: async (sessionId) => {
    try {
      const response = await apiClient.get(
        `/api/quiz-sp-sessions/${sessionId}/download-all-reports`,
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const fileName = 'SP_Quiz_All_Reports.zip';
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading all SP reports:', error);
      throw new Error('Failed to download all SP quiz reports');
    }
  },

  // ==================== STUDENT OPERATIONS (X-Student-Token Required) ====================

  /**
   * Student joins a session.
   *
   * @param {string} accessCode - 6-character access code
   * @param {string} studentId - Student's school ID
   * @param {string} guestName - Student's name
   * @returns {Promise<Object>} Join response with student_token and session details
   */
  joinSPSession: async (accessCode, studentId, guestName) => {
    try {
      const response = await apiClient.post('/api/quiz-sp-sessions/join', {
        access_code: accessCode.toUpperCase(),
        student_id: studentId,
        guest_name: guestName
      });

      // Response now includes questions array (CRITICAL FIX from Phase 3)
      // Store questions in the response for immediate UI rendering
      return response.data;
    } catch (error) {
      console.error('Error joining SP session:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to join session';
      throw new Error(errorMessage);
    }
  },

  /**
   * Get student's current progress.
   *
   * @param {string} sessionId - Session UUID
   * @param {string} studentToken - JWT token from join response
   * @returns {Promise<Object>} Progress details
   */
  getSPProgress: async (sessionId, studentToken) => {
    try {
      const response = await apiClient.get(
        `/api/quiz-sp-sessions/${sessionId}/progress`,
        {
          headers: {
            'X-Student-Token': studentToken
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching SP progress:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to fetch progress';
      throw new Error(errorMessage);
    }
  },

  /**
   * Navigate to a specific question.
   *
   * @param {string} sessionId - Session UUID
   * @param {number} questionIndex - 0-based question index
   * @param {string} studentToken - JWT token
   * @returns {Promise<Object>} Updated progress
   */
  navigateSPQuestion: async (sessionId, questionIndex, studentToken) => {
    try {
      const response = await apiClient.post(
        `/api/quiz-sp-sessions/${sessionId}/navigate`,
        {
          question_index: questionIndex
        },
        {
          headers: {
            'X-Student-Token': studentToken
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error navigating SP question:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to navigate';
      throw new Error(errorMessage);
    }
  },

  /**
   * Submit an answer.
   *
   * @param {string} sessionId - Session UUID
   * @param {string} questionId - Question UUID
   * @param {*} answer - Answer data (format depends on question type)
   * @param {number|null} timeTakenMs - Optional time taken in milliseconds
   * @param {string} studentToken - JWT token
   * @returns {Promise<Object>} Grading result
   */
  submitSPAnswer: async (sessionId, questionId, answer, timeTakenMs, studentToken) => {
    try {
      const response = await apiClient.post(
        `/api/quiz-sp-sessions/${sessionId}/answer`,
        {
          question_id: questionId,
          answer: answer,
          time_taken_ms: timeTakenMs
        },
        {
          headers: {
            'X-Student-Token': studentToken
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error submitting SP answer:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to submit answer';
      throw new Error(errorMessage);
    }
  },

  /**
   * Final quiz submission.
   *
   * @param {string} sessionId - Session UUID
   * @param {string} studentToken - JWT token
   * @returns {Promise<Object>} Final submission result
   */
  submitSPQuiz: async (sessionId, studentToken) => {
    try {
      const response = await apiClient.post(
        `/api/quiz-sp-sessions/${sessionId}/submit`,
        {
          confirm: true
        },
        {
          headers: {
            'X-Student-Token': studentToken
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error submitting SP quiz:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to submit quiz';
      throw new Error(errorMessage);
    }
  },
  /**
   * Get answer review for the current student (SP mode).
   */
  getMyAnswerReview: async (sessionId, studentToken) => {
    try {
      const response = await apiClient.get(
        `/api/quiz-sp-sessions/${sessionId}/my-answers`,
        {
          headers: {
            'X-Student-Token': studentToken
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching SP answer review for session ${sessionId}:`, error);
      const errorMessage = error.response?.data?.detail || 'Could not load answer review.';
      throw new Error(errorMessage);
    }
  },

  // ==================== ROSTER AND OUTSIDER OPERATIONS ====================

  /**
   * Get attendance summary for SP session.
   *
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} Attendance data with roster and outsiders
   */
  getSPSessionAttendance: async (sessionId) => {
    try {
      const response = await apiClient.get(`/api/quiz-sp-sessions/${sessionId}/attendance`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching SP attendance for session ${sessionId}:`, error);
      const errorMessage = error.response?.data?.detail || 'Failed to fetch attendance';
      throw new Error(errorMessage);
    }
  },

  /**
   * Get roster of expected students for SP session.
   *
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} Roster data with entries and statistics
   */
  getSPSessionRoster: async (sessionId) => {
    try {
      const response = await apiClient.get(`/api/quiz-sp-sessions/${sessionId}/roster`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching SP roster for session ${sessionId}:`, error);
      const errorMessage = error.response?.data?.detail || 'Failed to fetch roster';
      throw new Error(errorMessage);
    }
  },

  /**
   * Get outsider students for SP session.
   *
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} Outsider data with records and counts
   */
  getSPSessionOutsiders: async (sessionId) => {
    try {
      const response = await apiClient.get(`/api/quiz-sp-sessions/${sessionId}/outsiders`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching SP outsiders for session ${sessionId}:`, error);
      const errorMessage = error.response?.data?.detail || 'Failed to fetch outsiders';
      throw new Error(errorMessage);
    }
  },

  /**
   * Flag or unflag an outsider student.
   *
   * @param {string} sessionId - Session ID
   * @param {string} outsiderId - Outsider record ID
   * @param {boolean} flagged - True to flag, false to unflag
   * @param {string|null} teacherNotes - Optional notes from teacher
   * @returns {Promise<Object>} Updated outsider record
   */
  flagSPOutsiderStudent: async (sessionId, outsiderId, flagged, teacherNotes = null) => {
    try {
      const response = await apiClient.put(
        `/api/quiz-sp-sessions/${sessionId}/outsiders/${outsiderId}/flag`,
        {
          flagged,
          teacher_notes: teacherNotes
        }
      );
      return response.data;
    } catch (error) {
      console.error(`Error flagging SP outsider ${outsiderId}:`, error);
      const errorMessage = error.response?.data?.detail || 'Failed to flag outsider';
      throw new Error(errorMessage);
    }
  },

  /**
   * Manually sync roster from class to SP session.
   *
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} Sync result with created entries
   */
  syncSPSessionRoster: async (sessionId) => {
    try {
      const response = await apiClient.post(`/api/quiz-sp-sessions/${sessionId}/roster/sync`);
      return response.data;
    } catch (error) {
      console.error(`Error syncing SP roster for session ${sessionId}:`, error);
      const errorMessage = error.response?.data?.detail || 'Failed to sync roster';
      throw new Error(errorMessage);
    }
  },

  /**
   * Assign an outsider student to a roster student.
   *
   * @param {string} sessionId - Session ID
   * @param {string} outsiderId - Outsider record ID
   * @param {string} targetStudentSchoolId - Correct student school ID
   * @returns {Promise<Object>} Assignment result
   */
  assignOutsiderToStudent: async (sessionId, outsiderId, targetStudentSchoolId) => {
    try {
      const response = await apiClient.post(
        `/api/quiz-sp-sessions/${sessionId}/outsiders/${outsiderId}/assign`,
        { target_student_school_id: targetStudentSchoolId }
      );
      return response.data;
    } catch (error) {
      console.error('Error assigning outsider:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to assign outsider';
      throw new Error(errorMessage);
    }
  }
};

export default quizSPService;

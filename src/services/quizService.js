// /src/services/quizService.js

import apiClient from './api';

const quizService = {
  // ==================== QUIZ CRUD OPERATIONS ====================

  /**
   * Get all quizzes for the current user
   */
  getAllQuizzes: async () => {
    try {
      const response = await apiClient.get('/api/quizzes');
      return response.data || [];
    } catch (error) {
      console.error("Error fetching quizzes:", error);
      const errorMessage = error.response?.data?.detail || "Could not load quizzes.";
      throw new Error(errorMessage);
    }
  },

  /**
   * Get a single quiz by ID
   */
  getQuizById: async (quizId) => {
    try {
      const response = await apiClient.get(`/api/quizzes/${quizId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching quiz ${quizId}:`, error);
      const errorMessage = error.response?.data?.detail || "Could not load quiz details.";
      throw new Error(errorMessage);
    }
  },

  /**
   * Create a new quiz
   */
  createQuiz: async (quizData) => {
    try {
      const response = await apiClient.post('/api/quizzes', quizData);
      return response.data;
    } catch (error) {
      console.error("Error creating quiz:", error);
      const errorMessage = error.response?.data?.detail || "Failed to create quiz.";
      throw new Error(errorMessage);
    }
  },

  /**
   * Update an existing quiz
   */
  updateQuiz: async (quizId, quizData) => {
    try {
      const response = await apiClient.put(`/api/quizzes/${quizId}`, quizData);
      return response.data;
    } catch (error) {
      console.error(`Error updating quiz ${quizId}:`, error);
      const errorMessage = error.response?.data?.detail || "Failed to update quiz.";
      throw new Error(errorMessage);
    }
  },

  /**
   * Delete a quiz (soft delete)
   */
  deleteQuiz: async (quizId) => {
    try {
      await apiClient.delete(`/api/quizzes/${quizId}`);
    } catch (error) {
      console.error(`Error deleting quiz ${quizId}:`, error);
      const errorMessage = error.response?.data?.detail || "Failed to delete quiz.";
      throw new Error(errorMessage);
    }
  },

  /**
   * Duplicate a quiz
   */
  duplicateQuiz: async (quizId, newTitle) => {
    try {
      const response = await apiClient.post(`/api/quizzes/${quizId}/duplicate`, { new_title: newTitle });
      return response.data;
    } catch (error) {
      console.error(`Error duplicating quiz ${quizId}:`, error);
      const errorMessage = error.response?.data?.detail || "Failed to duplicate quiz.";
      throw new Error(errorMessage);
    }
  },

  /**
   * Publish a quiz (make it available for sessions)
   */
  publishQuiz: async (quizId) => {
    try {
      const response = await apiClient.post(`/api/quizzes/${quizId}/publish`);
      return response.data;
    } catch (error) {
      console.error(`Error publishing quiz ${quizId}:`, error);
      const errorMessage = error.response?.data?.detail || "Failed to publish quiz.";
      throw new Error(errorMessage);
    }
  },

  // ==================== QUESTION OPERATIONS ====================

  /**
   * Add a question to a quiz
   */
  addQuestion: async (quizId, questionData) => {
    try {
      const response = await apiClient.post(`/api/quizzes/${quizId}/questions`, questionData);
      return response.data;
    } catch (error) {
      console.error(`Error adding question to quiz ${quizId}:`, error);
      const errorMessage = error.response?.data?.detail || "Failed to add question.";
      throw new Error(errorMessage);
    }
  },

  /**
   * Update a question
   */
  updateQuestion: async (quizId, questionId, questionData) => {
    try {
      const response = await apiClient.put(`/api/quizzes/${quizId}/questions/${questionId}`, questionData);
      return response.data;
    } catch (error) {
      console.error(`Error updating question ${questionId}:`, error);
      const errorMessage = error.response?.data?.detail || "Failed to update question.";
      throw new Error(errorMessage);
    }
  },

  /**
   * Delete a question
   */
  deleteQuestion: async (quizId, questionId) => {
    try {
      await apiClient.delete(`/api/quizzes/${quizId}/questions/${questionId}`);
    } catch (error) {
      console.error(`Error deleting question ${questionId}:`, error);
      const errorMessage = error.response?.data?.detail || "Failed to delete question.";
      throw new Error(errorMessage);
    }
  },

  /**
   * Reorder questions in a quiz
   */
  reorderQuestions: async (quizId, questionOrder) => {
    try {
      const response = await apiClient.put(`/api/quizzes/${quizId}/questions/reorder`, { question_order: questionOrder });
      return response.data;
    } catch (error) {
      console.error(`Error reordering questions for quiz ${quizId}:`, error);
      const errorMessage = error.response?.data?.detail || "Failed to reorder questions.";
      throw new Error(errorMessage);
    }
  },

  // ==================== SESSION OPERATIONS (HOST) ====================

  /**
   * Create a new quiz session
   */
  createSession: async (quizId) => {
    try {
      const response = await apiClient.post('/api/quiz-sessions', { quiz_id: quizId });
      return response.data;
    } catch (error) {
      console.error(`Error creating session for quiz ${quizId}:`, error);
      const errorMessage = error.response?.data?.detail || "Failed to create quiz session.";
      throw new Error(errorMessage);
    }
  },

  /**
   * Get session by ID (host access)
   */
  getSession: async (sessionId) => {
    try {
      const response = await apiClient.get(`/api/quiz-sessions/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching session ${sessionId}:`, error);
      const errorMessage = error.response?.data?.detail || "Could not load session details.";
      throw new Error(errorMessage);
    }
  },

  /**
   * Start a session (begin quiz)
   */
  startSession: async (sessionId) => {
    try {
      const response = await apiClient.post(`/api/quiz-sessions/${sessionId}/start`);
      return response.data;
    } catch (error) {
      console.error(`Error starting session ${sessionId}:`, error);
      const errorMessage = error.response?.data?.detail || "Failed to start session.";
      throw new Error(errorMessage);
    }
  },

  /**
   * End a session
   */
  endSession: async (sessionId) => {
    try {
      // FIX: Send request body to match backend Pydantic model
      const response = await apiClient.post(`/api/quiz-sessions/${sessionId}/end`, {
        reason: "completed"
      });
      return response.data;
    } catch (error) {
      console.error(`Error ending session ${sessionId}:`, error);
      const errorMessage = error.response?.data?.detail || "Failed to end session.";
      throw new Error(errorMessage);
    }
  },

  /**
   * Cancel a session
   */
  cancelSession: async (sessionId) => {
    try {
      const response = await apiClient.post(`/api/quiz-sessions/${sessionId}/cancel`);
      return response.data;
    } catch (error) {
      console.error(`Error cancelling session ${sessionId}:`, error);
      const errorMessage = error.response?.data?.detail || "Failed to cancel session.";
      throw new Error(errorMessage);
    }
  },

  /**
   * Advance to next question (host controls)
   */
  nextQuestion: async (sessionId) => {
    try {
      const response = await apiClient.post(`/api/quiz-sessions/${sessionId}/next-question`);
      return response.data;
    } catch (error) {
      console.error(`Error advancing to next question in session ${sessionId}:`, error);
      const errorMessage = error.response?.data?.detail || "Failed to advance to next question.";
      throw new Error(errorMessage);
    }
  },

  /**
   * ✅ FIX #4B: Skip cooldown period and advance immediately (host controls)
   */
  skipCooldown: async (sessionId) => {
    try {
      const response = await apiClient.post(`/api/quiz-sessions/${sessionId}/skip-cooldown`);
      return response.data;
    } catch (error) {
      console.error(`Error skipping cooldown in session ${sessionId}:`, error);
      const errorMessage = error.response?.data?.detail || "Failed to skip cooldown period.";
      throw new Error(errorMessage);
    }
  },

  /**
   * Toggle auto-advance for a session (FIX Issue 2)
   */
  toggleAutoAdvance: async (sessionId, enabled, cooldownSeconds = 10) => {
    try {
      const response = await apiClient.post(
        `/api/quiz-sessions/${sessionId}/toggle-auto-advance`,
        null,
        {
          params: {
            enabled,
            cooldown_seconds: cooldownSeconds
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error(`Error toggling auto-advance for session ${sessionId}:`, error);
      const errorMessage = error.response?.data?.detail || "Failed to toggle auto-advance.";
      throw new Error(errorMessage);
    }
  },

  /**
   * Get all sessions for the current user
   */
  getAllSessions: async () => {
    try {
      const response = await apiClient.get('/api/quiz-sessions');
      return response.data || [];
    } catch (error) {
      console.error("Error fetching sessions:", error);
      const errorMessage = error.response?.data?.detail || "Could not load sessions.";
      throw new Error(errorMessage);
    }
  },

  // Get latest session for a quiz
  getLatestSession: async (quizId) => {
    try {
      const response = await apiClient.get(`/api/quiz-sessions/quiz/${quizId}/latest`);
      return response.data;
    } catch (error) {
      // If no sessions found (404), return null instead of throwing
      if (error.response?.status === 404) {
        return null;
      }
      console.error(`Error fetching latest session for quiz ${quizId}:`, error);
      const errorMessage = error.response?.data?.detail || 'Failed to fetch latest session';
      throw new Error(errorMessage);
    }
  },

  // ==================== PARTICIPANT OPERATIONS (PUBLIC) ====================

  /**
   * Join a session as a guest (no auth required)
   *
   * @param {Object} joinData - Join request data
   * @param {string} joinData.room_code - Session room code
   * @param {string} joinData.guest_name - Student's name
   * @param {string} [joinData.student_id] - Optional student ID (for identified guests)
   *
   * Supports three join modes:
   * 1. Identified guest (MOST COMMON): Provide both guest_name and student_id
   * 2. Pure guest: Provide only guest_name
   * 3. Registered student: Provide only student_id (requires account)
   */
  joinSession: async (joinData) => {
    try {
      const response = await apiClient.post('/api/quiz-sessions/join', joinData);
      return response.data; // Returns { participant_id, session_id, display_name, guest_token, is_guest, session_status, current_question_index }
    } catch (error) {
      console.error(`Error joining session:`, error);
      const errorMessage = error.response?.data?.detail || "Failed to join quiz session.";
      throw new Error(errorMessage);
    }
  },

  /**
   * Submit an answer (participant)
   */
  submitAnswer: async (sessionId, answerData, guestToken) => {
    try {
      const response = await apiClient.post(
        `/api/quiz-sessions/${sessionId}/submit-answer`,
        answerData,
        {
          headers: {
            'X-Guest-Token': guestToken
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error(`Error submitting answer for session ${sessionId}:`, error);
      const errorMessage = error.response?.data?.detail || "Failed to submit answer.";
      throw new Error(errorMessage);
    }
  },

  /**
   * Get leaderboard for a session
   */
  getLeaderboard: async (sessionId, guestToken = null) => {
    try {
      const headers = guestToken ? { 'X-Guest-Token': guestToken } : {};
      const response = await apiClient.get(`/api/quiz-sessions/${sessionId}/leaderboard`, { headers });
      return response.data;
    } catch (error) {
      console.error(`Error fetching leaderboard for session ${sessionId}:`, error);
      const errorMessage = error.response?.data?.detail || "Could not load leaderboard.";
      throw new Error(errorMessage);
    }
  },
  /**
   * Get answer review for the current participant
   */
  getMyAnswerReview: async (sessionId, guestToken = null) => {
    try {
      const headers = guestToken ? { 'X-Guest-Token': guestToken } : {};
      const response = await apiClient.get(`/api/quiz-sessions/${sessionId}/my-answers`, { headers });
      return response.data;
    } catch (error) {
      console.error(`Error fetching answer review for session ${sessionId}:`, error);
      const errorMessage = error.response?.data?.detail || "Could not load answer review.";
      throw new Error(errorMessage);
    }
  },

  // ==================== ANALYTICS OPERATIONS ====================

  /**
   * Get comprehensive session analytics
   * Returns session summary, question breakdown, and all statistics
   */
  getSessionAnalytics: async (sessionId) => {
    try {
      const response = await apiClient.get(`/api/quiz-sessions/${sessionId}/analytics`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching analytics for session ${sessionId}:`, error);
      const errorMessage = error.response?.data?.detail || "Could not load analytics.";
      throw new Error(errorMessage);
    }
  },

  /**
   * Get participant analytics list for a session
   * Returns all participants sorted by rank
   */
  getParticipantAnalytics: async (sessionId) => {
    try {
      const response = await apiClient.get(`/api/quiz-sessions/${sessionId}/participant-analytics`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching participant analytics for session ${sessionId}:`, error);
      const errorMessage = error.response?.data?.detail || "Could not load participant analytics.";
      throw new Error(errorMessage);
    }
  },

  /**
   * Get detailed analytics for a single participant
   * Returns participant stats with all their responses
   */
  getParticipantDetailAnalytics: async (sessionId, participantId) => {
    try {
      const response = await apiClient.get(`/api/quiz-sessions/${sessionId}/participant-analytics/${participantId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching analytics for participant ${participantId}:`, error);
      const errorMessage = error.response?.data?.detail || "Could not load participant details.";
      throw new Error(errorMessage);
    }
  },

  /**
   * Export session results as CSV
   * Automatically downloads the CSV file
   */
  exportSessionCSV: async (sessionId) => {
    try {
      const response = await apiClient.get(`/api/quiz-sessions/${sessionId}/export/csv`, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const contentDisposition = response.headers['content-disposition'];
      let fileName = `quiz_session_${sessionId}_analytics.csv`;

      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
        if (fileNameMatch && fileNameMatch.length === 2) {
          fileName = fileNameMatch[1];
        }
      }

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log(`✅ CSV exported successfully: ${fileName}`);
    } catch (error) {
      console.error(`Error exporting CSV for session ${sessionId}:`, error);
      throw new Error("Failed to export quiz results. Please try again.");
    }
  },

  /**
   * Get enhanced session analytics with full participant tracking
   * Returns class students (with ABSENT status), outsiders, and standard analytics
   */
  getEnhancedAnalytics: async (sessionId) => {
    try {
      const response = await apiClient.get(`/api/quiz-sessions/${sessionId}/enhanced-analytics`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching enhanced analytics for session ${sessionId}:`, error);
      const errorMessage = error.response?.data?.detail || "Could not load enhanced analytics.";
      throw new Error(errorMessage);
    }
  },

  /**
   * Download quiz report for a single participant
   * Automatically downloads the DOCX file with AI-generated feedback
   */
  downloadParticipantReport: async (sessionId, participantId, studentName) => {
    try {
      const response = await apiClient.get(
        `/api/quiz-sessions/${sessionId}/participants/${participantId}/report.docx`,
        { responseType: 'blob' }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const contentDisposition = response.headers['content-disposition'];
      let fileName = `${studentName || 'Student'}_Quiz_Report.docx`;

      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
        if (fileNameMatch && fileNameMatch.length === 2) {
          fileName = fileNameMatch[1];
        }
      }

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log(`✅ Report downloaded successfully: ${fileName}`);
    } catch (error) {
      console.error(`Error downloading report for participant ${participantId}:`, error);
      throw new Error("Failed to download quiz report. Please try again.");
    }
  },

  /**
   * Download all quiz reports as a ZIP file
   * Generates reports for all participants with GRADED status and bundles them
   */
  downloadAllReports: async (sessionId) => {
    try {
      const response = await apiClient.get(
        `/api/quiz-sessions/${sessionId}/download-all-reports`,
        {
          responseType: 'blob',
          validateStatus: function (status) {
            return status >= 200 && status < 300; // Only accept 2xx status codes
          }
        }
      );

      // Verify we actually got a blob
      if (!response.data || !(response.data instanceof Blob)) {
        throw new Error("Invalid response format");
      }

      // Create download link
      const url = window.URL.createObjectURL(response.data);
      const contentDisposition = response.headers['content-disposition'];
      let fileName = `Quiz_All_Reports.zip`;

      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
        if (fileNameMatch && fileNameMatch.length === 2) {
          fileName = fileNameMatch[1];
        }
      }

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();

      // Clean up
      setTimeout(() => {
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);

      console.log(`✅ All reports downloaded successfully: ${fileName}`);
      return { success: true, fileName };
    } catch (error) {
      console.error(`Error downloading all reports for session ${sessionId}:`, error);
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        throw new Error(error.response.data?.detail || "Failed to download all reports. Please try again.");
      } else if (error.request) {
        // The request was made but no response was received
        throw new Error("No response from server. Please check your connection.");
      } else {
        // Something happened in setting up the request that triggered an Error
        throw new Error(error.message || "Failed to download all reports. Please try again.");
      }
    }
  },

  // ==================== ROSTER & ATTENDANCE OPERATIONS ====================

  /**
   * Get comprehensive attendance summary for a session
   * Returns roster summary, outsider summary, and participation stats
   */
  getSessionAttendance: async (sessionId) => {
    try {
      const response = await apiClient.get(`/api/quiz-sessions/${sessionId}/attendance`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching attendance for session ${sessionId}:`, error);
      const errorMessage = error.response?.data?.detail || "Could not load attendance data.";
      throw new Error(errorMessage);
    }
  },

  /**
   * Get class roster for a session
   * Returns expected students with join/absent status
   */
  getSessionRoster: async (sessionId) => {
    try {
      const response = await apiClient.get(`/api/quiz-sessions/${sessionId}/roster`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching roster for session ${sessionId}:`, error);
      const errorMessage = error.response?.data?.detail || "Could not load roster.";
      throw new Error(errorMessage);
    }
  },

  /**
   * Get outsider students for a session
   * Returns students who joined but are not on expected roster
   */
  getSessionOutsiders: async (sessionId) => {
    try {
      const response = await apiClient.get(`/api/quiz-sessions/${sessionId}/outsiders`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching outsiders for session ${sessionId}:`, error);
      const errorMessage = error.response?.data?.detail || "Could not load outsider data.";
      throw new Error(errorMessage);
    }
  },

  /**
   * Flag or unflag an outsider student for teacher review
   * @param {string} sessionId - Session ID
   * @param {string} outsiderId - Outsider record ID
   * @param {boolean} flagged - Whether to flag the outsider
   * @param {string|null} teacherNotes - Optional notes from teacher
   */
  flagOutsiderStudent: async (sessionId, outsiderId, flagged, teacherNotes = null) => {
    try {
      const response = await apiClient.put(
        `/api/quiz-sessions/${sessionId}/outsiders/${outsiderId}/flag`,
        {
          flagged: flagged,
          teacher_notes: teacherNotes
        }
      );
      return response.data;
    } catch (error) {
      console.error(`Error flagging outsider ${outsiderId}:`, error);
      const errorMessage = error.response?.data?.detail || "Could not flag outsider.";
      throw new Error(errorMessage);
    }
  },

  /**
   * Assign an outsider participant to a roster student.
   *
   * @param {string} sessionId - Session ID
   * @param {string} outsiderId - Outsider record ID
   * @param {string} targetStudentSchoolId - Correct student school ID
   * @returns {Promise<Object>} Assignment result
   */
  assignOutsiderToStudent: async (sessionId, outsiderId, targetStudentSchoolId) => {
    try {
      const response = await apiClient.post(
        `/api/quiz-sessions/${sessionId}/outsiders/${outsiderId}/assign`,
        { target_student_school_id: targetStudentSchoolId }
      );
      return response.data;
    } catch (error) {
      console.error('Error assigning outsider:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to assign outsider';
      throw new Error(errorMessage);
    }
  },

  /**
   * Sync roster from class (refresh expected students list)
   * @param {string} sessionId - Session ID
   */
  syncSessionRoster: async (sessionId) => {
    try {
      const response = await apiClient.post(`/api/quiz-sessions/${sessionId}/roster/sync`);
      return response.data;
    } catch (error) {
      console.error(`Error syncing roster for session ${sessionId}:`, error);
      const errorMessage = error.response?.data?.detail || "Could not sync roster.";
      throw new Error(errorMessage);
    }
  },

  // ==================== AI-POWERED QUESTION GENERATION ====================

  /**
   * Parse quiz questions from uploaded document using AI
   *
   * @param {FormData} formData - FormData containing:
   *   - document: File to parse (PDF, image, DOCX, Excel, CSV)
   *   - document_type: Type of parsing ("questions_only" | "questions_and_answers" | "lecture_material")
   *   - grade_level: Optional target grade level
   *   - num_questions: Number of questions to generate (for lecture_material only)
   * @returns {Promise<Object>} Parsed questions data
   */
  parseQuizDocument: async (formData) => {
    try {
      const response = await apiClient.post('/api/quizzes/ai/parse', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error parsing quiz document:", error);
      const errorMessage = error.response?.data?.detail || "Failed to parse quiz document. Please try again.";
      throw new Error(errorMessage);
    }
  },

  // ==================== WEBSOCKET CONNECTION ====================

  /**
   * Create WebSocket connection for real-time updates
   *
   * @param {string} sessionId - Session ID
   * @param {string} token - JWT token for host OR guest token for participant
   * @param {boolean} isHost - Whether this is a host connection
   * @returns {WebSocket} WebSocket connection
   */
  connectWebSocket: (sessionId, token, isHost = false) => {
    // FIX #1 & #5: Validate environment variable and construct proper WebSocket URL
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

    if (!apiBaseUrl) {
      const error = new Error("VITE_API_BASE_URL is not set. Please check your .env.local file.");
      console.error('[WebSocket] Configuration error:', error.message);
      throw error;
    }

    // Convert http:// or https:// to ws:// or wss://
    // CRITICAL: https:// MUST become wss:// for secure WebSocket connections
    const wsBaseUrl = apiBaseUrl.replace(/^https?/, (match) => {
      return match === 'https' ? 'wss' : 'ws';
    });

    const queryParam = isHost ? `token=${token}` : `guest_token=${token}`;
    const wsUrl = `${wsBaseUrl}/api/ws/quiz-sessions/${sessionId}?${queryParam}`;

    // Log connection attempt (without exposing token)
    const safeUrl = `${wsBaseUrl}/api/ws/quiz-sessions/${sessionId}?${isHost ? 'token' : 'guest_token'}=***`;
    console.log(`[WebSocket] Connecting as ${isHost ? 'HOST' : 'PARTICIPANT'} to:`, safeUrl);

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log(`[WebSocket] ✅ Connected successfully to session: ${sessionId}`);
      console.log(`[WebSocket] Protocol: ${ws.protocol}, Ready state: ${ws.readyState}`);
    };

    ws.onerror = (error) => {
      console.error('[WebSocket] ❌ Connection error:', error);
      console.error('[WebSocket] Session ID:', sessionId);
      console.error('[WebSocket] Role:', isHost ? 'HOST' : 'PARTICIPANT');
    };

    ws.onclose = (event) => {
      console.log(`[WebSocket] 🔌 Disconnected from session: ${sessionId}`);
      console.log(`[WebSocket] Close code: ${event.code}, reason: ${event.reason || 'None'}`);
      console.log(`[WebSocket] Clean closure: ${event.wasClean}`);
    };

    return ws;
  }
};

export default quizService;

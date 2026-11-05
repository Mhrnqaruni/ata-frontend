// Wraps /api/chatbot for the assistant: list, create, open and delete chats, find them by entity, download a report.
// Area: chat

import apiClient, { apiError } from './api';

const chatService = {
  /**
   * Fetches the list of all past chat session summaries for the user.
   * @returns {Promise<Array>} A promise that resolves to an array of session summary objects.
   */
  getChatSessions: async () => {
    try {
      const response = await apiClient.get('/api/chatbot/sessions');
      return response.data;
    } catch (error) {
      console.error('Error fetching chat sessions:', error);
      throw apiError(error, 'Failed to load chat history.');
    }
  },

  /**
   * Creates a new chat session with an initial message and optional context.
   * @param {string} firstMessage - The user's first message in the new chat.
   * @param {string|null} fileId - An optional ID of a file to associate with the first message.
   * @param {object|null} context - Optional context object with page_context, entity_type, entity_id, entity_name
   * @returns {Promise<object>} A promise that resolves to an object containing the new sessionId.
   */
  createNewChatSession: async (firstMessage, fileId = null, context = null) => {
    try {
      // Build payload with context fields if provided
      const payload = {
        firstMessage: firstMessage,
        fileId: fileId,
      };

      // Add context fields if provided
      if (context) {
        if (context.pageContext) payload.pageContext = context.pageContext;
        if (context.entityType) payload.entityType = context.entityType;
        if (context.entityId) payload.entityId = context.entityId;
        if (context.entityName) payload.entityName = context.entityName;
      }

      const response = await apiClient.post('/api/chatbot/sessions', payload);
      return response.data; // Expected to be { sessionId: "..." }
    } catch (error) {
      console.error('Error creating new chat session:', error);
      throw apiError(error, 'Failed to start new chat.');
    }
  },

  // Add inside the chatService object
  deleteChatSession: async (sessionId) => {
    try {
      // A DELETE request returns no content on success (204)
      await apiClient.delete(`/api/chatbot/sessions/${sessionId}`);
    } catch (error) {
      console.error('Error deleting chat session:', error);
      throw apiError(error, 'Failed to delete chat.');
    }
  },

  getChatSessionDetails: async (sessionId) => {
    try {
      const response = await apiClient.get(`/api/chatbot/sessions/${sessionId}`);
      return response.data; // Expected to be the full ChatSessionDetail object
    } catch (error) {
      console.error('Error fetching chat session details:', error);
      throw apiError(error, 'Failed to load chat session.');
    }
  },

  // Past chats about one class, student or quiz, for the floating assistant's history menu.
  getChatSessionsByEntity: async (entityType, entityId) => {
    try {
      const response = await apiClient.get('/api/chatbot/sessions/by-entity', {
        params: { entity_type: entityType, entity_id: entityId },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching entity chat sessions:', error);
      throw apiError(error, 'Failed to load chat history.');
    }
  },

  downloadChatReport: async (sessionId, fileName = null) => {
    try {
      const response = await apiClient.get(`/api/chatbot/sessions/${sessionId}/export-report`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || `chat_report_${sessionId}.docx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading chat report:', error);
      throw apiError(error, 'Failed to download report.');
    }
  },
};

export default chatService;

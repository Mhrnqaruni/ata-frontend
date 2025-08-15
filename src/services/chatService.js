// /ata-frontend/src/services/chatService.js

import apiClient from './api';

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
      console.error("Error fetching chat sessions:", error);
      throw new Error(error.response?.data?.detail || "Failed to load chat history.");
    }
  },

  /**
   * Creates a new chat session with an initial message.
   * @param {string} firstMessage - The user's first message in the new chat.
   * @param {string|null} fileId - An optional ID of a file to associate with the first message.
   * @returns {Promise<object>} A promise that resolves to an object containing the new sessionId.
   */
  createNewChatSession: async (firstMessage, fileId = null) => {
    try {
      // --- [THE FIX IS HERE] ---
      // The payload now uses camelCase keys, matching the Pydantic model.
      const payload = {
        firstMessage: firstMessage,
        fileId: fileId,
      };
      // --- [END OF FIX] ---
      const response = await apiClient.post('/api/chatbot/sessions', payload);
      return response.data; // Expected to be { sessionId: "..." }
    } catch (error) {
      console.error("Error creating new chat session:", error);
      throw new Error(error.response?.data?.detail || "Failed to start new chat.");
    }
  },

  /**
   * Uploads a file for use in the chat.
   * @param {File} fileObject - The file to upload.
   * @returns {Promise<object>} A promise that resolves to an object containing the fileId.
   */
  uploadFile: async (fileObject) => {
    const formData = new FormData();
    formData.append('file', fileObject);

    try {
      const response = await apiClient.post('/api/chatbot/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data; // Expected to be { file_id: "..." }
    } catch (error) {
      console.error("Error uploading file:", error);
      throw new Error(error.response?.data?.detail || "Failed to upload file.");
    }
  },


  // Add inside the chatService object
  deleteChatSession: async (sessionId) => {
    try {
      // A DELETE request returns no content on success (204)
      await apiClient.delete(`/api/chatbot/sessions/${sessionId}`);
    } catch (error) {
      console.error("Error deleting chat session:", error);
      throw new Error(error.response?.data?.detail || "Failed to delete chat.");
    }
  },


  getChatSessionDetails: async (sessionId) => {
    try {
      const response = await apiClient.get(`/api/chatbot/sessions/${sessionId}`);
      return response.data; // Expected to be the full ChatSessionDetail object
    } catch (error) {
      console.error("Error fetching chat session details:", error);
      throw new Error(error.response?.data?.detail || "Failed to load chat session.");
    }
  },
};





export default chatService;
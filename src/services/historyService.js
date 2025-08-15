// /src/services/historyService.js

import apiClient from './api';

const historyService = {
  /**
   * Saves a completed AI generation to the user's history.
   * @param {object} payload - The data to save.
   * @returns {Promise<object>} The saved generation record.
   */
  saveGeneration: async (payload) => {
    try {
      const response = await apiClient.post('/api/history', payload);
      return response.data;
    } catch (error) {
      console.error("Error saving generation:", error);
      const errorMessage = error.response?.data?.detail || "Could not save the generation. Please try again.";
      throw new Error(errorMessage);
    }
  },

  /**
   * Fetches the AI generation history from the backend.
   * @param {object} params - Optional query parameters like { search, tool_id }.
   * @returns {Promise<object>} The history response object.
   */
  getHistory: async (params = {}) => {
    try {
      const response = await apiClient.get('/api/history', { params });
      return response.data;
    } catch (error) {
      console.error("Error fetching history:", error);
      const errorMessage = error.response?.data?.detail || "An error occurred while fetching your saved generations.";
      throw new Error(errorMessage);
    }
  },

  // --- [START] NEW DELETE FUNCTION ---
  /**
   * Deletes a specific generation record from the user's history.
   * @param {string} generationId - The ID of the history record to delete.
   * @returns {Promise<void>} A promise that resolves on successful deletion.
   */
  deleteGeneration: async (generationId) => {
    try {
      // The DELETE request is sent to the specific resource URL.
      // A successful 204 response from the backend will resolve this promise.
      await apiClient.delete(`/api/history/${generationId}`);
    } catch (error) {
      console.error(`Error deleting generation ${generationId}:`, error);
      const errorMessage = error.response?.data?.detail || "Could not delete the saved item. Please try again.";
      throw new Error(errorMessage);
    }
  },
  // --- [END] NEW DELETE FUNCTION ---
};

export default historyService;
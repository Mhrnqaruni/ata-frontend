// /src/services/libraryService.js

import apiClient from './api';

const libraryService = {
  /**
   * Fetches the entire book library structure from the backend.
   * This is designed to be called once and the result cached by the frontend.
   * @returns {Promise<Array>} A promise that resolves to the hierarchical library tree object.
   */
  getTree: async () => {
    try {
      const response = await apiClient.get('/api/library/tree');
      return response.data;
    } catch (error) {
      console.error("Error fetching library tree:", error);
      // For this critical data, we throw a more specific error.
      const errorMessage = error.response?.data?.detail || "Could not load the curriculum library. Please try again later.";
      throw new Error(errorMessage);
    }
  },
};

export default libraryService;
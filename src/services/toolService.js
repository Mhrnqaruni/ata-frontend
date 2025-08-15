// /src/services/toolService.js

import apiClient from './api';

const toolService = {
  /**
   * Sends a request to the AI to generate content.
   * This function intelligently chooses the correct endpoint based on whether a file is provided.
   * @param {object} settingsPayload - The full settings object from the form state.
   * @param {File | null} sourceFile - The optional file to upload for context.
   * @returns {Promise<object>} A promise that resolves to the generation response object from the API.
   */
  generateContent: async (settingsPayload, sourceFile) => {
    try {
      if (sourceFile) {
        const formData = new FormData();
        formData.append('settings', JSON.stringify(settingsPayload));
        formData.append('source_file', sourceFile);
        
        const config = { headers: { 'Content-Type': 'multipart/form-data' } };
        const response = await apiClient.post('/api/tools/generate/upload', formData, config);
        return response.data;
      } else {
        const response = await apiClient.post('/api/tools/generate/text', settingsPayload);
        return response.data;
      }
    } catch (error) {
      console.error("Error generating content:", error);
      const errorMessage = error.response?.data?.detail || "An unexpected server error occurred.";
      throw new Error(errorMessage);
    }
  },
};

export default toolService;
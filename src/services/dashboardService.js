// /src/services/dashboardService.js

// --- Core Imports ---
// Import the single, configured apiClient instance.
// We do NOT import the raw 'axios' library here.
import apiClient from './api';

/**
 * A service object that encapsulates all API calls related to the main dashboard.
 * This is the abstraction layer between our components and the raw HTTP requests.
 */
const dashboardService = {
  /**
   * Fetches the summary of high-level statistics from the backend.
   *
   * @returns {Promise<object>} A promise that resolves to an object containing
   *                            the dashboard data (e.g., { classCount, studentCount }).
   */
  getSummary: async () => {
    try {
      // Use the apiClient to make a GET request to the specific endpoint.
      // The base URL ('http://localhost:8000') is already configured in apiClient.
      const response = await apiClient.get('/api/dashboard/summary');
      
      // Axios automatically parses the JSON, so we can directly return the data.
      return response.data;
    } catch (error) {
      // Log the technical error for developer debugging.
      console.error("Error fetching dashboard summary:", error);

      // Extract a user-friendly message from the backend's structured error response.
      // If none is available, provide a generic fallback message.
      const errorMessage = error.response?.data?.detail || "Could not connect to the server. Please try again later.";
      
      // CRITICAL: Re-throw the error with the user-friendly message so the calling
      // page component can catch it and update the UI state accordingly.
      throw new Error(errorMessage);
    }
  },
};

// Export the service object for use in our page components.
export default dashboardService;
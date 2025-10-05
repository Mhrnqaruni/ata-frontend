// /src/services/adminService.js

import apiClient from './api';

/**
 * Service for admin dashboard operations
 */
const adminService = {
  /**
   * Fetches comprehensive dashboard data
   * @returns {Promise<object>} Dashboard data with all database statistics
   */
  getDashboardData: async () => {
    try {
      const response = await apiClient.get('/api/admin/dashboard');
      return response.data;
    } catch (error) {
      console.error("Error fetching admin dashboard data:", error);
      throw new Error(error.response?.data?.detail || "Failed to fetch dashboard data");
    }
  },
};

export default adminService;

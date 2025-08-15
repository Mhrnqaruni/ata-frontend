// /src/services/classService.js (FINAL, COMPLETE VERSION)

import apiClient from './api';

const classService = {
  // --- CLASS CRUD METHODS ---
  getAllClasses: async () => {
    try {
      const response = await apiClient.get('/api/classes');
      // Ensure we always return an array, even if the API response is faulty.
      return response.data || [];
    } catch (error) {
      console.error("Error fetching classes:", error);
      const errorMessage = error.response?.data?.detail || "Could not load classes.";
      throw new Error(errorMessage);
    }
  },
  getClassById: async (classId) => {
    try {
      const response = await apiClient.get(`/api/classes/${classId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching class details for ID ${classId}:`, error);
      const errorMessage = error.response?.data?.detail || "Could not load class details.";
      throw new Error(errorMessage);
    }
  },
  createClass: async (classData) => {
    try {
      const response = await apiClient.post('/api/classes', classData);
      return response.data;
    } catch (error) {
      console.error("Error creating class:", error);
      const errorMessage = error.response?.data?.detail || "Failed to create the class.";
      throw new Error(errorMessage);
    }
  },
  createClassWithUpload: async (className, file) => {
    const formData = new FormData();
    formData.append('name', className);
    formData.append('file', file);
    try {
      const response = await apiClient.post('/api/classes/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });
      return response.data;
    } catch (error) {
      console.error("Error uploading roster:", error);
      if (error.code === 'ECONNABORTED') {
        throw new Error("The upload is taking longer than expected and timed out. Please check the file or try again.");
      }
      const errorMessage = error.response?.data?.detail || "Failed to upload and process the roster file.";
      throw new Error(errorMessage);
    }
  },
  updateClass: async (classId, classData) => {
    try {
      const response = await apiClient.put(`/api/classes/${classId}`, classData);
      return response.data;
    } catch (error) {
      console.error(`Error updating class ${classId}:`, error);
      const errorMessage = error.response?.data?.detail || "Failed to update the class.";
      throw new Error(errorMessage);
    }
  },
  deleteClass: async (classId) => {
    try {
      await apiClient.delete(`/api/classes/${classId}`);
    } catch (error) {
      console.error(`Error deleting class ${classId}:`, error);
      const errorMessage = error.response?.data?.detail || "Failed to delete the class.";
      throw new Error(errorMessage);
    }
  },
  exportClassRoster: async (classId) => {
    try {
      const response = await apiClient.get(`/api/classes/${classId}/export`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const contentDisposition = response.headers['content-disposition'];
      let fileName = `roster_${classId}.csv`;
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
        if (fileNameMatch && fileNameMatch.length === 2) fileName = fileNameMatch[1];
      }
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(`Error exporting roster for class ${classId}:`, error);
      throw new Error("Failed to export the roster. Please try again.");
    }
  },
  // --- STUDENT CRUD METHODS ---
  addStudentToClass: async (classId, studentData) => {
    try {
      const response = await apiClient.post(`/api/classes/${classId}/students`, studentData);
      return response.data;
    } catch (error) {
      console.error(`Error adding student to class ${classId}:`, error);
      const errorMessage = error.response?.data?.detail || "Failed to add the student.";
      throw new Error(errorMessage);
    }
  },
  updateStudent: async (classId, studentId, studentData) => {
    try {
      const response = await apiClient.put(`/api/classes/${classId}/students/${studentId}`, studentData);
      return response.data;
    } catch (error) {
      console.error(`Error updating student ${studentId}:`, error);
      const errorMessage = error.response?.data?.detail || "Failed to update student details.";
      throw new Error(errorMessage);
    }
  },
  removeStudent: async (classId, studentId) => {
    try {
      await apiClient.delete(`/api/classes/${classId}/students/${studentId}`);
    } catch (error) {
      console.error(`Error removing student ${studentId} from class ${classId}:`, error);
      const errorMessage = error.response?.data?.detail || "Failed to remove the student.";
      throw new Error(errorMessage);
    }
  },
};
export default classService;
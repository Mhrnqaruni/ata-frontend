// Wraps the /api/classes endpoints: list, create, edit and delete classes, read, check and add class lists, export.
// Also adds, edits and removes a class's students, and refreshes cached roster data after each change.
// Area: academics

import { invalidateAfter, cacheFamilies } from './queryCache';

import apiClient from './api';

const classService = {
  // --- CLASS CRUD METHODS ---
  getAllClasses: async () => {
    try {
      const response = await apiClient.get('/api/classes');
      // Ensure we always return an array, even if the API response is faulty.
      return response.data || [];
    } catch (error) {
      console.error('Error fetching classes:', error);
      const errorMessage = error.response?.data?.detail || 'Could not load classes.';
      throw new Error(errorMessage);
    }
  },
  getClassById: async (classId) => {
    try {
      const response = await apiClient.get(`/api/classes/${classId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching class details for ID ${classId}:`, error);
      const errorMessage = error.response?.data?.detail || 'Could not load class details.';
      throw new Error(errorMessage);
    }
  },
  createClass: async (classData) => {
    try {
      const response = await apiClient.post('/api/classes', classData);
      return response.data;
    } catch (error) {
      console.error('Error creating class:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to create the class.';
      throw new Error(errorMessage);
    }
  },
  updateClass: async (classId, classData) => {
    try {
      const response = await apiClient.put(`/api/classes/${classId}`, classData);
      return response.data;
    } catch (error) {
      console.error(`Error updating class ${classId}:`, error);
      const errorMessage = error.response?.data?.detail || 'Failed to update the class.';
      throw new Error(errorMessage);
    }
  },
  deleteClass: async (classId) => {
    try {
      await apiClient.delete(`/api/classes/${classId}`);
    } catch (error) {
      console.error(`Error deleting class ${classId}:`, error);
      const errorMessage = error.response?.data?.detail || 'Failed to delete the class.';
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
      throw new Error('Failed to export the roster. Please try again.');
    }
  },
  // --- CLASS-LIST IMPORT (Phase 1.42): read each file, check the joined list, then add it in one call ---
  // Reads one class-list file with the AI; nothing is saved. A refused or failed read throws an Error with
  // `reason` (design §3.4): the server's code, too_large for a body the proxy refused, else ai_failed.
  readRosterFile: async (file, classId, signal) => {
    const body = new FormData();
    body.append('file', file);
    if (classId) body.append('class_id', classId);
    try {
      const response = await apiClient.post('/api/classes/imports/read', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
        signal,
      });
      return response.data;
    } catch (error) {
      const detail = error.response?.data?.detail;
      const reason = detail?.reason || (error.response?.status === 413 ? 'too_large' : 'ai_failed');
      throw Object.assign(new Error(detail?.message || 'The file could not be read.'), { reason });
    }
  },
  // Each row's state before anything is saved: in this class, or with no class for a new one.
  checkRoster: async (rows, classId) => {
    const url = classId ? `/api/classes/${classId}/imports/check` : '/api/classes/imports/check';
    return (await apiClient.post(url, { rows })).data;
  },
  // Adds the checked rows to a class; the same requestId again returns the saved outcome.
  commitRoster: async (classId, requestId, rows) =>
    (await apiClient.put(`/api/classes/${classId}/imports/${requestId}`, { rows })).data,
  // Makes a class and its students together or not at all: {class, outcome}.
  createClassWithRows: async (requestId, name, rows) =>
    (await apiClient.put(`/api/classes/imports/${requestId}`, { name, rows })).data,
  // --- STUDENT CRUD METHODS ---
  addStudentToClass: async (classId, studentData) => {
    try {
      const response = await apiClient.post(`/api/classes/${classId}/students`, studentData);
      return response.data;
    } catch (error) {
      console.error(`Error adding student to class ${classId}:`, error);
      const errorMessage = error.response?.data?.detail || 'Failed to add the student.';
      throw new Error(errorMessage);
    }
  },
  updateStudent: async (classId, studentId, studentData) => {
    try {
      const response = await apiClient.put(`/api/classes/${classId}/students/${studentId}`, studentData);
      return response.data;
    } catch (error) {
      console.error(`Error updating student ${studentId}:`, error);
      const errorMessage = error.response?.data?.detail || 'Failed to update student details.';
      throw new Error(errorMessage);
    }
  },
  removeStudent: async (classId, studentId) => {
    try {
      await apiClient.delete(`/api/classes/${classId}/students/${studentId}`);
    } catch (error) {
      console.error(`Error removing student ${studentId} from class ${classId}:`, error);
      const errorMessage = error.response?.data?.detail || 'Failed to remove the student.';
      throw new Error(errorMessage);
    }
  },
};
export default invalidateAfter(
  classService,
  [
    'createClass',
    'createClassWithRows',
    'commitRoster',
    'updateClass',
    'deleteClass',
    'addStudentToClass',
    'updateStudent',
    'removeStudent',
  ],
  cacheFamilies.roster
);

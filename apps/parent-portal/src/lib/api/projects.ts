/**
 * Projects API Service
 * Educational Note: These methods abstract the API calls for project management,
 * making them easier to use throughout the application and maintaining consistency.
 */

import { api } from './client';

export const PARENT_PROJECT_CONTEXT_STANDALONE = 'parent_standalone';
export const PARENT_PROJECT_CONTEXT_ATA_CHILD = 'ata_child';
export const PARENT_PROJECT_CONTEXT_MANUAL_LEARNER = 'manual_learner';

export interface ProjectRecord {
  id: string;
  name: string;
  description: string;
  linked_student_id?: string | null;
  linked_manual_learner_id?: string | null;
  linked_class_id?: string | null;
  context_type?: string | null;
  context_meta?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  last_accessed: string;
}

/**
 * Memory Types
 * Educational Note: Memory helps the AI maintain context across conversations.
 * User memory persists across all projects, project memory is specific to a project.
 */
export interface MemoryData {
  user_memory: string | null;
  project_memory: string | null;
}

/**
 * Cost Tracking Types
 * Educational Note: These types match the backend cost tracking structure.
 */
export interface ModelCostBreakdown {
  input_tokens: number;
  output_tokens: number;
  cost: number;
}

export interface CostTracking {
  total_cost: number;
  by_model: {
    sonnet: ModelCostBreakdown;
    haiku: ModelCostBreakdown;
  };
}

export interface ProjectContextData {
  linked_student_id?: string | null;
  linked_manual_learner_id?: string | null;
  linked_class_id?: string | null;
  context_type?: string | null;
  context_meta?: Record<string, unknown>;
}

export interface ProjectListResponse {
  success: boolean;
  projects: ProjectRecord[];
  count: number;
}

export interface ProjectResponse {
  success: boolean;
  project: ProjectRecord;
  message?: string;
}

export const isStandaloneParentProject = (project: ProjectRecord): boolean =>
  !project.linked_student_id && project.context_type === PARENT_PROJECT_CONTEXT_STANDALONE;

export const isAtaChildParentProject = (project: ProjectRecord): boolean =>
  Boolean(project.linked_student_id) &&
  (!project.context_type || project.context_type === PARENT_PROJECT_CONTEXT_ATA_CHILD);

export const isManualLearnerParentProject = (project: ProjectRecord): boolean =>
  Boolean(project.linked_manual_learner_id) &&
  project.context_type === PARENT_PROJECT_CONTEXT_MANUAL_LEARNER;

/**
 * Project API Methods
 */
export const projectsAPI = {
  // List all projects
  list: () => api.get<ProjectListResponse>('/projects'),

  // Create a new project
  create: (data: { name: string; description?: string } & ProjectContextData) =>
    api.post<ProjectResponse>('/projects', data),

  // Get a specific project
  get: (id: string) => api.get<ProjectResponse>(`/projects/${id}`),

  // Update a project
  update: (id: string, data: { name?: string; description?: string | null } & ProjectContextData) =>
    api.put<ProjectResponse>(`/projects/${id}`, data),

  // Delete a project
  delete: (id: string) => api.delete(`/projects/${id}`),

  // Open a project (mark as accessed)
  open: (id: string) => api.post<ProjectResponse>(`/projects/${id}/open`),

  // Get project cost tracking data
  getCosts: (id: string) => api.get(`/projects/${id}/costs`),

  // Get project memory data (user memory + project memory)
  getMemory: (id: string) => api.get(`/projects/${id}/memory`),

  // Update user and/or project memory (both fields optional)
  updateMemory: (id: string, data: { user_memory?: string; project_memory?: string }) =>
    api.put(`/projects/${id}/memory`, data),
};

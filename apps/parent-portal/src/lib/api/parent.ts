import { api } from './client';

export interface ParentLinkPermissions {
  can_view_quizzes: boolean;
  can_view_assessments: boolean;
  can_use_ai_tools_for_child: boolean;
}

export interface ParentIdentitySummary {
  id: string;
  email: string;
  full_name?: string | null;
}

export interface ParentDashboardChildSummary {
  student_id: string;
  student_school_id: string;
  student_name: string;
  class_ids: string[];
  class_names: string[];
  permissions: ParentLinkPermissions;
  quiz_count: number;
  assessment_count: number;
  latest_activity_at?: string | null;
  overall_average_percent?: number | null;
}

export interface ParentQuizSummaryItem {
  type: string;
  mode: string;
  session_id: string;
  participant_id?: string | null;
  quiz_id: string;
  quiz_title: string;
  class_id?: string | null;
  class_name?: string | null;
  status: string;
  total_score?: number | null;
  max_total_score: number;
  created_at?: string | null;
  score_percent?: number | null;
}

export interface ParentAssessmentSummaryItem {
  type: string;
  job_id: string;
  assessment_name: string;
  class_id?: string | null;
  class_name?: string | null;
  status: string;
  total_score?: number | null;
  max_total_score: number;
  created_at?: string | null;
  score_percent?: number | null;
}

export interface ParentClassPerformanceSummary {
  class_id: string;
  class_name: string;
  item_count: number;
  graded_count: number;
  average_percent?: number | null;
}

export interface ParentQuizSummaryResponse {
  child: ParentDashboardChildSummary;
  items: ParentQuizSummaryItem[];
  graded_count: number;
  pending_review_count: number;
  absent_count: number;
  average_percent?: number | null;
}

export interface ParentAssessmentSummaryResponse {
  child: ParentDashboardChildSummary;
  items: ParentAssessmentSummaryItem[];
  graded_count: number;
  pending_review_count: number;
  absent_count: number;
  average_percent?: number | null;
}

export interface ParentAnalyticsSummaryResponse {
  child: ParentDashboardChildSummary;
  performance_summary?: string | null;
  overall_average_percent?: number | null;
  overall_grade?: number | null;
  graded_count: number;
  pending_review_count: number;
  absent_count: number;
  total_quizzes: number;
  total_assessments: number;
  latest_activity_at?: string | null;
  class_performance: ParentClassPerformanceSummary[];
}

export interface ParentWorkspacePolicy {
  allowed_tools: string[];
  child_ids_with_ai_access: string[];
  can_use_child_context_tools: boolean;
  can_use_standalone_workspaces: boolean;
  manual_learner_ids_with_ai_access: string[];
}

export interface ParentBootstrapPayload {
  parent: ParentIdentitySummary;
  children: ParentDashboardChildSummary[];
  default_child_id?: string | null;
  workspace_policy: ParentWorkspacePolicy;
}

export interface ParentProfileSettings {
  phone?: string | null;
  preferred_contact_method?: string | null;
}

export interface ParentLinkSummary {
  id: string;
  parent_user_id: string;
  parent_email: string;
  parent_full_name?: string | null;
  parent_phone?: string | null;
  student_id: string;
  student_school_id: string;
  student_name: string;
  relationship_type?: string | null;
  is_primary_contact: boolean;
  can_view_quizzes: boolean;
  can_view_assessments: boolean;
  can_use_ai_tools_for_child: boolean;
  created_at: string;
  updated_at: string;
}

export interface ParentConnectionRequest {
  id: string;
  parent_user_id: string;
  parent_email: string;
  student_lookup_value: string;
  requested_relationship_type?: string | null;
  message?: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParentManualLearner {
  id: string;
  parent_user_id: string;
  display_name: string;
  nickname?: string | null;
  grade_level?: string | null;
  notes?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ParentBootstrapResponse extends ParentBootstrapPayload {
  success: boolean;
}

export interface ParentChildrenResponse {
  success: boolean;
  children: ParentDashboardChildSummary[];
}

export interface ParentChildSummaryResponse {
  success: boolean;
  child?: ParentDashboardChildSummary | null;
  quiz_summary?: ParentQuizSummaryResponse | null;
  assessment_summary?: ParentAssessmentSummaryResponse | null;
  analytics?: ParentAnalyticsSummaryResponse | null;
}

export const EMPTY_PARENT_WORKSPACE_POLICY: ParentWorkspacePolicy = {
  allowed_tools: [],
  child_ids_with_ai_access: [],
  can_use_child_context_tools: false,
  can_use_standalone_workspaces: false,
  manual_learner_ids_with_ai_access: [],
};

export const parentAPI = {
  async getBootstrap(): Promise<ParentBootstrapResponse> {
    const response = await api.get('/ata/bootstrap');
    return response.data as ParentBootstrapResponse;
  },

  async getChildren(): Promise<ParentChildrenResponse> {
    const response = await api.get('/ata/children');
    return response.data as ParentChildrenResponse;
  },

  async getChildSummary(studentId: string): Promise<ParentChildSummaryResponse> {
    const response = await api.get(`/ata/children/${studentId}/summary`);
    return response.data as ParentChildSummaryResponse;
  },

  async getProfile(): Promise<{ success: boolean; profile: ParentProfileSettings | null }> {
    const response = await api.get('/ata/parent/profile');
    return response.data as { success: boolean; profile: ParentProfileSettings | null };
  },

  async updateProfile(payload: ParentProfileSettings): Promise<{ success: boolean; profile: ParentProfileSettings }> {
    const response = await api.patch('/ata/parent/profile', payload);
    return response.data as { success: boolean; profile: ParentProfileSettings };
  },

  async getLinks(): Promise<{ success: boolean; links: ParentLinkSummary[] }> {
    const response = await api.get('/ata/parent/links');
    return response.data as { success: boolean; links: ParentLinkSummary[] };
  },

  async getConnectionRequests(): Promise<{ success: boolean; requests: ParentConnectionRequest[] }> {
    const response = await api.get('/ata/parent/connection-requests');
    return response.data as { success: boolean; requests: ParentConnectionRequest[] };
  },

  async createConnectionRequest(payload: {
    student_lookup_value: string;
    requested_relationship_type?: string;
    message?: string;
  }): Promise<{ success: boolean; request: ParentConnectionRequest }> {
    const response = await api.post('/ata/parent/connection-requests', payload);
    return response.data as { success: boolean; request: ParentConnectionRequest };
  },

  async cancelConnectionRequest(requestId: string): Promise<{ success: boolean; request: ParentConnectionRequest }> {
    const response = await api.delete(`/ata/parent/connection-requests/${requestId}`);
    return response.data as { success: boolean; request: ParentConnectionRequest };
  },

  async getManualLearners(): Promise<{ success: boolean; manual_learners: ParentManualLearner[] }> {
    const response = await api.get('/ata/parent/manual-learners');
    return response.data as { success: boolean; manual_learners: ParentManualLearner[] };
  },

  async createManualLearner(payload: {
    display_name: string;
    nickname?: string;
    grade_level?: string;
    notes?: string;
    is_active?: boolean;
  }): Promise<{ success: boolean; manual_learner: ParentManualLearner }> {
    const response = await api.post('/ata/parent/manual-learners', payload);
    return response.data as { success: boolean; manual_learner: ParentManualLearner };
  },

  async updateManualLearner(
    learnerId: string,
    payload: Partial<{
      display_name: string;
      nickname: string;
      grade_level: string;
      notes: string;
      is_active: boolean;
    }>,
  ): Promise<{ success: boolean; manual_learner: ParentManualLearner }> {
    const response = await api.patch(`/ata/parent/manual-learners/${learnerId}`, payload);
    return response.data as { success: boolean; manual_learner: ParentManualLearner };
  },

  async deleteManualLearner(learnerId: string): Promise<{ success: boolean }> {
    const response = await api.delete(`/ata/parent/manual-learners/${learnerId}`);
    return response.data as { success: boolean };
  },
};

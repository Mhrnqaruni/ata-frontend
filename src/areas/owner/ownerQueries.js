// The admin panel's reads as React Query hooks, one per owner API route, keyed by its query (SOT-12, SOT-13).
// A page keeps its last answer while the next loads, so changing the range or a page only dims it.
// Area: owner

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ownerGet } from './ownerApi';

function useOwnerRead(name, path, params = {}, options = {}) {
  return useQuery({
    queryKey: ['owner', name, path, params],
    queryFn: () => ownerGet(path, params),
    placeholderData: keepPreviousData,
    staleTime: 30000,
    retry: (count, error) => count < 1 && error?.response?.status !== 404,
    ...options,
  });
}

export const useOverview = (query) => useOwnerRead('overview', '/overview', query);
export const useAiSummary = (query) => useOwnerRead('ai-summary', '/ai/summary', query);
export const useAiTasks = (query) => useOwnerRead('ai-tasks', '/ai/tasks', query);
export const useAiTask = (kind, id) =>
  useOwnerRead('ai-task', `/ai/tasks/${encodeURIComponent(kind)}/${encodeURIComponent(id)}`);
export const usePrices = (enabled) => useOwnerRead('prices', '/prices', {}, { enabled, staleTime: 600000 });
export const useProblems = (query) => useOwnerRead('problems', '/problems', query);
export const useUsers = (query) => useOwnerRead('users', '/users', query);
export const useUser = (id, query) => useOwnerRead('user', `/users/${encodeURIComponent(id)}`, query);
export const useOrganizations = (query) => useOwnerRead('organizations', '/organizations', query);
export const useAssessments = (query) => useOwnerRead('assessments', '/assessments', query);
export const useAssessment = (id) => useOwnerRead('assessment', `/assessments/${encodeURIComponent(id)}`);
export const useReadings = (assessment, result, enabled) =>
  useOwnerRead(
    'readings',
    `/assessments/${encodeURIComponent(assessment)}/answers/${encodeURIComponent(result)}/readings`,
    {},
    { enabled }
  );
export const useSearch = (q) => useOwnerRead('search', '/search', { q }, { enabled: q.trim().length >= 2 });
export const useAccess = (query) => useOwnerRead('access', '/access-events', query);

// Where a problem's row goes: its task's log, or, for a record with no AI task, its assessment or its owner.
export function problemLink(problem) {
  if (problem.opens === 'assessment') return `/owner/assessments/${encodeURIComponent(problem.task_id)}`;
  if (problem.opens === 'user') return problem.user_id ? `/owner/users/${problem.user_id}` : null;
  return taskLink(problem.task_kind, problem.task_id);
}

export const taskLink = (kind, id) => `/owner/ai/tasks/${encodeURIComponent(kind)}/${encodeURIComponent(id)}`;

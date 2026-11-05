// Loads the Home chart's grade rows for all completed and pending-review assessments in one summary call.
// Area: analytics

import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { sessionGeneration } from '../../services/queryCache';
import api from '../../services/api';
import { buildPerformanceSeries } from './performanceData';

// The finished assessments' id, status, name and date, as one string: empty until the list arrives.
function listSignature(assessments) {
  if (!assessments) return '';
  return JSON.stringify(
    assessments
      .filter((job) => ['Completed', 'Pending Review'].includes(job.status))
      .map((job) => [job.id, job.status, job.assessmentName, job.createdAt])
      .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
  );
}

// The chart's call starts with the page, beside the list's (QA-1): the summary picks the finished assessments and
// gives their dates itself. It has no timer and no focus reload. A change in the list's polls reloads it, but the
// list's first arrival doesn't, so a page load makes one chart call.
export default function usePerformance(assessments) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const generation = sessionGeneration();
  const userId = user?.id;
  const signature = listSignature(assessments);
  const seen = useRef('');
  useEffect(() => {
    if (!signature) return;
    if (seen.current && seen.current !== signature) {
      queryClient.invalidateQueries({ queryKey: ['teacher', generation, userId, 'performance'] });
    }
    seen.current = signature;
  }, [signature, queryClient, generation, userId]);
  const query = useQuery({
    queryKey: ['teacher', generation, userId, 'performance'],
    enabled: Boolean(userId),
    // Returning to the tab doesn't reload it either (R2: only a changed list does).
    refetchOnWindowFocus: false,
    queryFn: async ({ signal }) => {
      const { data } = await api.get('/api/assessments/performance', { signal });
      return buildPerformanceSeries(data.assessments ?? []);
    },
  });
  const inaccessible = [403, 404].includes(query.error?.response?.status);
  const data = inaccessible ? undefined : query.data;
  return {
    loading: query.isPending,
    error: !data && Boolean(query.error),
    refreshError: Boolean(data && query.error),
    retry: query.refetch,
    latest: null,
    items: [],
    ...data,
  };
}

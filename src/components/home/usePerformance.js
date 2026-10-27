import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { sessionGeneration } from '../../services/queryCache';
import api from '../../services/api';
import { buildPerformanceSeries } from './performanceData';

// Stable inputs stop unchanged status polls from reloading every grade overview.
// Three workers bound the burst; one failure rejects the whole aggregate.
export default function usePerformance(assessments) {
  const { user } = useAuth();
  const jobs = (assessments || []).filter(job => ['Completed', 'Pending Review'].includes(job.status));
  const signature = jobs.map(job => [job.id, job.status, job.assessmentName, job.createdAt]).sort((a,b) => String(a[0]).localeCompare(String(b[0])));
  const query = useQuery({ queryKey: ['teacher', sessionGeneration(), user?.id, 'performance', signature],
    enabled: Boolean(user?.id) && assessments !== null,
    refetchInterval: 60000, refetchIntervalInBackground: false,
    queryFn: async ({ signal }) => {
      let cursor = 0;
      let failed = false;
      const results = [];
      async function worker() {
        while (!failed && !signal.aborted && cursor < jobs.length) {
          const job = jobs[cursor++];
          try {
            const { data } = await api.get(`/api/assessments/${job.id}/overview`, { signal });
            results.push({ ...job, students: data.students ?? [] });
          } catch (error) { failed = true; throw error; }
        }
      }
      await Promise.all(Array.from({ length: Math.min(3, jobs.length) }, worker));
      if (signal.aborted) throw new Error('Cancelled performance read');
      return buildPerformanceSeries(results);
    },
  });
  const inaccessible = [403, 404].includes(query.error?.response?.status);
  const data = inaccessible ? undefined : query.data;
  return { loading: query.isPending, error: !data && Boolean(query.error),
    refreshError: Boolean(data && query.error), retry: query.refetch,
    latest: null, items: [], ...data };
}

import { useEffect, useState } from 'react';
import reviewService from '../../services/reviewService';
import { buildPerformanceSeries } from './performanceData';

// Existing read-only results endpoint; three concurrent requests avoid a request burst.
// A failed overview never produces a misleading partial "overall" average.
export default function usePerformance(assessments) {
  const [state, setState] = useState({ loading: true, error: false, latest: null, items: [] });
  useEffect(() => {
    if (assessments === null) return;
    let cancelled = false;
    const jobs = assessments.filter(job => ['Completed', 'Pending Review'].includes(job.status));
    setState({ loading: true, error: false, latest: null, items: [] });
    const results = [];
    let cursor = 0;
    async function worker() {
      while (!cancelled && cursor < jobs.length) {
        const job = jobs[cursor++];
        const overview = await reviewService.getResultsOverview(job.id);
        results.push({ ...job, students: overview.students });
      }
    }
    Promise.all(Array.from({ length: Math.min(3, jobs.length) }, worker))
      .then(() => { if (!cancelled) setState({ loading: false, error: false, ...buildPerformanceSeries(results) }); })
      .catch(() => { if (!cancelled) { cancelled = true; setState({ loading: false, error: true, latest: null, items: [] }); } });
    return () => { cancelled = true; };
  }, [assessments]);
  return state;
}

// React Query hooks for the teacher's classes, assessments, quick assessments, quizzes, summary and tags.
// They poll while jobs run, load each quiz's latest session and prefetch a page when its menu item is hovered.
// Area: platform

import { useEffect, useRef } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import api from '../services/api';
import { queryClient, sessionGeneration, invalidateTeacher, cacheFamilies } from '../services/queryCache';

const paths = {
  classes: '/api/classes',
  assessments: '/api/assessments',
  quick: '/api/quick-assessments',
  quizzes: '/api/quizzes',
  summary: '/api/dashboard/summary',
  tags: '/api/tags',
};
const activeAssessment = (job) => ['Queued', 'Processing', 'Summarizing'].includes(job.status);
const activeQuick = (job) => ['queued', 'running'].includes(job.status);
// Builds the query settings (key, URL, polling) for one kind of teacher data, e.g. classes or assessments.
export function teacherOptions(userId, family, id) {
  const path = family === 'class' ? `/api/classes/${encodeURIComponent(id)}` : paths[family];
  if (!path) throw new Error(`Unknown teacher read: ${family}`);
  return {
    queryKey: ['teacher', sessionGeneration(), userId, family, ...(id ? [id] : [])],
    queryFn: async ({ signal, meta }) => {
      // A hover prefetch names the page it's for, so the UI log gives the call to that page's view (QA-15).
      const { data } = await api.get(path, { signal, mstPrefetchFor: meta?.mstPrefetchFor });
      return family === 'assessments' ? data.assessments : family === 'quick' ? data.preparations : data;
    },
    refetchInterval: (query) =>
      family === 'assessments'
        ? query.state.data?.some(activeAssessment)
          ? 5000
          : 15000
        : family === 'quick'
          ? query.state.data?.some(activeQuick)
            ? 5000
            : 15000
          : 60000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: ['assessments', 'quick'].includes(family) ? 'always' : true,
  };
}
export function useTeacherData(family, id) {
  const { user } = useAuth();
  const query = useQuery({ ...teacherOptions(user?.id, family, id), enabled: Boolean(user?.id) });
  const previous = useRef(null);
  // Workers finish without an HTTP mutation in this tab. Refresh dependent views
  // when the observed status/membership changes, not on every polling allocation.
  useEffect(() => {
    if (!query.data || !['assessments', 'quick'].includes(family)) return;
    const signature = query.data
      .map((row) => `${row.id}:${row.status}`)
      .sort()
      .join('|');
    if (previous.current !== null && previous.current !== signature) {
      void invalidateTeacher(
        family === 'quick' ? ['assessments', 'class', 'summary', 'performance'] : ['class', 'summary', 'performance']
      );
    }
    previous.current = signature;
  }, [family, query.data]);
  const inaccessible = [403, 404].includes(query.error?.response?.status);
  return { ...query, data: inaccessible ? undefined : query.data };
}

export function quizSessionOptions(userId, quiz) {
  const prefix = quiz.settings?.mode === 'self_paced' ? 'quiz-sp-sessions' : 'quiz-sessions';
  return {
    queryKey: ['teacher', sessionGeneration(), userId, 'quizSession', prefix, quiz.id],
    enabled: Boolean(userId) && quiz.status === 'published',
    staleTime: 15000,
    // Completed/draft cards have no session action; do not poll historical quizzes.
    refetchInterval: (query) => (['active', 'draft', 'waiting'].includes(query.state.data?.status) ? 15000 : 60000),
    refetchIntervalInBackground: false,
    queryFn: async ({ signal }) => {
      try {
        return (await api.get(`/api/${prefix}/quiz/${quiz.id}/latest`, { signal })).data;
      } catch (error) {
        if (error.response?.status === 404) return null;
        throw error;
      }
    },
  };
}
export function useQuizSessions(quizzes) {
  const { user } = useAuth();
  return useQueries({ queries: quizzes.map((quiz) => quizSessionOptions(user?.id, quiz)) });
}
export function useNavigationPrefetch() {
  const { user } = useAuth();
  return (path) => {
    if (!user?.id || navigator.connection?.saveData) return;
    const families =
      { '/': ['summary'], '/classes': ['classes'], '/assessments': ['assessments', 'quick'], '/quizzes': ['quizzes'] }[
        path
      ] || [];
    const meta = { mstPrefetchFor: path }; // only this fetch: the page's own refetches pass their own options
    families.forEach((family) => void queryClient.prefetchQuery({ ...teacherOptions(user.id, family), meta }));
  };
}

// The results page's reads as React Query hooks (Phase 1.46, SOT-7), on the area's shared keys: the quiz, its runs,
// a run's summary and extras, and the walk-in records that matching needs, fetched only when used.
// Area: quizzes

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../hooks/useAuth';
import { quizKeys } from '../queries';
import * as results from './api';
import { isOpen } from './figures';

const OPEN_REFRESH_MS = 15000; // an open run's results change while pupils answer
const LOOKUP_STALE_MS = 60000;

// A key under the quiz's runs, so the app's refreshes after a quiz or run changes reach it (queries.js, quizSession).
const runPart = (userId, quizId, runId, part) => [...quizKeys.runs(userId, quizId), String(runId), part];

export function useQuiz(quizId) {
  const { user } = useAuth();
  return useQuery({
    queryKey: quizKeys.quiz(user?.id, quizId),
    queryFn: ({ signal }) => results.getQuiz(quizId, { signal }),
    enabled: Boolean(user?.id && quizId),
  });
}

export function useRuns(quizId) {
  const { user } = useAuth();
  return useQuery({
    queryKey: quizKeys.runs(user?.id, quizId),
    queryFn: ({ signal }) => results.getRuns(quizId, { signal }),
    enabled: Boolean(user?.id && quizId),
  });
}

// One run's summary. Choosing another class keeps the run's figures on screen until the new ones arrive; an open
// run refreshes itself.
export function useSummary(quizId, run, classId) {
  const { user } = useAuth();
  return useQuery({
    queryKey: quizKeys.summary(user?.id, quizId, run?.id, classId),
    queryFn: ({ signal }) => results.getSummary(quizId, run.id, classId, { signal }),
    enabled: Boolean(user?.id && run),
    placeholderData: (previous) => (previous?.run_id === run?.id ? previous : undefined),
    refetchInterval: (query) => (isOpen(query.state.data) ? OPEN_REFRESH_MS : false),
  });
}

// A live run's marks waiting and a post quiz's before-and-after; a homework run needs it only for a post quiz.
export function useExtras(quizId, run, quiz) {
  const { user } = useAuth();
  const wanted = Boolean(run && quiz && (run.kind === 'live' || quiz.quiz_phase === 'post'));
  return useQuery({
    queryKey: runPart(user?.id, quizId, run?.id, 'extras'),
    queryFn: ({ signal }) => results.getExtras(run.kind, run.id, { signal }),
    enabled: Boolean(user?.id) && wanted,
  });
}

// What a walk-in's match needs, looked up once per run on first use.
export function useRunLookups(quizId, run) {
  const client = useQueryClient();
  const { user } = useAuth();
  const cached = (part, read) =>
    client.fetchQuery({ queryKey: runPart(user?.id, quizId, run.id, part), queryFn: read, staleTime: LOOKUP_STALE_MS });
  return {
    // A walk-in's record id, which matching wants, or null.
    async walkInRecord(walkIn) {
      const records = await cached('walk-ins', () => results.walkInRecords(run.kind, run.id));
      return records[walkIn.id] ?? null;
    },
  };
}

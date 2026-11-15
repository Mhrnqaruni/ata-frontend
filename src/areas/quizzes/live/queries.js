// The teacher's live page reads, as React Query hooks (SOT-16): the run, its classes, who is in it and one question's
// answer counts. They sit in the quizSession family, so the app's refreshes after a quiz changes reach them.
// Area: quizzes

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../hooks/useAuth';
import { sessionGeneration } from '../../../services/queryCache';
import { quizKeys } from '../queries';
import { getAnswerCounts, getPeople, getRun, getRuns } from './api';

const liveKey = (userId, ...rest) => ['teacher', sessionGeneration(), userId, 'quizSession', 'live', ...rest];

// The run, read once: the socket tells the page what changes after that.
export function useRun(sessionId) {
  const { user } = useAuth();
  return useQuery({
    queryKey: liveKey(user?.id, 'run', String(sessionId)),
    queryFn: ({ signal }) => getRun(sessionId, { signal }),
    enabled: Boolean(user?.id && sessionId),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

// This run's classes, from the quiz's runs (the results page reads the same list).
export function useRunClasses(quizId, runId) {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: quizKeys.runs(user?.id, quizId),
    queryFn: ({ signal }) => getRuns(quizId, { signal }),
    enabled: Boolean(user?.id && quizId),
    staleTime: 60000,
  });
  return (query.data || []).find((item) => String(item.id) === String(runId))?.classes || [];
}

// Who is in the run. The socket's joins refresh it; a slow poll covers a missed message.
export function usePeople(sessionId, hasClassList) {
  const { user } = useAuth();
  return useQuery({
    queryKey: liveKey(user?.id, 'people', String(sessionId)),
    queryFn: ({ signal }) => getPeople(sessionId, { hasClassList, signal }),
    enabled: Boolean(user?.id && sessionId),
    refetchInterval: 20000,
    refetchIntervalInBackground: false,
  });
}

// One question's answer counts, read once when its answers show (LV7), and again each time its typed answers' marks
// arrive (round, from C2's marks_pending turning false), so the count follows them without a reload.
export function useAnswerCounts(sessionId, questionId, enabled, round = 0) {
  const { user } = useAuth();
  return useQuery({
    queryKey: liveKey(user?.id, 'counts', String(sessionId), String(questionId), round),
    queryFn: ({ signal }) => getAnswerCounts(sessionId, questionId, { signal }),
    enabled: Boolean(user?.id && sessionId && questionId && enabled),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

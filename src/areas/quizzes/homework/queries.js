// The teacher's homework page reads, as React Query hooks (SOT-10, SOT-16): the run, its summary and who has opened
// it, refreshed every 10 s while it's open (SP1), and one pupil's answers. All in the quizSession family.
// Area: quizzes

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../hooks/useAuth';
import { sessionGeneration } from '../../../services/queryCache';
import { quizKeys } from '../queries';
import { getHomework, getProgress, getPupilAnswers, getQuiz, getRuns, getSummary } from './api';

const LIVE_EVERY_MS = 10000;
const homeworkKey = (userId, ...rest) => ['teacher', sessionGeneration(), userId, 'quizSession', 'homework', ...rest];

export function useHomework(sessionId) {
  const { user } = useAuth();
  return useQuery({
    queryKey: homeworkKey(user?.id, 'run', String(sessionId)),
    queryFn: ({ signal }) => getHomework(sessionId, { signal }),
    enabled: Boolean(user?.id && sessionId),
  });
}

// The summary, on the key the results page shares; every 10 s while pupils can still hand in.
export function useSummary(quizId, sessionId, open) {
  const { user } = useAuth();
  return useQuery({
    queryKey: quizKeys.summary(user?.id, quizId, sessionId),
    queryFn: ({ signal }) => getSummary(quizId, sessionId, { signal }),
    enabled: Boolean(user?.id && quizId && sessionId),
    refetchInterval: open ? LIVE_EVERY_MS : false,
    refetchIntervalInBackground: false,
  });
}

export function useProgress(sessionId, open) {
  const { user } = useAuth();
  return useQuery({
    queryKey: homeworkKey(user?.id, 'progress', String(sessionId)),
    queryFn: ({ signal }) => getProgress(sessionId, { signal }),
    enabled: Boolean(user?.id && sessionId),
    refetchInterval: open ? LIVE_EVERY_MS : false,
    refetchIntervalInBackground: false,
  });
}

// This run's line in the quiz's runs (the results page reads the same list): its close time.
export function useRunLine(quizId, runId) {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: quizKeys.runs(user?.id, quizId),
    queryFn: ({ signal }) => getRuns(quizId, { signal }),
    enabled: Boolean(user?.id && quizId),
    staleTime: 60000,
  });
  return (query.data || []).find((item) => String(item.id) === String(runId)) || null;
}

export function usePupilAnswers(sessionId, studentId) {
  const { user } = useAuth();
  return useQuery({
    queryKey: homeworkKey(user?.id, 'answers', String(sessionId), String(studentId)),
    queryFn: ({ signal }) => getPupilAnswers(sessionId, studentId, { signal }),
    enabled: Boolean(user?.id && sessionId && studentId),
  });
}

// Each question's options by question id, from the quiz (on the key the editor shares), to say a pupil's choice in
// its words. A question the teacher has since removed has none, and the answer shows as its letter.
export function useQuizOptions(quizId) {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: quizKeys.quiz(user?.id, quizId),
    queryFn: ({ signal }) => getQuiz(quizId, { signal }),
    enabled: Boolean(user?.id && quizId),
    staleTime: 60000,
  });
  return Object.fromEntries(
    (query.data?.questions || []).map((question) => [String(question.id), question.options || []])
  );
}

// The quiz review page's reads as React Query hooks (Phase 1.47 S4.2): one pupil's answers, read again every 3 s while
// an AI comment is being written, and the run's summary, shared with the results page and read here on a reload.
// Area: quizzes

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../hooks/useAuth';
import { quizKeys } from '../queries';
import { getAnswers, getSummary } from './api';

const WRITING_MS = 3000; // SOT-5: while any comment is "writing", C3 is read again every 3 s
const WORKING_MS = 15000; // while the pupil still works, as the results page refreshes an open run

const writing = (data) => (data?.questions ?? []).some((question) => question.answer?.comment_state === 'writing');

// Under the quiz's runs, so the app's refreshes after a mark changes (cacheFamilies.quiz) reach it too.
const answersKey = (userId, quizId, runId, pupilId) => [
  ...quizKeys.runs(userId, quizId),
  String(runId),
  'pupil',
  String(pupilId),
];

export function useAnswers(quizId, runId, pupilId) {
  const { user } = useAuth();
  return useQuery({
    queryKey: answersKey(user?.id, quizId, runId, pupilId),
    queryFn: ({ signal }) => getAnswers(quizId, runId, pupilId, { signal }),
    enabled: Boolean(user?.id && quizId && runId && pupilId),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (writing(data)) return WRITING_MS;
      return data && !data.pupil?.finished ? WORKING_MS : false;
    },
  });
}

// The run's summary for all its classes, under the results page's own key, so a visit from the results is instant
// and a reload or a shared link reads it (QA N-4).
export function useRunSummary(quizId, runId) {
  const { user } = useAuth();
  return useQuery({
    queryKey: quizKeys.summary(user?.id, quizId, runId, null),
    queryFn: ({ signal }) => getSummary(quizId, runId, { signal }),
    enabled: Boolean(user?.id && quizId && runId),
  });
}

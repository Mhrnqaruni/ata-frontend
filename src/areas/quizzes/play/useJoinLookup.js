// Which quiz a pupil's code opens, for "Joining Year 9 Cells · Ms Patel" (SOT-8): the lookup /join already made, or
// one read here. A plain read, not a cached query: the app's sign-in reset clears the cache as a pupil page first opens.
// Area: quizzes

import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { lookupJoin } from '../api/join';

// { data, error }: data is { kind, quiz_title, teacher_name }; error carries the server's sentence and its status
// (404 "This quiz has finished." or "No quiz has this code…").
export function useJoinLookup(code) {
  const given = useLocation().state?.lookup;
  const [result, setResult] = useState(() => (given ? { data: given } : {}));
  useEffect(() => {
    if (given || !code) return undefined;
    const controller = new AbortController();
    lookupJoin(code, { signal: controller.signal }).then(
      (data) => setResult({ data }),
      (error) => {
        if (!controller.signal.aborted) setResult({ error });
      }
    );
    return () => controller.abort();
  }, [code, given]);
  return result;
}

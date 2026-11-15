// The teacher's live buttons (SOT-9): Start quiz, Show answers, Next question and Finish, one at a time, each with its
// own failure in words beside it. The socket shows what each one changed.
// Area: quizzes

import { useCallback, useRef, useState } from 'react';
import { finishQuiz, nextQuestion, showAnswers, startQuiz } from './api';
import { actionError } from './words';

const CALLS = { start: startQuiz, reveal: showAnswers, next: nextQuestion, finish: finishQuiz };

// { press(action), busy, error, lastClosed }: busy is the action running. Show answers on the last question answers
// 422 "No more questions remaining" once it's closed (Q13); lastClosed then turns true, so the page offers Finish.
export function useHostActions(sessionId, { onFinished } = {}) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [lastClosed, setLastClosed] = useState(false);
  const running = useRef(false);
  const press = useCallback(
    async (action, { last = false } = {}) => {
      const call = CALLS[action];
      if (!call || running.current) return;
      running.current = true;
      setBusy(action);
      setError(null);
      try {
        await call(sessionId);
        if (action === 'finish') onFinished?.();
      } catch (failure) {
        if (action === 'reveal' && last && failure.status === 422) setLastClosed(true);
        else setError(actionError(failure));
      } finally {
        running.current = false;
        setBusy(null);
      }
    },
    [sessionId, onFinished]
  );
  return { press, busy, error, lastClosed, clearError: () => setError(null) };
}

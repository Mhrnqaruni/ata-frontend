// A question that arrives with the Notebook's address (C-14): a result's Ask about this or Explain in chat puts it in
// the history's state, and the Notebook takes it once, so a Refresh never sends it again.
// Area: family

import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Calls `take(question)` once `ready` (the chat has loaded, so one to send is sent), then forgets the question in this
 * history entry. A question is { text, id, send? }.
 */
export default function useArrivingQuestion(ready, take) {
  const location = useLocation();
  const navigate = useNavigate();
  const question = location.state?.suggestion;
  useEffect(() => {
    if (!question || !ready) return;
    take(question);
    navigate(`${location.pathname}${location.search}`, {
      replace: true,
      state: { ...location.state, suggestion: undefined },
    });
  }, [question, ready, take, location.pathname, location.search, location.state, navigate]);
}

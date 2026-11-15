// The old results addresses, /quizzes/:quizId/analytics and /quizzes/sp-sessions/:sessionId/analytics, forward to a
// quiz's one results address, /quizzes/:quizId/results, with ?run= for a homework run, so old links work (SOT-7).
// Area: quizzes

import { useEffect, useState } from 'react';
import { Alert, Box } from '@mui/material';
import { Navigate, useParams } from 'react-router-dom';
import quizSPService from '../../services/quizSPService';

export default function OldResultsAddress() {
  const { quizId, sessionId } = useParams();
  const [target, setTarget] = useState(null);
  const [error, setError] = useState(null);
  // A homework run's old address names only the run, so its quiz comes from the run.
  useEffect(() => {
    if (quizId) return undefined;
    let current = true;
    quizSPService.getSPSession(sessionId).then(
      (run) => current && setTarget(`/quizzes/${run.quiz_id}/results?run=${encodeURIComponent(sessionId)}`),
      (failure) => current && setError(failure.message || "Couldn't open these results.")
    );
    return () => {
      current = false;
    };
  }, [quizId, sessionId]);

  if (quizId) return <Navigate replace to={`/quizzes/${quizId}/results`} />;
  if (target) return <Navigate replace to={target} />;
  if (error) return <Alert severity="error">{error}</Alert>;
  return (
    <Box role="status" sx={{ py: 3 }}>
      Opening the results…
    </Box>
  );
}

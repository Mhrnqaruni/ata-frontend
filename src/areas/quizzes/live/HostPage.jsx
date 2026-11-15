// The teacher's live quiz page at /quizzes/sessions/:sessionId/host (SOT-9; design.md §3.7): it loads the run, then
// shows the live room. A finished run opens its results instead.
// Area: quizzes

import { Alert, Box, Button, Paper, Skeleton } from '@mui/material';
import { Navigate, useParams } from 'react-router-dom';
import HostRoom from './HostRoom';
import { useRun } from './queries';
import { FINISHED } from './roomState';
import { LIVE } from './words';

export default function HostPage() {
  const { sessionId } = useParams();
  const run = useRun(sessionId);
  if (run.isError) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" onClick={() => run.refetch()}>
            {LIVE.tryAgain}
          </Button>
        }
      >
        {run.error?.message || LIVE.loadFailed}
      </Alert>
    );
  }
  if (!run.data) return <HostSkeleton />;
  if (FINISHED.includes(run.data.status)) {
    return <Navigate replace to={`/quizzes/${run.data.quiz_id}/results?run=${encodeURIComponent(run.data.id)}`} />;
  }
  return <HostRoom key={run.data.id} run={run.data} />;
}

// Loading: the header's place, the strip and a question card's outline (design.md §4).
function HostSkeleton() {
  return (
    <Box role="status" aria-label="Loading the quiz" sx={{ display: 'grid', gap: 2 }}>
      <Skeleton variant="text" width="40%" height={44} />
      <Skeleton variant="rounded" height={64} sx={{ borderRadius: '16px' }} />
      <Paper className="mst-rim" sx={{ p: 3, borderRadius: '20px', display: 'grid', gap: 2 }}>
        <Skeleton variant="text" width={120} />
        <Skeleton variant="text" width="70%" height={40} />
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          {[0, 1, 2, 3].map((item) => (
            <Skeleton key={item} variant="rounded" height={72} sx={{ borderRadius: '16px' }} />
          ))}
        </Box>
      </Paper>
    </Box>
  );
}

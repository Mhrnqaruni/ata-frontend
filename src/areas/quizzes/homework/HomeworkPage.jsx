// The teacher's homework page at /quizzes/sp-sessions/:sessionId/host (SOT-10; design.md §3.10): it loads the run,
// then shows who has handed in, who is working on it and who hasn't started.
// Area: quizzes

import { Alert, Box, Button, Paper, Skeleton } from '@mui/material';
import { useParams } from 'react-router-dom';
import HomeworkRoom from './HomeworkRoom';
import { useHomework } from './queries';
import { HOMEWORK } from './words';

export default function HomeworkPage() {
  const { sessionId } = useParams();
  const run = useHomework(sessionId);
  if (run.isError) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" onClick={() => run.refetch()}>
            {HOMEWORK.tryAgain}
          </Button>
        }
      >
        {run.error?.message || HOMEWORK.loadFailed}
      </Alert>
    );
  }
  if (!run.data) return <HomeworkSkeleton />;
  return <HomeworkRoom key={run.data.id} run={run.data} onRunChanged={() => run.refetch()} />;
}

// Loading: the header's place, the counters as dashes and the list's outline (design.md §4).
function HomeworkSkeleton() {
  return (
    <Box role="status" aria-label="Loading the homework" sx={{ display: 'grid', gap: 2 }}>
      <Skeleton variant="text" width="40%" height={44} />
      <Paper
        className="mst-rim"
        sx={{ p: 3, borderRadius: '20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}
      >
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} variant="text" height={56} />
        ))}
      </Paper>
      <Skeleton variant="rounded" height={240} sx={{ borderRadius: '20px' }} />
    </Box>
  );
}

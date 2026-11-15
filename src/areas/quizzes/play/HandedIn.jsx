// Proof of handing in (design.md §3.12; SP9): "Handed in to Ms Patel · Fri 14 Nov, 11:52", the score only when the
// teacher shows it, See my answers only when feedback is on (else, kindly, later), and Done.
// Area: quizzes

import { useState } from 'react';
import { Alert, Box, Button, Paper, Typography } from '@mui/material';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import AnswerReview from './AnswerReview';
import { getHomeworkReview } from './api';
import { PLAY, handedInWhen } from './words';

// run: the join answer (its settings decide what shows); result: the hand-in answer, or { submitted_at } when the pupil
// came back after handing in; teacher: the teacher's name from the join lookup.
export default function HandedIn({ run, result, teacher }) {
  const navigate = useNavigate();
  const [reviewing, setReviewing] = useState(false);
  const feedbackOn = run.settings?.show_answer_feedback !== false;
  const review = useQuery({
    queryKey: ['quizPupil', run.session_id, 'homeworkReview'],
    queryFn: () => getHomeworkReview(run.session_id, run.student_token),
    enabled: reviewing && feedbackOn,
    staleTime: Infinity,
    retry: false,
  });
  if (reviewing && review.data) return <AnswerReview review={review.data} onBack={() => setReviewing(false)} />;
  const when = result?.submitted_at ? handedInWhen(result.submitted_at) : '';
  // Never null as 0: the score shows only when the server sent one.
  const scored = Number.isFinite(result?.final_score) && Number.isFinite(result?.total_possible_points);
  return (
    <Paper
      className="mst-rim"
      sx={{ p: 3, mt: 3, borderRadius: '20px', display: 'grid', gap: 1.5, textAlign: 'center' }}
      data-mst="pupil-handed-in"
    >
      <CheckCircleRounded aria-hidden="true" sx={{ fontSize: 48, color: 'var(--mst-ok-ink)', justifySelf: 'center' }} />
      <Typography
        component="h1"
        sx={{ fontFamily: 'var(--font-display)', fontSize: 24, lineHeight: '30px', fontWeight: 600 }}
      >
        {when ? PLAY.handedIn(teacher, when) : PLAY.handedInBare}
      </Typography>
      {scored ? (
        <Typography sx={{ fontSize: 17, lineHeight: '24px', fontVariantNumeric: 'tabular-nums' }}>
          {PLAY.yourPoints(result.final_score, result.total_possible_points)}
        </Typography>
      ) : null}
      {review.isError ? (
        <Alert severity="info">{review.error?.status === 403 ? PLAY.later : PLAY.reviewFailed}</Alert>
      ) : null}
      <Box sx={{ display: 'grid', gap: 1, mt: 1 }}>
        {feedbackOn ? (
          <Button
            variant="outlined"
            size="large"
            onClick={() => setReviewing(true)}
            disabled={reviewing && review.isPending}
          >
            {PLAY.seeAnswers}
          </Button>
        ) : (
          <Typography sx={{ fontSize: 15, lineHeight: '24px', color: 'var(--mst-ink-2)' }}>{PLAY.later}</Typography>
        )}
        <Button
          variant="contained"
          size="large"
          onClick={() => navigate('/join', { replace: true })}
          sx={{ minHeight: 56 }}
        >
          {PLAY.done}
        </Button>
      </Box>
    </Paper>
  );
}

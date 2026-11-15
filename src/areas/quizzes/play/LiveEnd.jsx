// The end of a live quiz (Phase 1.47 design.md §3.5; ST13, ST14): "You got 26 of 40 points", the kinds of answers, a
// kind word, See my answers, and the top 5 if shown: places only above 0 points (1, 1, 3), else "You: 0 points".
// Area: quizzes

import { useState } from 'react';
import { Alert, Box, Button, Paper, Skeleton, Typography } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import EmojiEventsRounded from '@mui/icons-material/EmojiEventsRounded';
import { useQuery } from '@tanstack/react-query';
import { ordinal } from '../live/words';
import AnswerReview from './AnswerReview';
import { getLiveReview } from './api';
import { answerKinds, placed } from './playState';
import { PLAY } from './words';

const pop = keyframes`
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: none; }
`;

// place: the pupil's place; end: { showResults, showLeaderboard }; leaderboard: the top 5 the socket sent.
export default function LiveEnd({ place, end, leaderboard }) {
  const [reviewing, setReviewing] = useState(false);
  const review = useQuery({
    queryKey: ['quizPupil', place.session.id, 'review'],
    queryFn: () => getLiveReview(place.session.id, place.guestToken),
    enabled: Boolean(end?.showResults),
    staleTime: Infinity,
  });
  if (reviewing && review.data) return <AnswerReview review={review.data} onBack={() => setReviewing(false)} />;
  const data = review.data;
  const scored = data && !data.marking_pending;
  const places = end?.showLeaderboard ? placed(leaderboard) : [];
  return (
    <Box sx={{ display: 'grid', gap: 2, pt: 3 }}>
      {!end?.showResults ? (
        <Paper className="mst-rim" sx={{ p: 3, borderRadius: '20px', textAlign: 'center' }}>
          <Typography sx={{ fontFamily: 'var(--font-display)', fontSize: 24, lineHeight: '30px', fontWeight: 600 }}>
            {PLAY.allDone}
          </Typography>
          <Typography sx={{ mt: 1, fontSize: 15, lineHeight: '24px', color: 'var(--mst-ink-2)' }}>
            {PLAY.answersWithTeacher}
          </Typography>
        </Paper>
      ) : review.isPending ? (
        <Skeleton variant="rounded" height={140} sx={{ borderRadius: '20px' }} />
      ) : review.isError ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" onClick={() => review.refetch()}>
              {PLAY.tryAgain}
            </Button>
          }
        >
          {PLAY.reviewFailed}
        </Alert>
      ) : (
        <Paper
          className="mst-rim"
          data-mst="pupil-end"
          sx={{
            p: 3,
            borderRadius: '20px',
            textAlign: 'center',
            display: 'grid',
            gap: 1,
            animation: `${pop} 300ms var(--mst-ease) both`,
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }}
        >
          {scored ? (
            <Score data={data} />
          ) : (
            <Typography sx={{ fontSize: 17, lineHeight: '24px' }}>{PLAY.markingPending}</Typography>
          )}
          <Button
            variant="contained"
            size="large"
            onClick={() => setReviewing(true)}
            sx={{ mt: 1, minHeight: 56, fontSize: 17 }}
          >
            {PLAY.seeAnswers}
          </Button>
        </Paper>
      )}
      {places.length ? (
        <TopFive entries={places} you={place.participant?.id} myScore={ownScore(leaderboard, place, data)} />
      ) : null}
    </Box>
  );
}

// "You got 26 of 40 points", then what kind each answer was, then a kind word. Never a missing score as 0: without a
// total, only how many were right.
function Score({ data }) {
  const points = Number.isFinite(data.total_score) && Number.isFinite(data.max_possible_score);
  const kinds = PLAY.answerKinds(answerKinds(data.reviews));
  const above = data.total_score > 0 || (!points && data.correct_count > 0);
  return (
    <>
      <Typography
        sx={{
          fontFamily: 'var(--font-display)',
          fontSize: 22,
          lineHeight: '30px',
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {points
          ? PLAY.yourPoints(data.total_score, data.max_possible_score)
          : PLAY.rightLine(data.correct_count, data.total_questions)}
      </Typography>
      {kinds ? (
        <Typography sx={{ fontSize: 14, lineHeight: '20px', color: 'var(--mst-ink-2)' }}>{kinds}</Typography>
      ) : null}
      <Typography sx={{ mt: 1, fontSize: 17, lineHeight: '24px', fontWeight: 500 }}>
        {above ? PLAY.wellDone : PLAY.goodTry}
      </Typography>
    </>
  );
}

// This pupil's score for the top 5's last line: their own row if the server sent one, else their review's total.
function ownScore(leaderboard, place, data) {
  const mine = leaderboard.find((entry) => String(entry.participant_id) === String(place.participant?.id));
  const score = mine ? Number(mine.score) : data?.total_score;
  return Number.isFinite(score) ? score : null;
}

// The top 5 (only pupils above 0 points), places shared on equal scores (from the server), a medal for the first three,
// this pupil marked, and "You: 0 points" under the list for a pupil at 0, who has no place.
function TopFive({ entries, you, myScore }) {
  const listed = entries.some((entry) => String(entry.participant_id) === String(you));
  return (
    <Paper className="mst-rim" sx={{ p: 2.5, borderRadius: '20px' }} aria-label={PLAY.top5}>
      <Typography component="h2" sx={{ fontSize: 14, lineHeight: '20px', fontWeight: 600, mb: 1 }}>
        {PLAY.top5}
      </Typography>
      <Box component="ol" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 1 }}>
        {entries.map((entry, index) => {
          const mine = String(entry.participant_id) === String(you);
          const place = entry.rank || index + 1;
          return (
            <Box
              component="li"
              key={entry.participant_id}
              sx={{
                display: 'grid',
                gridTemplateColumns: '48px minmax(0, 1fr) auto',
                alignItems: 'center',
                gap: 1,
                fontSize: 15,
                fontWeight: mine ? 600 : 400,
              }}
            >
              <Box
                component="span"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  color: 'var(--mst-ink-2)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {place <= 3 ? <EmojiEventsRounded aria-hidden="true" sx={{ fontSize: 16 }} /> : null}
                {ordinal(place)}
              </Box>
              <Box component="span" sx={{ overflowWrap: 'anywhere' }}>
                {entry.display_name}
                {mine ? ` (${PLAY.you})` : ''}
              </Box>
              <Box component="span" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {entry.score}
              </Box>
            </Box>
          );
        })}
      </Box>
      {!listed && myScore === 0 ? (
        <Typography sx={{ mt: 1.5, fontSize: 14, lineHeight: '20px', color: 'var(--mst-ink-2)' }}>
          {PLAY.youPoints(0)}
        </Typography>
      ) : null}
    </Paper>
  );
}

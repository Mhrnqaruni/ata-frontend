// A pupil's own answers after the quiz or handing in (design.md §3.5, "See my answers"): each answer or "No
// answer", right or wrong with points, the right answer, the comment and "Your teacher changed this" (C5).
// Area: quizzes

import { Box, Button, Paper, Typography } from '@mui/material';
import CheckRounded from '@mui/icons-material/CheckRounded';
import MathTextDisplay from '../../../components/common/MathTextDisplay';
import { givenAnswers } from './playState';
import { PLAY } from './words';

const words = (value) => givenAnswers(value).map(String).join(', ');

// review: the server's { reviews: [{ question_number, question_text, question_type, student_answer, correct_answer,
// is_correct, points_earned, max_points, marking_status, explanation, comment, marked_by }] }, where any point field
// may be null (the score hidden, or a mark still to come); onBack returns to the end screen.
export default function AnswerReview({ review, onBack }) {
  return (
    <Box sx={{ display: 'grid', gap: 1.5, pb: 2 }}>
      <Typography
        component="h1"
        sx={{ fontFamily: 'var(--font-display)', fontSize: 24, lineHeight: '30px', fontWeight: 600 }}
      >
        {PLAY.seeAnswers}
      </Typography>
      {(review?.reviews || []).map((item, index) => (
        <ReviewItem key={`${item.question_number}-${index}`} item={item} />
      ))}
      <Button variant="outlined" size="large" onClick={onBack} sx={{ mt: 1, minHeight: 48 }}>
        {PLAY.back}
      </Button>
    </Box>
  );
}

function ReviewItem({ item }) {
  const theirs = words(item.student_answer);
  const right = words(item.correct_answer);
  const poll = item.question_type === 'poll';
  const line = { fontSize: 14, lineHeight: '20px', overflowWrap: 'break-word' };
  return (
    <Paper className="mst-rim" sx={{ p: 2, borderRadius: '16px', display: 'grid', gap: 0.75 }} data-mst="pupil-review">
      <Typography sx={{ fontSize: 12, lineHeight: '16px', fontWeight: 600, color: 'var(--mst-ink-2)' }}>
        {PLAY.questionOf(item.question_number)}
      </Typography>
      <Typography
        component="div"
        sx={{ fontSize: 15, lineHeight: '24px', fontWeight: 500, overflowWrap: 'break-word' }}
      >
        <MathTextDisplay text={item.question_text} />
      </Typography>
      <Typography component="div" sx={line}>
        {PLAY.yourAnswer}: {theirs ? <MathTextDisplay text={theirs} /> : PLAY.noAnswer}
      </Typography>
      {poll ? null : <Verdict item={item} answered={Boolean(theirs)} />}
      {item.is_correct === false && right && !poll ? (
        <Typography component="div" sx={{ ...line, color: 'var(--mst-ink-2)' }}>
          {PLAY.rightAnswer}: <MathTextDisplay text={right} />
        </Typography>
      ) : null}
      {item.marked_by === 'teacher' ? (
        <Typography sx={{ fontSize: 12, lineHeight: '16px', fontWeight: 600, color: 'var(--mst-accent-ink)' }}>
          {PLAY.teacherChanged}
        </Typography>
      ) : null}
      {item.comment ? (
        <Typography
          component="div"
          sx={{ ...line, px: 1.5, py: 1, borderRadius: '12px', bgcolor: 'var(--mst-well)' }}
          data-mst="pupil-comment"
        >
          <MathTextDisplay text={item.comment} />
        </Typography>
      ) : null}
      {item.explanation ? (
        <Typography component="div" sx={{ ...line, color: 'var(--mst-ink-2)' }}>
          {PLAY.explanation}: <MathTextDisplay text={item.explanation} />
        </Typography>
      ) : null}
    </Paper>
  );
}

// Right, partly right, not quite or waiting for a mark, with "9 of 10 points" when the run shows points.
function Verdict({ item, answered }) {
  if (item.marking_status === 'pending') {
    return (
      <Typography sx={{ fontSize: 14, lineHeight: '20px', color: 'var(--mst-ink-2)' }}>{PLAY.waitingMark}</Typography>
    );
  }
  const points = item.points_earned;
  const max = item.max_points;
  const shown = Number.isFinite(points) && Number.isFinite(max);
  const partly = shown && points > 0 && points < max;
  const label = !answered ? null : partly ? PLAY.partlyRight : item.is_correct ? PLAY.rightWord : PLAY.notQuiteWord;
  const parts = [label, shown ? PLAY.pointsOf(points, max) : null].filter(Boolean);
  if (!parts.length) return null;
  return (
    <Typography
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        fontSize: 14,
        lineHeight: '20px',
        fontWeight: 600,
        fontVariantNumeric: 'tabular-nums',
        color: item.is_correct && answered ? 'var(--mst-ok-ink)' : 'var(--mst-ink-2)',
      }}
    >
      {item.is_correct && answered ? <CheckRounded aria-hidden="true" sx={{ fontSize: 16 }} /> : null}
      {parts.join(' · ')}
    </Typography>
  );
}

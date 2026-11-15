// When a live question closes (Phase 1.47 design.md §3.5; ST5, ST6): right or wrong if the teacher shows it; a
// typed answer at Close or Same meaning says "Checking your answer…" until marked, then its points. Then what's next.
// Area: quizzes

import { Box, Paper, Typography } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import { secondsLeft } from '../live/liveClock';
import { useNow } from '../live/useNow';
import MathTextDisplay from '../../../components/common/MathTextDisplay';
import { closedOutcome } from './playState';
import { PLAY } from './words';

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
`;

// question: the closed question; feedback: the server's right or wrong, or null when the teacher hides it; answered:
// whether this pupil's answer went in; movesOnAt: moving on by itself.
export default function LiveClosed({ question, feedback, answered, movesOnAt }) {
  const now = useNow(movesOnAt != null, 500);
  const outcome = closedOutcome(question, feedback, answered);
  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
      <Typography sx={{ fontSize: 12, lineHeight: '16px', fontWeight: 600, color: 'var(--mst-ink-2)' }}>
        {PLAY.questionOf(question.order_index + 1)}
      </Typography>
      <Box sx={{ flex: 1, display: 'grid', alignContent: 'center', gap: 2 }}>
        <Paper
          className="mst-rim"
          role="status"
          sx={{ p: 3, borderRadius: '20px', textAlign: 'center', display: 'grid', gap: 1, justifyItems: 'center' }}
          data-mst="pupil-closed"
          data-tone={outcome.tone}
        >
          {outcome.tone === 'right' ? (
            <CheckCircleRounded aria-hidden="true" sx={{ fontSize: 48, color: 'var(--mst-ok-ink)' }} />
          ) : null}
          {outcome.tone === 'waiting' ? (
            <Box
              aria-hidden="true"
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: 'var(--mst-accent)',
                animation: `${pulse} 1.2s ease-in-out infinite`,
                '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
              }}
            />
          ) : null}
          <Typography sx={{ fontSize: 22, lineHeight: '28px', fontWeight: 600, overflowWrap: 'break-word' }}>
            {outcome.title}
          </Typography>
          {outcome.line ? (
            <Typography
              component="div"
              sx={{ fontSize: 17, lineHeight: '24px', color: 'var(--mst-ink-2)', overflowWrap: 'break-word' }}
            >
              <MathTextDisplay text={outcome.line} />
            </Typography>
          ) : null}
          {feedback && !feedback.pending && outcome.tone !== 'plain' ? (
            <Explanation text={feedback.ai_feedback || feedback.explanation} />
          ) : null}
        </Paper>
        <Typography
          aria-live="polite"
          sx={{ fontSize: 15, lineHeight: '24px', textAlign: 'center', color: 'var(--mst-ink-2)' }}
        >
          {movesOnAt != null ? PLAY.nextIn(secondsLeft(movesOnAt, now)) : PLAY.nextSoon}
        </Typography>
      </Box>
    </Box>
  );
}

function Explanation({ text }) {
  if (!text) return null;
  return (
    <Typography component="div" sx={{ mt: 0.5, fontSize: 15, lineHeight: '24px', color: 'var(--mst-ink-2)' }}>
      <MathTextDisplay text={text} />
    </Typography>
  );
}

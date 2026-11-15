// A question's top on a pupil's phone, live and homework (Phase 1.47 design.md §3.5): "Question 3 of 12" with its
// points line and something on the right (the timer ring, or All questions), then the question, scrolling past 4 lines.
// Area: quizzes

import { Box, Typography } from '@mui/material';
import MathTextDisplay from '../../../components/common/MathTextDisplay';
import { config } from '../../../config';
import { PLAY } from './words';

// number and total: "Question 3 of 12" (total may be unknown); points: the points line, or null; aside: the right-hand
// part; text: the question; mediaUrl: its picture; note: a small line under the points (homework's due time).
export default function QuestionTop({ number, total, points, aside = null, text, mediaUrl, note = null }) {
  return (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          minHeight: 56,
          mb: 1,
          flex: 'none',
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 12, lineHeight: '16px', fontWeight: 600, color: 'var(--mst-ink-2)' }}>
            {PLAY.questionOf(number, total)}
          </Typography>
          {points ? (
            <Typography sx={{ fontSize: 14, lineHeight: '20px', fontWeight: 500 }} data-mst="pupil-points">
              {points}
            </Typography>
          ) : null}
          {note ? (
            <Typography sx={{ fontSize: 12, lineHeight: '16px', color: 'var(--mst-ink-2)' }}>{note}</Typography>
          ) : null}
        </Box>
        {aside}
      </Box>
      {/* Past 4 lines the question scrolls in its own area, so the answers stay on screen. */}
      <Typography
        component="h1"
        sx={{
          flex: 'none',
          fontFamily: 'var(--font-display)',
          fontSize: 22,
          lineHeight: '30px',
          fontWeight: 600,
          maxHeight: 120,
          overflowY: 'auto',
          overflowWrap: 'break-word',
          mb: 2,
        }}
      >
        <MathTextDisplay text={text} />
      </Typography>
      {mediaUrl ? (
        <Box
          component="img"
          src={`${config.apiBaseUrl}${mediaUrl}`}
          alt=""
          sx={{
            display: 'block',
            flex: 'none',
            maxWidth: '100%',
            maxHeight: 180,
            borderRadius: '12px',
            mb: 2,
            mx: 'auto',
          }}
        />
      ) : null}
    </>
  );
}

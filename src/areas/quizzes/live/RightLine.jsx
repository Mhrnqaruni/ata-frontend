// How many got a closed question right, on the live page and Present (design.md §3.4; C2, C9): "Marking typed
// answers…" while the AI marks, then "2 of 2 right · 1 with part points", or, after a failed marking, how many wait.
// Area: quizzes

import { Box, Typography } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import AiSparkle from './AiSparkle';
import { rightLine } from './answers';
import { LIVE } from './words';

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const line = { fontSize: 17, lineHeight: '24px', color: 'var(--mst-ink-2)', fontVariantNumeric: 'tabular-nums' };

// marking: the typed answers wait for the AI (C2's marks_pending); counts: the question's analytics once read;
// answered: how many answered it.
export default function RightLine({ marking, counts, answered }) {
  if (marking) {
    return (
      <Box role="status" sx={{ ...line, display: 'flex', alignItems: 'center', gap: 1 }} data-mst="live-marking">
        <AiSparkle pulse />
        {LIVE.marking}
      </Box>
    );
  }
  if (!counts) return null;
  return (
    <Typography
      role="status"
      data-mst="live-right"
      sx={{
        ...line,
        animation: `${fadeIn} 200ms var(--mst-ease) both`,
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}
    >
      {rightLine(counts, answered)}
    </Typography>
  );
}

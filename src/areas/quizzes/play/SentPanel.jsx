// A live answer that went (Phase 1.47 design.md §3.5, §6): a calm panel in the answers' space, with a ✓ in a green
// circle, "Sent", the answer in words and "Wait for your teacher". It scales in from 0.96 over 200 ms.
// Area: quizzes

import { Box, Typography } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import CheckRounded from '@mui/icons-material/CheckRounded';
import MathTextDisplay from '../../../components/common/MathTextDisplay';
import { PLAY } from './words';

const settle = keyframes`
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: none; }
`;

// answer: the answer in words, or '' when this tab doesn't know them (after getting back in).
export default function SentPanel({ answer }) {
  return (
    <Box
      role="status"
      data-mst="pupil-sent"
      sx={{
        flex: 1,
        display: 'grid',
        alignContent: 'center',
        justifyItems: 'center',
        gap: 1,
        py: 3,
        textAlign: 'center',
        animation: `${settle} 200ms var(--mst-ease) both`,
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}
    >
      <Box
        aria-hidden="true"
        sx={{
          display: 'grid',
          placeItems: 'center',
          width: 56,
          height: 56,
          borderRadius: '50%',
          bgcolor: 'color-mix(in srgb, var(--mst-ok) var(--mst-tint), transparent)',
          color: 'var(--mst-ok-ink)',
          mb: 1,
        }}
      >
        <CheckRounded sx={{ fontSize: 32 }} />
      </Box>
      <Typography component="p" sx={{ fontSize: 22, lineHeight: '28px', fontWeight: 600 }}>
        {PLAY.sentTitle}
      </Typography>
      {answer ? (
        <Typography
          component="div"
          sx={{
            fontSize: 17,
            lineHeight: '24px',
            color: 'var(--mst-ink-2)',
            overflowWrap: 'break-word',
            maxWidth: '100%',
          }}
        >
          <MathTextDisplay text={answer} />
        </Typography>
      ) : null}
      <Typography sx={{ fontSize: 14, lineHeight: '20px', color: 'var(--mst-ink-2)' }}>
        {PLAY.waitForTeacher}
      </Typography>
    </Box>
  );
}

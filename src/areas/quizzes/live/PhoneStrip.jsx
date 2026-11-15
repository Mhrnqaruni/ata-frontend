// The live page's strip at phone width (design.md §3.6): a 72 px glass bar kept on screen at the bottom, with a 40 px
// timer ring, "18 of 26 answered" and the main button (44 px), or a timed run's small control in its place.
// Area: quizzes

import { Alert, Box, Typography } from '@mui/material';
import CheckRounded from '@mui/icons-material/CheckRounded';
import TimerRing from './TimerRing';
import { LIVE } from './words';

const line = { fontSize: 14, lineHeight: '20px', fontVariantNumeric: 'tabular-nums', overflowWrap: 'normal' };

// seconds and limit: the clock; split: who answered; everyone: all have; choice: timedChoice()'s; control: the main
// button or the small control; error and onClearError: the last button's failure in words.
export default function PhoneStrip({ seconds, limit, split, everyone, choice, control, error, onClearError }) {
  // "Everyone's answered · Move on" says the count itself, so the strip gives it the room.
  let count = null;
  if (choice !== 'everyone') {
    count = everyone ? (
      <Typography sx={{ ...line, fontWeight: 600, color: 'var(--mst-ok-ink)' }}>
        <CheckRounded aria-hidden="true" sx={{ fontSize: 16, verticalAlign: '-3px', mr: 0.5 }} />
        {LIVE.everyoneAnswered}
      </Typography>
    ) : (
      <Typography sx={{ ...line, fontWeight: 600 }}>{LIVE.answeredOf(split.count, split.total)}</Typography>
    );
  }
  return (
    <Box
      className="mst-g2"
      data-mst="live-strip"
      sx={{ position: 'sticky', bottom: 12, zIndex: 3, display: 'grid', gap: 1, p: 1.5, borderRadius: '20px' }}
    >
      {error ? (
        <Alert severity="error" onClose={onClearError} sx={{ py: 0 }}>
          {error}
        </Alert>
      ) : null}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'auto minmax(min-content, 1fr) auto',
          alignItems: 'center',
          gap: 1.5,
          minHeight: 48,
          '& .MuiButton-root': { minHeight: 44 },
        }}
      >
        <TimerRing seconds={seconds} limit={limit} size={40} />
        <Box sx={{ minWidth: 0 }}>{count}</Box>
        {control}
      </Box>
    </Box>
  );
}

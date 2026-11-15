// Handed in · working · not started (design.md §3.10; SP1): three counters in big tabular figures, each with its dot,
// for the class pupils only, then when they were updated and the average of those who handed in.
// Area: quizzes

import { Box, Paper, Typography } from '@mui/material';
import { HOMEWORK } from './words';

const TONES = { handedIn: 'var(--mst-ok)', working: 'var(--mst-accent)', notStarted: 'var(--mst-ink-3)' };

// counts: { handedIn, working, notStarted }, null while loading; averageLine: who the average covers and what it is;
// updatedLine: when the counts were read.
export default function ProgressSummary({ counts, averageLine, updatedLine }) {
  return (
    <Paper
      className="mst-rim"
      data-mst="homework-progress"
      sx={{ p: 3, borderRadius: '20px', display: 'grid', gap: 2 }}
    >
      <Box
        component="dl"
        sx={{ m: 0, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 2 }}
        aria-live="polite"
      >
        {['handedIn', 'working', 'notStarted'].map((state) => (
          <Box key={state} sx={{ minWidth: 0 }}>
            <Box
              component="dt"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                fontSize: 14,
                lineHeight: '20px',
                color: 'var(--mst-ink-2)',
              }}
            >
              <Box
                component="span"
                aria-hidden="true"
                className="mst-dot"
                sx={{ width: 8, height: 8, color: TONES[state], flex: 'none' }}
              />
              {HOMEWORK[state]}
            </Box>
            <Box
              component="dd"
              sx={{
                m: 0,
                mt: 0.5,
                fontFamily: 'var(--font-display)',
                fontSize: 30,
                lineHeight: '36px',
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
                color: 'var(--mst-ink)',
              }}
            >
              {counts[state] ?? '—'}
            </Box>
          </Box>
        ))}
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', alignItems: 'baseline' }}>
        {averageLine ? (
          <Typography sx={{ fontSize: 14, lineHeight: '20px', color: 'var(--mst-ink-2)' }}>{averageLine}</Typography>
        ) : null}
        {updatedLine ? (
          <Typography sx={{ fontSize: 12, lineHeight: '16px', color: 'var(--mst-ink-3)' }}>{updatedLine}</Typography>
        ) : null}
      </Box>
    </Paper>
  );
}

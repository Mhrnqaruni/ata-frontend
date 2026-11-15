// The question's clock as a ring (design.md §3.7, §6): the seconds left, with "s left" under them in tabular figures,
// on a --mst-edge-control track that turns amber in the last 5 s. 96 px on the page, bigger on Present, 40–48 px bare.
// Area: quizzes

import { Box } from '@mui/material';
import { LIVE } from './words';

const WARN_AT = 5;

// seconds: whole seconds left; limit: the question's own limit, for the ring's share; size: the ring in px. Under 64 px
// (the phone strip, Phase 1.47 §3.6) the ring is 4 px and holds only the seconds, at 14 or 17 px.
export default function TimerRing({ seconds, limit, size = 96 }) {
  const small = size < 64;
  const stroke = size >= 120 ? 8 : small ? 4 : 6;
  const radius = (size - stroke) / 2;
  const share = limit > 0 ? Math.min(1, Math.max(0, seconds / limit)) : 0;
  const warn = seconds > 0 && seconds <= WARN_AT;
  const colour = warn ? 'var(--mst-warn)' : 'var(--mst-accent)';
  return (
    <Box
      role="timer"
      aria-label={LIVE.timerLabel(seconds)}
      data-warn={warn ? 'true' : undefined}
      sx={{ position: 'relative', width: size, height: size, flex: 'none' }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
        style={{ transform: 'rotate(-90deg)' }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--mst-edge-control)"
          strokeWidth={stroke}
        />
        {share > 0 ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={colour}
            strokeWidth={stroke}
            strokeLinecap="round"
            pathLength="100"
            strokeDasharray={`${share * 100} 100`}
          />
        ) : null}
      </svg>
      <Box
        aria-hidden="true"
        sx={{ position: 'absolute', inset: 0, display: 'grid', placeContent: 'center', textAlign: 'center' }}
      >
        <Box
          component="span"
          sx={{
            fontFamily: small ? 'inherit' : 'var(--font-display)',
            fontSize: size >= 120 ? 44 : small ? (size >= 48 ? 17 : 14) : 30,
            lineHeight: size >= 120 ? '48px' : small ? (size >= 48 ? '24px' : '20px') : '36px',
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
            color: warn ? 'var(--mst-warn-ink)' : 'var(--mst-ink)',
          }}
        >
          {seconds}
        </Box>
        {small ? null : (
          <Box component="span" sx={{ fontSize: 12, lineHeight: '16px', fontWeight: 500, color: 'var(--mst-ink-2)' }}>
            {LIVE.secondsLeft}
          </Box>
        )}
      </Box>
    </Box>
  );
}

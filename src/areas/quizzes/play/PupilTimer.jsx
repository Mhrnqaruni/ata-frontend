// The pupil's clock as a small ring (Phase 1.47 design.md §3.5, §6): 48 px, a 4 px stroke on a --mst-edge-control
// track, the seconds inside in tabular figures, amber in the last 5 s. The teacher's bigger ring is ../live/TimerRing.
// Area: quizzes

import { Box } from '@mui/material';

const SIZE = 48;
const STROKE = 4;
const WARN_AT = 5;

// seconds: whole seconds left; limit: the question's own limit, for the ring's share.
export default function PupilTimer({ seconds, limit }) {
  const radius = (SIZE - STROKE) / 2;
  const share = limit > 0 ? Math.min(1, Math.max(0, seconds / limit)) : 0;
  const warn = seconds > 0 && seconds <= WARN_AT;
  return (
    <Box
      role="timer"
      aria-label={`${seconds} seconds left`}
      data-warn={warn ? 'true' : undefined}
      sx={{ position: 'relative', width: SIZE, height: SIZE, flex: 'none' }}
    >
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        aria-hidden="true"
        style={{ transform: 'rotate(-90deg)' }}
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={radius}
          fill="none"
          stroke="var(--mst-edge-control)"
          strokeWidth={STROKE}
        />
        {share > 0 ? (
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={radius}
            fill="none"
            stroke={warn ? 'var(--mst-warn)' : 'var(--mst-accent)'}
            strokeWidth={STROKE}
            strokeLinecap="round"
            pathLength="100"
            strokeDasharray={`${share * 100} 100`}
          />
        ) : null}
      </svg>
      <Box
        component="span"
        aria-hidden="true"
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          fontSize: 17,
          lineHeight: '24px',
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          color: warn ? 'var(--mst-warn-ink)' : 'var(--mst-ink)',
        }}
      >
        {seconds}
      </Box>
    </Box>
  );
}

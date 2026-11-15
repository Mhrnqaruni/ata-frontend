// A quiz's state as an 8 px dot and its word, light enough for 48 px rows (design.md §2, §6), with the state's
// tooltip. Live now pulses, the area's only loop; with reduced motion the dot stays still (app.css).
// Area: quizzes

import { Box, Tooltip } from '@mui/material';
import { STATES, stateLabel } from '../words';

// Each tone's colour token. A tone means one thing everywhere, and always comes with its word.
const TONES = {
  neutral: 'var(--mst-ink-2)',
  accent: 'var(--mst-accent)',
  ok: 'var(--mst-ok)',
  muted: 'var(--mst-ink-3)',
};

// state: a library state (words.js's STATES); deadline: open homework's due date; tip: false leaves the tooltip off.
export default function StatusDot({ state, deadline, tip = true, sx }) {
  const known = STATES[state];
  if (!known) return null;
  const word = (
    <Box
      component="span"
      data-state={state}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: 12,
        lineHeight: '16px',
        fontWeight: 600,
        color: 'var(--mst-ink-2)',
        whiteSpace: 'nowrap',
        ...sx,
      }}
    >
      <Box
        component="span"
        aria-hidden="true"
        className="mst-dot"
        data-pulse={known.pulse ? 'true' : undefined}
        sx={{ width: 8, height: 8, flex: 'none', color: TONES[known.tone] }}
      />
      {stateLabel(state, { deadline })}
    </Box>
  );
  return tip ? <Tooltip title={known.tip}>{word}</Tooltip> : word;
}

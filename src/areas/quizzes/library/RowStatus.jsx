// A quiz row's status words, only where the teacher must act (Phase 1.47 R12; design.md §3.10): an 8 px dot and
// "Live now" (pulsing), "Homework · due Fri 20 Nov" or "Draft", with the state's tooltip. Other states show nothing.
// Area: quizzes

import { Box, Tooltip } from '@mui/material';
import { STATES } from '../words';

// Each state's dot colour, as the area's StatusDot gives it: running is ok, a draft neutral.
const TONES = { ok: 'var(--mst-ok)', neutral: 'var(--mst-ink-2)' };

// status: rows.js's rowStatus ({ state, text }) or null; tip: false leaves the tooltip off (a phone's second line).
export default function RowStatus({ status, tip = true }) {
  if (!status) return null;
  const known = STATES[status.state];
  const word = (
    <Box
      component="span"
      data-state={status.state}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        minWidth: 0,
        fontSize: 12,
        lineHeight: '16px',
        fontWeight: 600,
        color: 'var(--mst-ink-2)',
      }}
    >
      <Box
        component="span"
        aria-hidden="true"
        className="mst-dot"
        data-pulse={known.pulse ? 'true' : undefined}
        sx={{ width: 8, height: 8, flex: 'none', color: TONES[known.tone] ?? TONES.neutral }}
      />
      <Box component="span" sx={{ minWidth: 0 }}>
        {status.text}
      </Box>
    </Box>
  );
  return tip ? <Tooltip title={known.tip}>{word}</Tooltip> : word;
}
